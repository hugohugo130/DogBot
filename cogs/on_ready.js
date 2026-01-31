const { Events, ActivityType } = require("discord.js");
const util = require("util");

const { get_logger } = require("../utils/logger.js");
const { checkDBFilesDefault } = require("../utils/check_db_files.js");
const { run_schedule } = require("../utils/run_schedule.js");
const { safeshutdown } = require("../utils/safeshutdown.js");
const DogClient = require("../utils/customs/client.js");

const logger = get_logger();

async function handle_shutdown(sign, client) {
    logger.info(`收到 ${sign} 信號，準備安全關閉...`);

    try {
        await safeshutdown(client);
    } catch (error) {
        const errorStack = util.inspect(error, { depth: null });

        logger.error(`安全關閉時發生錯誤: ${errorStack}`);
        process.exit(1);
    };
};

module.exports = {
    name: Events.ClientReady,
    once: true,
    /**
     *
     * @param {DogClient} client - Discord Client
     */
    execute: async function (client) {
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
            client.user.setPresence({
                activities: [
                    {
                        name: `啟動時間: ${new Date().toLocaleString()}`,
                        type: ActivityType.Custom,
                    },
                ],
            }),
            checkDBFilesDefault(client),
        ]);
    },
}