import {
    inspect,
} from "node:util";
import {
    Events,
    ActivityType,
} from "discord.js";

import {
    get_logger,
} from "../utils/logger.js";
import {
    run_schedule,
} from "../utils/run_schedule.js";
import {
    safeshutdown,
} from "../utils/safeshutdown.js";
import {
    checkDBFilesDefault,
} from "../utils/check_db_files.js";
import {
    restoreAllMusicStates,
} from "../utils/music/persistence.js";
import DogClient from "../utils/customs/client.js";

const logger = get_logger();

/**
 * Handle shutdown event(s)
 * @param {string} sign - signal string
 * @param {DogClient} client - Discord Client
 * @returns {Promise<void>}
 */
async function handle_shutdown(sign, client) {
    logger.info(`收到 ${sign} 信號，準備安全關閉...`);

    try {
        await safeshutdown(client);
    } catch (error) {
        const errorStack = inspect(error, { depth: null });

        logger.error(`安全關閉時發生錯誤: ${errorStack}`);
        process.exit(1);
    };
};

const name = Events.ClientReady;
const once = true;

/**
 *
 * @param {DogClient} client - Discord Client
 */
const execute = async function (client) {
    global._client = client;

    await client.on_ready();

    const schedules = await run_schedule(client);
    logger.info(`已加載 ${schedules} 個排程`);

    logger.info(`機器人 ${client.name} 啟動成功`);
    logger.info(`好欸！已經有${client.guilds.cache.size}個伺服器在使用${client.name}了！`);

    process.on("SIGTERM", async () => {
        await handle_shutdown("SIGTERM", client);
    });

    process.on("SIGINT", async () => {
        await handle_shutdown("SIGINT", client);
    });

    await Promise.all([
        client.user?.setPresence({
            activities: [
                {
                    name: `啟動時間: ${new Date().toLocaleString()}`,
                    type: ActivityType.Custom,
                },
            ],
        }),
        checkDBFilesDefault(client),
    ]);

    await restoreAllMusicStates(client);
};

export { name, once, execute };
