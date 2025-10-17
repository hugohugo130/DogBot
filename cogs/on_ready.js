const { Events } = require("discord.js");
const { get_logger } = require("../utils/logger.js");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async function (client) {
        global._client = client;
        const bot = client.user;
        const logger = get_logger(null, client);
        logger.log(`機器人 ${bot.globalName || bot.username} 啟動成功`);
    },
}