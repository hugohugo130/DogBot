const { wait_until_ready, wait_for_client } = require("./wait_until_ready.js");
const { get_user, get_channels, get_guild } = require("./discord.js");
const { get_logger } = require("./logger.js");
const DogClient = require("../utils/customs/client.js");
const { Message } = require("discord.js");

const logger = get_logger();

module.exports = {
    /**
     * 
     * @param {string} userID
     * @param {string} guild_id
     * @param {number | null} [limit=100]
     * @param {string | null} [channel_id=null]
     * @param {DogClient | null} [client=null]
     * @returns {Promise<void>}
    */
    async del_msg(userID, guild_id, limit = 100, channel_id = null, client = null) {
        if (!client) client = await wait_for_client();
        const user = await get_user(userID, client);

        if (!user) return;
        if (!guild_id) return;

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
            logger.debug(`[${channels.indexOf(channel) + 1}/${channels.length}] fetching messages of channel ${"name" in channel ? channel.name : "unknown"}`);

            const options = limit ? { limit: limit } : undefined;
            if (!("messages" in channel)) return;

            const messages = await channel.messages.fetch(options);

            // @ts-ignore
            const userMessages = messages.filter(
                /** @param {import('discord.js').Message} msg */
                (msg) => msg.author?.id === userID,
            );

            if (userMessages.size === 0) continue;
            if (!("bulkDelete" in channel)) return;

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