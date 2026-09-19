import {
    getPool,
} from "./db.js";
import {
    get_logger,
} from "../logger.js";
import {
    importModules,
} from "../customs/custom_import.js";
import {
    parse,
    deparse,
} from "pgsql-parser";

/* ------------------------------------------------------------------ */
/* 型別輔助                                                            */
/* ------------------------------------------------------------------ */

/** pgsql-parser 產出的 AST 節點（動態、巢狀的物件結構） */
type AstNode = Record<string, unknown>;

/** parse() 回傳值中 stmts 陣列的元素 */
type RawStmt = AstNode;

/** deparse 的輸入型別（沿用套件定義） */
type DeparseInput = Parameters<typeof deparse>[0];

/* ---------- 型別守衛與取值輔助 ---------- */

function isRecord(value: unknown): value is AstNode {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

function asAstNode(value: unknown): AstNode | undefined {
    return isRecord(value) ? value : undefined;
};

function asAstArray(value: unknown): AstNode[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isRecord);
};

function asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
};

function asNumber(value: unknown): number | undefined {
    return typeof value === "number" ? value : undefined;
};

/** 取得 RangeVar.relname（AST 中的 relation 節點） */
function getRelationRelname(node: AstNode): string | undefined {
    const relation = asAstNode(node.relation);
    return relation ? asString(relation.relname) : undefined;
};

/* ------------------------------------------------------------------ */
/* deparse 工具                                                        */
/* ------------------------------------------------------------------ */

async function runDeparse(ast: AstNode): Promise<string> {
    const out: unknown = await deparse(ast as unknown as DeparseInput);
    if (typeof out === "string") return out;
    if (isRecord(out) && typeof out.query === "string") return out.query;
    return String(out ?? "");
};

/** 把單一 AST 節點序列化回 SQL（例如 CREATE INDEX） */
async function deparseStmt(node: AstNode, version: number): Promise<string> {
    return runDeparse({
        version,
        stmts: [{ stmt: node }],
    });
};

/** 把一組 tableElts 包成最小可用的 CREATE TABLE 後反序列化 */
async function renderMinimalCreateStmt(
    tableElts: AstNode[],
    version: number,
): Promise<string> {
    return deparseStmt(
        {
            CreateStmt: {
                relation: { relname: "__render__" },
                tableElts,
                inhRelations: [],
                constraints: [],
                options: [],
                oncommit: "ONCOMMIT_NOOP",
                if_not_exists: false,
            },
        },
        version,
    );
};

/* ------------------------------------------------------------------ */
/* SQL 文字處理小工具                                                  */
/* ------------------------------------------------------------------ */

/** 取得 CREATE TABLE (...) 最外層括號內的內容 */
function extractCreateTableBody(sql: string): string {
    const open = sql.indexOf("(");
    if (open < 0) return "";

    let depth = 0;
    let inSingle = false;
    let inDouble = false;

    for (let i = open; i < sql.length; i++) {
        const ch = sql[i];

        if (inSingle) {
            if (ch === "'") {
                if (sql[i + 1] === "'") { i++; continue; }
                inSingle = false;
            }
            continue;
        };

        if (inDouble) {
            if (ch === '"') {
                if (sql[i + 1] === '"') { i++; continue; }
                inDouble = false;
            }
            continue;
        };

        if (ch === "'") { inSingle = true; continue; }
        if (ch === '"') { inDouble = true; continue; }

        if (ch === "(") {
            depth++;
        } else if (ch === ")") {
            depth--;
            if (depth === 0) {
                return sql.slice(open + 1, i);
            };
        };
    };

    return "";
};

/** 依「最外層逗號」切分，忽略字串與括號內的逗號 */
function splitTopLevel(body: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < body.length; i++) {
        const ch = body[i];

        if (inSingle) {
            if (ch === "'") {
                if (body[i + 1] === "'") { i++; continue; }
                inSingle = false;
            };
            continue;
        };

        if (inDouble) {
            if (ch === '"') {
                if (body[i + 1] === '"') { i++; continue; }
                inDouble = false;
            };
            continue;
        };

        if (ch === "'") { inSingle = true; continue; }
        if (ch === '"') { inDouble = true; continue; }
        if (ch === "(") { depth++; continue; }
        if (ch === ")") { depth--; continue; }

        if (ch === "," && depth === 0) {
            parts.push(body.slice(start, i));
            start = i + 1;
        };
    };

    parts.push(body.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
};

/* ------------------------------------------------------------------ */
/* 單一元素 → SQL 片段                                                 */
/* ------------------------------------------------------------------ */

async function renderColumn(colEl: AstNode, version: number): Promise<string> {
    const sql = await renderMinimalCreateStmt([colEl], version);
    return extractCreateTableBody(sql).trim();
};

/** 用來當 ALTER TABLE ADD 時的佔位欄位，避免只有約束的 CREATE TABLE 被拒 */
const DUMMY_COLUMN: AstNode = {
    ColumnDef: {
        colname: "__dummy__",
        typeName: {
            names: [
                { String: { str: "pg_catalog" } },
                { String: { str: "int4" } },
            ],
            typemod: -1,
            location: -1,
        },
        is_local: true,
        constraints: [],
        location: -1,
    },
};

async function renderConstraint(constraintEl: AstNode, version: number): Promise<string> {
    const sql = await renderMinimalCreateStmt([DUMMY_COLUMN, constraintEl], version);
    const parts = splitTopLevel(extractCreateTableBody(sql));
    // parts[0] 是 dummy 欄位，之後才是約束本身
    return parts.slice(1).join(", ").trim();
};

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

