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
    toSql,
} from "pgsql-ast-parser";
import type {
    Statement,
    CreateTableStatement,
    CreateColumnDef,
    TableConstraint,
} from "pgsql-ast-parser";

function isCreateTable(s: Statement): s is CreateTableStatement {
    return s.type === "create table";
};

function splitSqlStatements(sql: string): string[] {
    const result: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;
    let dollarTag: string | null = null;

    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        const next = sql[i + 1];

        if (dollarTag) {
            if (sql.startsWith(dollarTag, i)) {
                current += dollarTag;
                i += dollarTag.length - 1;
                dollarTag = null;
            } else {
                current += ch;
            };
            continue;
        };

        if (inSingle) {
            current += ch;
            if (ch === "'" && next === "'") {
                current += next;
                i++;
            } else if (ch === "'") {
                inSingle = false;
            };
            continue;
        };

        if (inDouble) {
            current += ch;
            if (ch === '"' && next === '"') {
                current += next;
                i++;
            } else if (ch === '"') {
                inDouble = false;
            };
            continue;
        };

        if (ch === "'") {
            inSingle = true;
            current += ch;
            continue;
        };
        if (ch === '"') {
            inDouble = true;
            current += ch;
            continue;
        };
        if (ch === "$") {
            const m = sql.slice(i).match(/^\$[A-Za-z_]*\$/);
            if (m) {
                dollarTag = m[0];
                current += dollarTag;
                i += dollarTag.length - 1;
                continue;
            };
        };

        if (ch === ";") {
            result.push(current);
            current = "";
            continue;
        };

        current += ch;
    };

    if (current.trim()) result.push(current);
    return result;
};

/**
 * pgsql-ast-parser 不支援 DEFERRABLE INITIALLY IMMEDIATE/DEFERRED
 * 在解析前剝離它們，並記錄哪個約束名帶有這個子句
 */
function stripDeferrable(sql: string): { cleaned: string; deferrables: Map<string, string> } {
    const deferrables: Map<string, string> = new Map();

    // 匹配 "CONSTRAINT <name> ... DEFERRABLE INITIALLY <mode>"
    // [^;]*?          -> 不跨語句
    // (?!\bCONSTRAINT\b) -> 不跨到下一條約束
    const re =
        /CONSTRAINT\s+(\w+)\s+((?:(?!\bCONSTRAINT\b|;)[^;])*?)(DEFERRABLE\s+INITIALLY\s+(IMMEDIATE|DEFERRED))/gi;

    const cleaned = sql.replace(
        re,
        (_, name, body, _suffix, mode) => {
            deferrables.set(name, `DEFERRABLE INITIALLY ${mode.toUpperCase()}`);
            return `CONSTRAINT ${name} ${body}`;
        },
    );

    return { cleaned, deferrables };
};

/**
 * 借用 toSql.statement 的序列化能力，把單一欄位定義轉成 SQL 片段
 */
function renderColumn(col: CreateColumnDef): string {
    const wrapper: CreateTableStatement = {
        type: "create table",
        name: { name: "__render__" },
        columns: [col],
    };

    const full = toSql.statement(wrapper);
    const open = full.indexOf("(");
    const close = full.lastIndexOf(")");
    return full.slice(open + 1, close).trim();
};

/**
 * 借用 toSql.statement 的序列化能力，把單一表級約束轉成 SQL 片段
 * （不含前綴 CONSTRAINT 名稱以外的裝飾，因為我們直接塞進 ALTER TABLE ADD）
 */
