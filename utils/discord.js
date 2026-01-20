const { Guild, GuildChannel, GuildMember } = require("discord.js");
const { wait_until_ready, wait_for_client } = require("./wait_until_ready.js")
const DogClient = require("../utils/customs/client.js");

/**
 * 
 * @param {string} guildID - Guild ID
 * @param {boolean} fetch - 是否fetch
 * @param {DogClient} client - DogClient
 * @returns {Promise<GuildMember[]>}
 */
async function get_members_of_guild(guildID, fetch = true, client = global._client) {
    client = wait_until_ready(client);

    const guild = await get_guild(guildID, client);
    if (!guild) return [];

    const guildMemberManager = fetch
        ? await guild.members.fetch()
        : guild.members.cache;

    return guildMemberManager.values();
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
    } catch {
        return null;
    };
};

/**
 * 
 * @param {Guild} guild
 * @returns {Promise<GuildMember>}
 */
async function get_me(guild) {
    return guild.members.me || await guild.members.fetchMe();
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
 * @param {boolean} fetch_first
 * @returns {Promise<GuildChannel[] | null>}
*/
async function get_channels(guild, fetch_first = false) {
    if (!guild) return null;

    let channels = fetch_first
        ? await guild.channels.fetch()
        : guild.channels.cache

    if (!channels && !fetch_first) channels = await guild.channels.fetch();

    return Array.from(channels.values());
};

/**
 * 
 * @param {Guild} guild
 * @param {string} channelId
 * @param {boolean} fetch_first
 * @returns {Promise<GuildChannel | null>}
 */
async function get_channel(channelId, guild = null, fetch_first = false) {
    try {
        if (!channelId) return null;

        if (!guild) guild = global._client ?? wait_for_client();

        let channel = fetch_first
            ? await guild.channels.fetch(channelId)
            : guild.channels.cache.get(channelId);

        if (!channel && !fetch_first) channel = await guild.channels.fetch(channelId);

        return channel;
    } catch {
        return null;
    };
};

module.exports = {
    get_members_of_guild,
    get_user_of_guild,
    get_user,
    get_me,
    get_guild,
    get_channels,
    get_channel,
};
