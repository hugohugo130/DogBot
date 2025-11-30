const { Events, ActivityType } = require("discord.js");
const { get_logger } = require("../utils/logger.js");
const { checkDBFilesDefault } = require("../utils/check_db_files.js");
const { run_schedule } = require("../utils/run_schedule.js");
const { BotName } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    /**
     * 
     * @param {DogClient} client 
     */
    execute: async function (client) {
        global._client = client;
        client.name = BotName || client.user.tag;

        const logger = get_logger();

        const schedules = await run_schedule(client);
        logger.info(`已加載 ${schedules} 個排程`);
        
        logger.info(`機器人 ${client.name} 啟動成功`);
        logger.info(`好欸！已經有${client.guilds.cache.size}個伺服器在使用${client.name}了！`);
        client.user.setPresence({
            activities: [
                {
                    name: `啟動時間: ${new Date().toLocaleString()}`,
                    type: ActivityType.Custom,
                },
            ],
        });
        await checkDBFilesDefault(client);
    },
}