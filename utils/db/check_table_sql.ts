import { parse } from "pgsql-ast-parser";
import { TABLES, TABLES_METADATA } from "./config.ts";

export interface TableSqlValidation {
    table: string;
    ok: boolean;
    error?: string;
};

export function validateTableCreateSql(): TableSqlValidation[] {
    const results: TableSqlValidation[] = [];

    for (const table of TABLES) {
        const sql = TABLES_METADATA[table]?.CREATE;
        if (!sql) continue;

        try {
            const ast = parse(sql);
            if (!Array.isArray(ast) || ast.length === 0) {
                throw new Error("Parser returned empty AST");
            };
            results.push({ table, ok: true });
        } catch (err) {
            results.push({
                table,
                ok: false,
                error: err instanceof Error ? err.message : String(err),
            });
        };
    };

    return results;
};
