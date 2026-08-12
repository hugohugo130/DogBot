import { Pool, Client as PGClient } from "pg";
import { importModules } from "../customs/custom_import.js";

export class PoolClient extends PGClient {
    /**
     * @param {string | import("pg").ClientConfig} [config]
     */
    constructor(config) {
        super(config);

        /** @type {string | null} */
        this.table_name = null;
        this._began = false;
    };

    /**
     * @returns {asserts this is { table_name: string }}
     */
    _check_table_name() {
        if (!this.table_name) {
            throw new Error("Table name has not been set");
        };
    };

    /**
     * @param {keyof typeof import("./config.js").TABLES_METADATA} table_name
     * @param {boolean} [cache=false]
     * @returns {Promise<void>}
     */
    async init(table_name, cache = false) {
        const { TABLES_METADATA } =
            /** @type {import('./config.js')} */
            (await importModules("./config.js", cache));

        if (!(table_name in TABLES_METADATA)) {
            throw new Error("Table name must in the TABLES_METADATA");
        };

        this.table_name = table_name;
    };

    async begin() {
        await this.query("BEGIN");
        this._began = true;
    };

    async commit() {
        await this.query("COMMIT");
        this._began = false;
    };

    async rollback() {
        await this.query("ROLLBACK");
        this._began = false;
    };

    /**
     * @param {string[] | string} columns
     * @returns {Promise<any>}
     */
    async get(columns = "*") {
        this._check_table_name();

        if (!Array.isArray(columns)) {
            columns = [columns];
        };

        const command = `SELECT ${columns.join(", ")} FROM ${this.table_name}`;

        if (!this._began) this.begin();
        return await this.query(command);
    };

    /**
     * @param {Error | boolean} [err]
     */
    release(err) {
        // Pool 會自動注入代碼
    }
};

const _pool = new Pool({
    Client: PoolClient,
}); // .env需填寫 DATABASE_URL

export { _pool as pool };

/**
 * @param {Pool} [pool]
 * @returns {Promise<PoolClient>}
 */
export async function connectPool(pool = _pool) {
    // @ts-expect-error - Pool 已經設定 Client 為 PoolClient
    return await pool.connect();
};
