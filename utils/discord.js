const { Guild, GuildChannel } = require("discord.js");
const { wait_until_ready } = require("./wait_until_ready.js")
const DogClient = require("../utils/customs/client.js");

async function get_members_of_guild(guildID, client = global._client) {
    const { get_logger } = require("./logger.js");
    const logger = get_logger();

    wait_until_ready(client);
    const guild = await get_guild(guildID, client);
    if (!guild) {
        logger.warn(`找不到Guild (ID: ${guildID})，返回members []`);
        return [];
    };

    return await guild.members.fetch();
};

async function get_user_of_guild(guildID, client = global._client) {
    const members = await get_members_of_guild(guildID, client);
    return members.map(m => m.user);
};

/**
 * 
 * @param {string} userID 
 * @param {DogClient} client 
 * @returns {Promise<User | null>}
 */
async function get_user(userID, client = global._client) {
    try {
        return client.users.cache.get(userID) || await client.users.fetch(userID);
    } catch (_) {
        return null;
    };
};

/**
 * 
 * @param {string} guildID
 * @param {DogClient} client
 * @returns {Promise<Guild>}
 */
async function get_guild(guildID, client = global.client) {
    return client.guilds.cache.get(guildID) || await client.guilds.fetch(guildID);
};

/**
 * 
 * @param {Guild} guild
 * @returns {Promise<GuildChannel>}
*/
async function get_channels(guild) {
    const channels = guild.channels.cache.get(guild.id) || await guild.channels.fetch();
    return channels.filter(channel => channel.isTextBased()).values();
};

/**
 * 
 * @param {Guild} guild
 * @param {string} channelId
 * @returns {Promise<boolean>}
 */
async function channelExists(guild, channelId) {
    try {
        await guild.channels.fetch(channelId);

        return true;
    } catch (_) {
        return false;
    };
};

module.exports = {
    get_members_of_guild,
    get_user_of_guild,
    get_user,
    get_guild,
    get_channels,
    channelExists,
};
