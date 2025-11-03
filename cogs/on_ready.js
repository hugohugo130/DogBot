const { Events } = require("discord.js");
const { get_logger } = require("../utils/logger.js");
const { checkDBFilesDefault } = require("../utils/check_db_files.js");
const { run_schedule } = require("../utils/run_schedule.js");
const { BotName, authorName } = require("../utils/config.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async function (client) {
        global._client = client;
        client.name = BotName || client.user.tag;
        client.author = authorName || "哈狗";
        const logger = get_logger();

        await checkDBFilesDefault(client);
        const schedules = await run_schedule(client);
        logger.info(`已加載 ${schedules} 個排程`);

        logger.info(`機器人 ${client.name} 啟動成功`);
    },
}