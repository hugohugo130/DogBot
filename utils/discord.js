import {
    Message,
    Guild,
    GuildMember,
    User,
} from "discord.js";

import {
    wait_for_client,
} from "./wait_for_client.js";

/**
 * Get all members in a guild by its ID
 * @param {string} guildID - Guild ID
 * @param {boolean} [fetch=true] - 是否fetch
 * @param {import("../utils/customs/client.js").DogClient | null} [client] - import("../utils/customs/client.js").DogClient
 * @returns {Promise<GuildMember[]>}
 */
export async function get_members_of_guild(guildID, fetch = true, client = global._client) {
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
 * @param {import("../utils/customs/client.js").DogClient | null} [client]
 * @returns {Promise<User[]>}
 */
export async function get_users_of_guild(guildID, client = global._client) {
    if (!client) client = await wait_for_client();

    const members = await get_members_of_guild(guildID, true, client);

    return members.map(m => m.user);
};

/**
 * Get user by its ID
 * @param {string} userID
 * @param {import("../utils/customs/client.js").DogClient | null} [client]
 * @returns {Promise<User | null>}
 */
export async function get_user(userID, client = global._client) {
    try {
        if (!client) client = await wait_for_client();

        return (
            client.users.cache.get(userID)
            || await client.users.fetch(userID)
        );
    } catch {
        return null;
    };

};

/**
 * Get user by its username
 * @param {string} username
 * @param {import("../utils/customs/client.js").DogClient | null} [client]
 * @returns {Promise<User | null>}
 */
export async function get_user_by_username(username, client = global._client) {
    try {
        if (!client) client = await wait_for_client();

        return client.users.cache.find(u => u.username === username) ?? null;
    } catch {
        return null;
    };
};

/**
 * get the bot member of a guild
 * @param {Guild} guild
 * @returns {Promise<GuildMember>}
 */
export async function get_me(guild) {
    return (
        guild.members.me
        || await guild.members.fetchMe()
    );
};

/**
 * Get a Guild object by its ID
 * @param {string} guildID
 * @param {import("../utils/customs/client.js").DogClient | null} [client]
 * @returns {Promise<Guild | null>}
 */
export async function get_guild(guildID, client = global._client) {
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
 * @returns {Promise<import("discord.js").Channel[]>}
*/
export async function get_channels(guild, fetch_first = false) {
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
 * @returns {Promise<import("discord.js").Channel | import("discord.js").VoiceBasedChannel | null | undefined>}
 */
export async function get_channel(channelId, guild = null, fetch_first = false) {
    try {
        if (!channelId) return null;

        /** @type {Guild | import("../utils/customs/client.js").DogClient} */
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
 * Get message by its ID and guild
 * @param {Guild} guild
 * @param {string} messageId
 * @param {boolean} [fetch=false]
 * @param {import("../utils/customs/client.js").DogClient | null} [client=null]
 * @returns {Promise<Message | null>}
 */
export async function get_message_by_guild(guild, messageId, fetch = false, client = null) {
    if (!client) client = await wait_for_client();

    const channels_fetched = fetch
        ? await guild.channels.fetch()
        : guild.channels.cache;

    const channels = Array.from(channels_fetched.values()).filter(c => c !== null && c.isTextBased());

    for (const channel of channels) {
        try {
            const message = await channel.messages.fetch(messageId);

            if (message) return message;
        } catch (err) {
            // 忽略找不到訊息的錯誤
            continue;
        };
    };

    if (!fetch) {
        return await get_message_by_guild(guild, messageId, true, client);
    };

    return null;
};

/**
 * Get message by its ID and channel
 * @param {import("discord.js").TextBasedChannel} channel
 * @param {string} messageId
 * @param {boolean} [fetch=false]
 * @param {import("../utils/customs/client.js").DogClient | null} [client=null]
 * @returns {Promise<Message | null>}
 */
export async function get_message_by_channel(channel, messageId, fetch = false, client = null) {
    if (!client) client = await wait_for_client();

    try {
        const message = fetch
            ? await channel.messages.fetch(messageId)
            : channel.messages.cache.get(messageId);

        if (message) return message;
    } catch (err) {
        return null;
    };

    if (!fetch) {
        return await get_message_by_channel(channel, messageId, true, client);
    };

    return null;
};

/**
 *
 * @param {import("discord.js").VoiceChannel} voiceChannel
 * @param {Guild} guild
 * @returns {import("@discordjs/voice").CreateVoiceConnectionOptions & import("@discordjs/voice").JoinVoiceChannelOptions & Omit<import("@discordjs/voice").JoinConfig, "group">}
 */
export const VCJoinConfig = (voiceChannel, guild) => {
    return {
        "channelId": voiceChannel.id,
        "guildId": guild.id,
        "selfDeaf": true,
        "selfMute": false,
        "adapterCreator": guild.voiceAdapterCreator,
    };
};
