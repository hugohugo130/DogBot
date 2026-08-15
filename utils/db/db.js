import { Pool, Client as PGClient } from "pg";
import { importModules } from "../customs/custom_import.js";

/**
 * @typedef {Object} ClientInitOptions
 * @property {keyof typeof import("./config.js").TABLES_METADATA} table_name
 * @property {boolean} [cache=false]
 */

export class PoolClient extends PGClient {
    #began;

    /**
     * @param {string | import("pg").ClientConfig} [config]
     */
    constructor(config) {
        super(config);

        /** @type {string | null} */
        this.table_name = null;

        /** @type {boolean} */
        this.#began = false;
    };

    /**
     * @returns {asserts this is { table_name: string }}
     */
    #check_table_name() {
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

    /**
     * @param {boolean} [force=false]
     * @returns {Promise<void>}
     */
    async begin(force = false) {
        if (!force && this.#began) return;

        await this.query("BEGIN");
        this.#began = true;
    };

    async commit() {
        await this.query("COMMIT");
        this.#began = false;
    };

    async rollback() {
        await this.query("ROLLBACK");
        this.#began = false;
    };

    /**
     * @param {string | null} [table_name] - The table name to check, defaults to the name while initalizing
     * @returns {Promise<boolean>} Whether the table exists
     */
    async is_table_exists(table_name = null) {
        if (!table_name) {
            this.#check_table_name();
            table_name = this.table_name;
        } else {
            const { TABLES_METADATA } =
                /** @type {import('./config.js')} */
                (await importModules("./config.js", true));

            if (!(table_name in TABLES_METADATA)) {
                throw new Error("Table name must in the TABLES_METADATA");
            };
        };


        /*
        {
            command: 'SELECT',
            rowCount: 1,
            oid: null,
            rows: [ { table_exists: true } ], // <--- The result is here
            fields: [ { name: 'table_exists', dataTypeID: 16 } ] // 16 is the OID for boolean
        }
        */
        await this.begin();
        const command = `SELECT to_regclass('${table_name}') IS NOT NULL AS table_exists`;
        const result = await this.query(command);

        return !!result.rows[0]?.["table_exists"];
    };

    /**
     * @param {string[] | string} columns
     * @returns {Promise<any>}
     */
    async get(columns = "*") {
        this.#check_table_name();

        if (!Array.isArray(columns)) {
            columns = [columns];
        };

        const command = `SELECT ${columns.join(", ")} FROM ${this.table_name}`;

        await this.begin();
        const result = await this.query(command);

        return result.rows;
    };

    /**
     * @param {Error | boolean} [err]
     */
    release(err) {
        // Pool 會自動注入代碼
    };
};

const _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
