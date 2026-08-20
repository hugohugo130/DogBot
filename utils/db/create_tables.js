import { connectPool } from "./db.js";
import { get_logger } from "../logger.js";
import { importModules } from "../customs/custom_import.js";

export async function create_tables(cache = true) {
    const logger = get_logger();
    const { TABLES_METADATA } =
        /** @type {import("./config.js")} */
        (await importModules("./config.js", cache));

    const commands = Object.entries(TABLES_METADATA)
        .filter(([_, value]) => value.CREATE !== undefined)
        .map(([key, value]) => /** @type {[keyof typeof TABLES_METADATA, string]} */([key, (value.CREATE)]));

    logger.info("正在檢查資料庫表是否存在");

    for (const [table_name, command] of commands) {
        const client = await connectPool();
        try {
            await client.init(table_name);

            const exists = await client.is_table_exists();
            if (exists) continue;

            // 上面檢查的時候已經有begin過了
            // await client.begin();

            logger.info(`創建資料庫表: ${table_name}`);
            await client.query(command);
        } catch (err) {
            await client.rollback();
            throw err;
        } finally {
            client.release();
        };
    };

    logger.info("已檢查資料庫表是否存在");
};
