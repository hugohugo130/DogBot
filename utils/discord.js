const { Guild, GuildMember, DMChannel, User } = require("discord.js");
const { wait_until_ready, wait_for_client } = require("./wait_until_ready.js")
const DogClient = require("../utils/customs/client.js");

/**
 * 
 * @param {string} guildID - Guild ID
 * @param {boolean} [fetch=true] - 是否fetch
 * @param {DogClient | null} [client] - DogClient
 * @returns {Promise<GuildMember[]>}
 */
async function get_members_of_guild(guildID, fetch = true, client = global._client) {
    if (!client) client = await wait_until_ready(client);

    const guild = await get_guild(guildID, client);
    if (!guild) return [];

    const guildMemberManager = fetch
        ? await guild.members.fetch()
        : guild.members.cache;

    return Array.from(guildMemberManager.values());
};

/**
 * Get all users of a guild
 * @param {string} guildID
 * @param {DogClient | null} [client]
 * @returns {Promise<User[]>}
 */
async function get_users_of_guild(guildID, client = global._client) {
    if (!client) client = await wait_for_client();

    const members = await get_members_of_guild(guildID, true, client);

    return members.map(m => m.user);
};

/**
 * 
 * @param {string} userID
 * @param {DogClient | null} [client]
 * @returns {Promise<User | null>}
 */
async function get_user(userID, client = global._client) {
    try {
        if (!client) client = await wait_for_client();

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
 * @param {DogClient | null} [client]
 * @returns {Promise<Guild>}
 */
async function get_guild(guildID, client = global._client) {
    if (!client) client = await wait_for_client();

    return client.guilds.cache.get(guildID) || await client.guilds.fetch(guildID);
};

/**
 * 
 * @param {Guild} guild
 * @param {boolean} fetch_first
 * @returns {Promise<import("discord.js").Channel[]>}
*/
async function get_channels(guild, fetch_first = false) {
    if (!guild) return [];

    let channels = fetch_first
        ? await guild.channels.fetch()
        : guild.channels.cache

    if (!channels && !fetch_first) channels = await guild.channels.fetch();

    // @ts-ignore
    return Array
        .from(channels.values())
        .filter(e => e !== null);
};

/**
 * 
 * @param {string} channelId
 * @param {Guild | null} [guild=null]
 * @param {boolean} [fetch_first=false]
 * @returns {Promise<import("discord.js").Channel | import("discord.js").VoiceBasedChannel |null | undefined>}
 */
async function get_channel(channelId, guild = null, fetch_first = false) {
    try {
        if (!channelId) return null;

        /** @type {Guild | DogClient} */
        const guild_or_client = guild ?? global._client ?? await wait_for_client();

        let channel = fetch_first
            ? await guild_or_client.channels.fetch(channelId)
            : guild_or_client.channels.cache.get(channelId);

        if (!channel && !fetch_first) channel = await guild_or_client.channels.fetch(channelId);

        // @ts-ignore
        return channel;
    } catch {
        return null;
    };
};

module.exports = {
    get_members_of_guild,
    get_users_of_guild,
    get_user,
    get_me,
    get_guild,
    get_channels,
    get_channel,
};
