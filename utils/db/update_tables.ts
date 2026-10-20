import {
    getPool,
    connectPool,
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
/* 約束比對：用暫存 schema 讓 PG 自己產生「期望的定義」                */
/* ------------------------------------------------------------------ */

/**
 * 為什麼要另開 schema？
 *
 *   `pg_get_constraintdef()` 回傳的是 PostgreSQL **正規化後**的定義
 *   （BETWEEN 會展開成 >= AND <=、字串會補 cast、括號層數也不同…），
 *   跟自己 deparse 的 AST 文字永遠長不一樣。
 *
 * 做法：
 *   1. 在 `__expected_check` 裡，用 TABLES_METADATA 的列定義建出同名表（只有欄位）
 *   2. 把 AST 裡的表級約束 `ALTER TABLE __expected_check.xxx ADD ...` 加上去
 *   3. `pg_get_constraintdef()` 讀回 PG 正規化後的定義字串
 *   4. 跟正式表的 `pg_get_constraintdef()` 直接字串比對
 *
 *   因為兩邊都經過 PG 解析器，輸出格式一定一致（FK 的 REFERENCES 前綴問題見下方註解）。
 */
const CHECK_SCHEMA = "__expected_check";

type ExpectedConstraint = {
    /** PG 正規化後的定義，用於跟正式表比對 */
    def: string;
    /** 可直接 `ALTER TABLE ... ADD <body>` 的 SQL（已含 CONSTRAINT 名稱） */
    body: string;
};

async function buildCheckSchema(
    client: import("pg").PoolClient,
    tablesMeta: Record<string, { CREATE?: string; }>,
): Promise<void> {
    await client.query(`DROP SCHEMA IF EXISTS ${CHECK_SCHEMA} CASCADE`);
    await client.query(`CREATE SCHEMA ${CHECK_SCHEMA}`);

    for (const [tableName, meta] of Object.entries(tablesMeta)) {
        if (!meta.CREATE) continue;

        const parsed = await parse(meta.CREATE);
        if (!isRecord(parsed)) continue;
        const version = asNumber(parsed.version) ?? 0;

        let createBody: AstNode | undefined;
        for (const raw of asAstArray(parsed.stmts)) {
            const stmt = asAstNode(raw.stmt);
            const candidate = asAstNode(stmt?.CreateStmt);
            if (candidate && getRelationRelname(candidate) === tableName) {
                createBody = candidate;
            };
        };

        if (!createBody) continue;

        const tableElts = asAstArray(createBody.tableElts);
        const columnElts = tableElts.filter((e) => !!e.ColumnDef);

        // 只挑 PK / UNIQUE：
        //   - FK 需要被參照表上有 unique/PK 才能建立（這就是本次錯誤的來源）
        //   - CHECK 不影響參照解析，不需要在這裡建立
        //   - FK 留到 getExpectedConstraints 再補，因為它依賴其他表已存在
        const pkUniqueElts = tableElts.filter((e) => {
            const c = asAstNode(e.Constraint);
            if (!c) return false;
            const contype = asString(c.contype);
            return contype === "CONSTR_PRIMARY" || contype === "CONSTR_UNIQUE";
        });

        const eltSqls: string[] = await Promise.all(
            columnElts.map((colEl) => renderColumn(colEl, version)),
        );

        for (const conEl of pkUniqueElts) {
            eltSqls.push(await renderConstraint(conEl, version));
        };

        await client.query(
            `CREATE TABLE ${CHECK_SCHEMA}."${tableName}" (${eltSqls.join(", ")})`,
        );
    };
};

/**
 * 把這張表的表級約束加到 `__expected_check.<tableName>`，讀回 PG 正規化後的定義。
 *
 * 內部用 BEGIN + `SET LOCAL search_path` 隔離：
 *   - `search_path = __expected_check, public` 讓 FK 的 `REFERENCES rpg_users`
 *     解析到 `__expected_check.rpg_users`，且輸出時**不帶 schema 前綴**
 *     （跟正式表一樣）→ 兩邊定義字串可以直接比對。
 *   - `SET LOCAL` 只在本次 transaction 有效，不會污染 `pool.query()` 借到的其他連線。
 */
async function getExpectedConstraints(
    client: import("pg").PoolClient,
    tableName: string,
    constraintElts: AstNode[],
    version: number,
): Promise<Map<string, ExpectedConstraint>> {
    const bodies = new Map<string, string>();
    for (const conEl of constraintElts) {
        const constraint = asAstNode(conEl.Constraint);
        const name = asString(constraint?.conname);
        if (!name) continue; // 無名約束跳過（由呼叫端 warn）
        bodies.set(name, await renderConstraint(conEl, version));
    };

    const result = new Map<string, ExpectedConstraint>();
    if (bodies.size === 0) return result;

    await client.query("BEGIN");
    try {
        await client.query(`SET LOCAL search_path TO ${CHECK_SCHEMA}, public`);

        // buildCheckSchema 已經先建好 PK / UNIQUE（為了讓 FK 能解析），
        // 這裡只 ADD 還沒存在的約束，避免重複 ADD 造成 duplicate constraint。
        const existing = await client.query<{ conname: string; }>(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = $1::regclass
        `, [tableName]);
        const existingNames = new Set(existing.rows.map((r) => r.conname));

        for (const [name, body] of bodies) {
            if (existingNames.has(name)) continue;
            await client.query(`ALTER TABLE "${tableName}" ADD ${body}`);
        };

        const { rows } = await client.query<{ conname: string; def: string; }>(`
            SELECT conname, pg_get_constraintdef(oid) AS def
            FROM pg_constraint
            WHERE conrelid = $1::regclass
        `, [tableName],
        );

        for (const r of rows) {
            const body = bodies.get(r.conname);
            if (body) result.set(r.conname, { def: r.def, body });
        };
    } finally {
        try { await client.query("ROLLBACK"); } catch { /* ignore */ };
    };

    return result;
};

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

/**
 * 檢查每個表的目前狀態並自動執行 ALTER TABLE：
 *   - 補上缺少的欄位
 *   - 補上 / 更新定義有變的約束（CHECK / UNIQUE / PK / FK）
 *   - 補上缺少的索引
 */
export async function update_tables(cache: boolean = true): Promise<void> {
    const logger = get_logger();
    const { TABLES_METADATA } = await importModules("./config.ts", cache) as typeof import("./config");

    const pool = getPool();
    const client = await connectPool();

    let checkSchemaReady = false;

    logger.info("正在檢查資料庫表結構");

    try {
        for (const [table_name, meta] of Object.entries(TABLES_METADATA)) {
            if (!meta.CREATE) continue;

            // 表不存在就跳過（交給 create_tables 處理）
            const existsResult = await pool.query<{ exists: boolean; }>(
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
                };

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
            const colResult = await pool.query<{ column_name: string; }>(
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

            /* ---------- 2. 補上／更新約束 ---------- */
            // 首次進入約束處理時才建置 __expected_check（避免沒約束時白花時間）
            if (!checkSchemaReady && constraintElts.length > 0) {
                await buildCheckSchema(client, TABLES_METADATA);
                checkSchemaReady = true;
            };

            // 2a. 先唸一下 AST 裡哪些約束沒有名字（PG 無法自動對應）
            for (const conEl of constraintElts) {
                const constraint = asAstNode(conEl.Constraint);
                if (constraint && !asString(constraint.conname)) {
                    logger.warn(
                        `表 ${table_name} 有未命名的約束無法自動同步，請補上 CONSTRAINT 名稱`,
                    );
                };
            };

            if (checkSchemaReady) {
                // 2b. 現況（正式表）
                const conResult = await client.query<{ conname: string; def: string; }>(
                    `
                    SELECT conname, pg_get_constraintdef(oid) AS def
                    FROM pg_constraint
                    WHERE conrelid = $1::regclass
                    `,
                    [table_name],
                );
                const existingMap = new Map<string, string>(
                    conResult.rows.map((r) => [r.conname, r.def]),
                );

                // 2c. 期望（__expected_check 上的正規化定義）
                const expected = await getExpectedConstraints(
                    client, table_name, constraintElts, version,
                );

                // 2d. 逐一比對，不一致就 DROP + ADD
                for (const [name, { def: expectedDef, body }] of expected) {
                    const actualDef = existingMap.get(name);

                    if (actualDef === expectedDef) continue; // 完全沒變

                    const isUpdate = actualDef !== undefined;
                    logger.info(
                        isUpdate
                            ? `表 ${table_name} 更新約束: ${name}`
                            : `表 ${table_name} 補上約束: ${name}`,
                    );

                    // DROP + ADD 必須同一個 transaction，避免「約束消失」的半殘狀態
                    await client.query("BEGIN");
                    try {
                        if (isUpdate) {
                            await client.query(
                                `ALTER TABLE "${table_name}" DROP CONSTRAINT "${name}"`,
                            );
                        };
                        await client.query(
                            `ALTER TABLE "${table_name}" ADD ${body}`,
                        );
                        await client.query("COMMIT");
                    } catch (err) {
                        await client.query("ROLLBACK");
                        logger.error(
                            err instanceof Error
                                ? `表 ${table_name} 同步約束 ${name} 失敗: ${err.message}`
                                : String(err),
                        );
                    };
                };
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
    } finally {
        if (checkSchemaReady) {
            try {
                await client.query(`DROP SCHEMA IF EXISTS ${CHECK_SCHEMA} CASCADE`);
            } catch { /* ignore */ }
        }
        client.release();
    };

    logger.info("已檢查資料庫表結構");
};
