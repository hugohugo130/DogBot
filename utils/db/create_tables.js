import {
    connectPool,
    getPool,
} from "./db.js";
import {
    get_logger,
} from "../logger.js";
import {
    importModules,
} from "../customs/custom_import.js";

export async function create_tables(cache = true) {
    const logger = get_logger();
    const { TABLES_METADATA } =
        /** @type {import("./config.js")} */
        (await importModules("./config.js", cache));

    const commands = Object.entries(TABLES_METADATA)
        .filter(([_, value]) => value.CREATE !== undefined)
        .map(([key, value]) => /** @type {[keyof typeof TABLES_METADATA, string]} */([key, (value.CREATE)]));

    logger.info("正在檢查資料庫表是否存在");
    
    const pool = getPool();
    for (const [table_name, command] of commands) {
        const client = await connectPool();
        try {
            await client.init(table_name);

            const exists = await client.is_table_exists();
            if (exists) continue;

            logger.info(`創建資料庫表: ${table_name}`);
            await pool.query(command);
        } finally {
            client.release();
        };
    };

    logger.info("已檢查資料庫表是否存在");
};