function renderConstraint(c: TableConstraint): string {
    const wrapper: CreateTableStatement = {
        type: "create table",
        name: { name: "__render__" },
        // 放一個 dummy 欄位，否則某些版本的空 columns 會拋錯
        columns: [
            { kind: "column", name: { name: "__dummy__" }, dataType: { name: "int" } },
        ],
        constraints: [c],
    };
    const full = toSql.statement(wrapper);

    // 取出最後一個頂層逗號之後的內容（dummy 欄位後面就是約束）
    // 用括號深度掃描，避免切到 CHECK (...) 裡的逗號
    const open = full.indexOf("(");
    const close = full.lastIndexOf(")");
    const inner = full.slice(open + 1, close);

    let depth = 0;
    let lastComma = -1;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (ch === "," && depth === 0) lastComma = i;
    };

    return inner.slice(lastComma + 1).trim();
};

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
        const existsResult = await pool.query(
            `SELECT to_regclass($1) IS NOT NULL AS exists`,
            [table_name],
        );
        if (!existsResult.rows[0]?.exists) continue;

        const rawStatements = splitSqlStatements(meta.CREATE);

        let createStmt: CreateTableStatement | undefined;
        let deferrables = new Map<string, string>();
        const indexSqls: string[] = [];

        for (const raw of rawStatements) {
            const trimmed = raw.trim();
            if (!trimmed) continue;

            if (/^CREATE\s+TABLE\b/i.test(trimmed)) {
                const { cleaned, deferrables: d } = stripDeferrable(trimmed);
                try {
                    const stmts = parse(cleaned);
                    const stmt = stmts.find(
                        (s): s is CreateTableStatement =>
                            isCreateTable(s) && s.name.name === table_name
                    );
                    if (stmt) {
                        createStmt = stmt;
                        deferrables = d;
                    };
                } catch (err) {
                    logger.error(
                        err instanceof Error
                            ? `表 ${table_name} 的 CREATE TABLE 解析失敗: ${err.message}`
                            : String(err)
                    );
                };
            } else if (/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(trimmed)) {
                indexSqls.push(trimmed);
            };
        };

        if (!createStmt) {
            logger.warn(`找不到表 ${table_name} 的 CREATE TABLE 定義`);
            continue;
        };

        /* ---------- 1. 補上缺少的欄位 ---------- */
        const colResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
                AND table_name = $1
            `,
            [table_name],
        );
        const existingColumns = new Set(colResult.rows.map((r) => r.column_name));

        for (const col of createStmt.columns) {
            // 跳過 LIKE 等其他類型的 column entry
            if (col.kind !== "column") continue;
            const colName = col.name.name;
            if (existingColumns.has(colName)) continue;

            logger.info(`表 ${table_name} 補上欄位: ${colName}`);
            try {
                await pool.query(
                    `ALTER TABLE "${table_name}" ADD COLUMN ${renderColumn(col)}`
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
        const conResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = $1::regclass`,
            [table_name],
        );
        const existingConstraints = new Set(conResult.rows.map((r) => r.conname));

        const tableConstraints = createStmt.constraints ?? [];
        for (const constraint of tableConstraints) {
            const name = constraint.constraintName?.name;
            if (!name) {
                logger.warn(
                    `表 ${table_name} 有未命名的約束無法自動同步，請補上 CONSTRAINT 名稱`
                );
                continue;
            };
            if (existingConstraints.has(name)) continue;

            logger.info(`表 ${table_name} 補上約束: ${name}`);

            // 如果這個約束原本帶 deferrable，接回去
            const deferrableSuffix = deferrables.get(name) ?? "";
            const sqlBody = `${renderConstraint(constraint)} ${deferrableSuffix}`.trim();

            try {
                await pool.query(
                    `ALTER TABLE "${table_name}" ADD ${sqlBody}`
                );
            } catch (err) {
                logger.error(
                    err instanceof Error
                        ? `表 ${table_name} 新增約束 ${name} 失敗: ${err.message}`
                        : String(err),
                );
            };
        };

        /* ---------- 3. 補上缺少的索引 ---------- */
        for (const indexSql of indexSqls) {
            const m = indexSql.match(
                /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w]+"?)\s+ON\b/i
            );
            const indexName = m?.[1]?.replace(/"/g, "");
            if (!indexName) {
                logger.warn(`表 ${table_name} 有無法辨識名稱的索引: ${indexSql.slice(0, 80)}...`);
                continue;
            };

            const idxExists = await pool.query(`
                SELECT 1 FROM pg_indexes
                WHERE schemaname = current_schema()
                    AND indexname = $1
            `,
                [indexName],
            );
            if (idxExists.rows.length > 0) continue;

            logger.info(`表 ${table_name} 補上索引: ${indexName}`);
            try {
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