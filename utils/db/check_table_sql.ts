import {
    parse,
} from "pgsql-parser";
import {
    TABLES,
    TABLES_METADATA
} from "./config.ts";
import {
    get_logger,
} from "../logger.js";

export async function validateTableCreateSql() {
    const logger = get_logger();

    for (const table of TABLES) {
        const sql = TABLES_METADATA[table]?.CREATE;
        if (!sql) continue;

        try {
            await parse(sql);
        } catch (err) {
            const error_msg = err instanceof Error ? err.message : String(err)
            logger.warn(`{${table}} SQL 驗證失敗：\n${error_msg}`)
        };
    };
};