/**
 * 檢查每個表的目前狀態並自動執行 ALTER TABLE 補齊缺少的欄位、約束與索引
 */
export async function update_tables(cache: boolean = true): Promise<void> {
    const logger = get_logger();
    const { TABLES_METADATA } = await importModules("./config.ts", cache) as typeof import("./config");

    const pool = getPool();

    logger.info("正在檢查資料庫表結構");

    for (const [table_name, meta] of Object.entries(TABLES_METADATA)) {
        if (!meta.CREATE) continue;

        // 表不存在就跳過（交給 create_tables 處理）
        const existsResult = await pool.query<{ exists: boolean }>(
            `SELECT to_regclass($1) IS NOT NULL AS exists`,
            [table_name],
        );
        if (!existsResult.rows[0]?.exists) continue;

        /* ---------- 0. 一次解析所有語句 ---------- */
        let parsed: unknown;
        try {
            parsed = await parse(meta.CREATE);
        } catch (err) {
            logger.error(
                err instanceof Error
                    ? `表 ${table_name} 的 SQL 解析失敗: ${err.message}`
                    : String(err),
            );
            continue;
        };

        if (!isRecord(parsed)) {
            logger.error(`表 ${table_name} 的 SQL 解析結果格式不正確`);
            continue;
        };

        const version: number = asNumber(parsed.version) ?? 0;
        const rawStmts: RawStmt[] = asAstArray(parsed.stmts);

        let createBody: AstNode | undefined;
        const indexBodies: AstNode[] = [];

        for (const raw of rawStmts) {
            const stmt = asAstNode(raw.stmt);
            if (!stmt) continue;

            const createBodyCandidate = asAstNode(stmt.CreateStmt);
            if (createBodyCandidate && getRelationRelname(createBodyCandidate) === table_name) {
                createBody = createBodyCandidate;
            }

            const indexBody = asAstNode(stmt.IndexStmt);
            if (indexBody && getRelationRelname(indexBody) === table_name) {
                indexBodies.push(indexBody);
            };
        };

        if (!createBody) {
            logger.warn(`找不到表 ${table_name} 的 CREATE TABLE 定義`);
            continue;
        };

        const tableElts = asAstArray(createBody.tableElts);
        const columnElts = tableElts.filter((e) => !!e.ColumnDef);
        const constraintElts = tableElts.filter((e) => !!e.Constraint);

        /* ---------- 1. 補上缺少的欄位 ---------- */
        const colResult = await pool.query<{ column_name: string }>(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
                AND table_name = $1
            `,
            [table_name],
        );
        const existingColumns = new Set<string>(
            colResult.rows.map((r) => r.column_name),
        );

        for (const colEl of columnElts) {
            const columnDef = asAstNode(colEl.ColumnDef);
            if (!columnDef) continue;
            const colName = asString(columnDef.colname);
            if (!colName) continue;
            if (existingColumns.has(colName)) continue;

            logger.info(`表 ${table_name} 補上欄位: ${colName}`);
            try {
                const colSql = await renderColumn(colEl, version);
                await pool.query(
                    `ALTER TABLE "${table_name}" ADD COLUMN ${colSql}`,
                );
            } catch (err) {
                logger.error(
                    err instanceof Error
                        ? `表 ${table_name} 新增欄位 ${colName} 失敗: ${err.message}`
                        : String(err),
                );
            };
        };

        /* ---------- 2. 補上缺少的表級約束 ---------- */
        const conResult = await pool.query<{ conname: string }>(
            `
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = $1::regclass
            `,
            [table_name],
        );
        const existingConstraints = new Set<string>(
            conResult.rows.map((r) => r.conname),
        );

        for (const conEl of constraintElts) {
            const constraint = asAstNode(conEl.Constraint);
            if (!constraint) continue;
            const name = asString(constraint.conname);
            if (!name) {
                logger.warn(
                    `表 ${table_name} 有未命名的約束無法自動同步，請補上 CONSTRAINT 名稱`,
                );
                continue;
            };
            if (existingConstraints.has(name)) continue;

            logger.info(`表 ${table_name} 補上約束: ${name}`);
            try {
                const body = await renderConstraint(conEl, version);
                await pool.query(`ALTER TABLE "${table_name}" ADD ${body}`);
            } catch (err) {
                logger.error(
                    err instanceof Error
                        ? `表 ${table_name} 新增約束 ${name} 失敗: ${err.message}`
                        : String(err),
                );
            }
        };

        /* ---------- 3. 補上缺少的索引 ---------- */
        for (const indexBody of indexBodies) {
            const indexName = asString(indexBody.idxname);
            if (!indexName) {
                logger.warn(`表 ${table_name} 有無法辨識名稱的索引`);
                continue;
            };

            const idxExists = await pool.query<Record<string, unknown>>(
                `
                SELECT 1 FROM pg_indexes
                WHERE schemaname = current_schema()
                    AND indexname = $1
                `,
                [indexName],
            );
            if (idxExists.rows.length > 0) continue;

            logger.info(`表 ${table_name} 補上索引: ${indexName}`);
            try {
                const indexSql = await deparseStmt({ IndexStmt: indexBody }, version);
                await pool.query(indexSql);
            } catch (err) {
                logger.error(
                    err instanceof Error
                        ? `表 ${table_name} 新增索引 ${indexName} 失敗: ${err.message}`
                        : String(err),
                );
            };
        };
    };

    logger.info("已檢查資料庫表結構");
};