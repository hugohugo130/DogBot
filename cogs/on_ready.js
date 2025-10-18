const { Events } = require("discord.js");
const { get_logger } = require("../utils/logger.js");
const { BotName } = require("../utils/config.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async function (client) {
        global._client = client;
        client.name = BotName || client.user.tag;
        const logger = get_logger({ client });
        logger.info(`機器人 ${client.name} 啟動成功`);
    },
}