const { Client } = require("discord.js");

module.exports = {
    /**
     * 
     * @param {string} userID 
     * @param {string} guild_id 
     * @param {number | null} limit 
     * @param {string | null} channel_id 
     * @param {Client} client 
     * @returns {Promise<void>}
    */
    async del_msg(userID, guild_id, limit = 100, channel_id = null, client = null) {
        const { wait_until_ready } = require("./wait_until_ready.js");
        const { get_user, get_channels, get_guild } = require("./discord.js");
        const { get_logger } = require("./logger.js");
        const logger = get_logger();

        if (!client) client = wait_until_ready(client);
        const user = await get_user(userID, client);

        if (!user) return logger.debug(`User ${userID} not found`);
        if (!guild_id) return logger.debug(`Guild ID not provided`);

        const channels = [];
        if (channel_id) {
            const channel = client.channels.cache.get(channel_id) || await client.channels.fetch(channel_id);
            if (!channel) return;
            channels.push(channel);
        } else {
            const Guild = await get_guild(guild_id, client);
            const guild_channels = await get_channels(Guild);
            channels.push(...guild_channels);
        };

        logger.debug(`channels got: ${channels.length}`);

        for (const channel of channels) {
            logger.debug(`[${channels.indexOf(channel) + 1}/${channels.length}]fetching messages of channel ${channel.name}`);
            const options = limit && limit > 0 ? { limit: limit } : {};
            const messages = await channel.messages.fetch(options);
            const userMessages = messages.filter(msg => msg.author.id === userID);
            if (userMessages.size === 0) continue;
            try {
                const deletedMessages = await channel.bulkDelete(userMessages, true)
                logger.info(`[USER ${user.globalName || user.username}] channel: ${channel.name}; deleted messages: ${deletedMessages.size}`);
            } catch (err) {
                logger.error(err);
            };
        };

        logger.info(`完成刪除用戶信息：${user.globalName || user.username}`);
    },
};