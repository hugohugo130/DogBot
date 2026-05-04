const Discord = require("discord.js");
const { Guild, GuildMember, User } = require("discord.js");

const { wait_for_client } = require("./wait_for_client.js")
const DogClient = require("../utils/customs/client.js");

/**
 * Get all members in a guild by its ID
 * @param {string} guildID - Guild ID
 * @param {boolean} [fetch=true] - 是否fetch
 * @param {DogClient | null} [client] - DogClient
 * @returns {Promise<GuildMember[]>}
 */
async function get_members_of_guild(guildID, fetch = true, client = global._client) {
    if (!client) client = await wait_for_client();

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
 * Get user by its ID
 * @param {string} userID
 * @param {DogClient | null} [client]
 * @returns {Promise<User | null>}
 */
async function get_user(userID, client = global._client) {
    try {
        if (!client) client = await wait_for_client();

        if (!userID) return null;

        return (
            client.users.cache.get(userID)
            || await client.users.fetch(userID)
        );
    } catch {
        return null;
    };
};

/**
 * get the bot member of a guild
 * @param {Guild} guild
 * @returns {Promise<GuildMember>}
 */
async function get_me(guild) {
    return (
        guild.members.me
        || await guild.members.fetchMe()
    );
};

/**
 * Get a Guild object by its ID
 * @param {string} guildID
 * @param {DogClient | null} [client]
 * @returns {Promise<Guild | null>}
 */
async function get_guild(guildID, client = global._client) {
    if (!client) client = await wait_for_client();

    try {
        return (
            client.guilds.cache.get(guildID)
            || await client.guilds.fetch(guildID)
        );
    } catch {
        return null;
    };
};

/**
 * Get all channels in a guild
 * @param {Guild} guild
 * @param {boolean} fetch_first
 * @returns {Promise<Discord.Channel[]>}
*/
async function get_channels(guild, fetch_first = false) {
    if (!guild) return [];

    let channels = fetch_first
        ? await guild.channels.fetch()
        : guild.channels.cache

    if (!channels && !fetch_first) channels = await guild.channels.fetch();

    return Array
        .from(channels.values())
        .filter(e => e !== null);
};

/**
 * Get a channel by its ID
 * @param {any} channelId
 * @param {Guild | null} [guild=null]
 * @param {boolean} [fetch_first=false]
 * @returns {Promise<Discord.Channel | Discord.VoiceBasedChannel |null | undefined>}
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

        return channel;
    } catch {
        return null;
    };
};

/**
 *
 * @param {Discord.VoiceChannel} voiceChannel
 * @param {Guild} guild
 * @returns {import("@discordjs/voice").CreateVoiceConnectionOptions & import("@discordjs/voice").JoinVoiceChannelOptions & Omit<import("@discordjs/voice").JoinConfig, "group">}
 */
const VCJoinConfig = (voiceChannel, guild) => {
    return {
        "channelId": voiceChannel.id,
        "guildId": guild.id,
        "selfDeaf": true,
        "selfMute": false,
        "adapterCreator": guild.voiceAdapterCreator,
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

    VCJoinConfig,
};
