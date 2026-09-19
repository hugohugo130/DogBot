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


async function handle_shutdown(sign: string, client: DogClient): Promise<void> {
    logger.info(`收到 ${sign} 信號，準備安全關閉...`);

    try {
        await safeshutdown(client);
    } catch (error) {
        const errorStack = inspect(error, { depth: null });

        logger.error(`安全關閉時發生錯誤: ${errorStack}`);
        process.exit(1);
    };
};

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: DogClient) {
    global._client = client;

    await client.on_ready();
    logger.info(`✅ Loaded ${client.commands.size} slash commands`);
    logger.info(`✅ Loaded ${client.context_menus.size} context menus`);

    const schedules = await run_schedule(client);
    logger.info(`✅ Loaded ${schedules} schedules`);

    logger.info(`Bot ${client.name} started`);
    logger.info(`Yeee! There are ${client.guilds.cache.size} servers using ${client.name}!`);

    for (const signal of ["SIGTERM", "SIGINT"] as const) {
        process.on(signal, async () => {
            await handle_shutdown(signal, client);
        });
    };

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
