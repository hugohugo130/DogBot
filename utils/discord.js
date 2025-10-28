const { Client, Guild, Collection, GuildChannel } = require("discord.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready } = require("./wait_until_ready.js")

const logger = get_logger();

async function get_members_of_guild(guildID, client = global._client) {
    wait_until_ready(client);
    const guild = client.guilds.fetch(guildID);
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
 * @param {Client} client 
 * @returns {Promise<User>}
 */
async function get_user(userID, client = global._client) {
    return client.users.cache.get(userID) || await client.users.fetch(userID);
};

/**
 * 
 * @param {string} guildID 
 * @param {Client} client 
 * @returns {Promise<Guild>}
 */
async function get_guild(guildID, client = global.client) {
    return client.guilds.cache.get(guildID) || await client.guilds.fetch(guildID);
};

/**
 * 
 * @param {Guild} guild 
 * @returns {Promise<GuildChannel>>}
*/
async function get_channels(guild) {
    const channels = guild.channels.cache.get(guild.id) || await guild.channels.fetch();
    return channels.filter(channel => channel.isTextBased()).values();
};

module.exports = {
    get_members_of_guild,
    get_user_of_guild,
    get_user,
    get_guild,
    get_channels,
};