const { Client, GatewayIntentBits, Options, Collection, Guild, GuildMember } = require("discord.js");

const { loadslashcmd } = require("../loadslashcmd.js");
const { loadDvoiceData } = require("../file.js");
const { authorName } = require("../config.js");

class DogClient extends Client {
    constructor() {
        const options = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ],
            rest: {
                timeout: 15000,
                retries: 3
            },
            allowedMentions: {
                repliedUser: false,
            },
            sweepers: {
                ...Options.DefaultMakeCacheSettings,
                channels: {
                    interval: 3_600,
                    lifetime: 1_800,
                },
                guilds: {
                    interval: 3_600,
                    lifetime: 1_800,
                },
                users: {
                    interval: 3_600,
                    filter: () => user => user.bot && user.id !== user.client.user.id,
                },
                messages: {
                    interval: 3_600,
                    lifetime: 1_800,
                },
            },
        };

        super(options);

        /** @type {string} */
        this.author = authorName || "哈狗";

        /** @type {Collection<string, object} */
        this.dvoice = new Collection();

        /** @type {Collection<string, any>} */
        this.commands = loadslashcmd(true);

        /** @type {Collection<string, any>} */
        this.musicTrackSession = new Collection();

        /** @type {Collection<string, object>} */
        this.oven_sessions = new Collection();

        /** @type {Collection<string, object>} */
        this.cook_sessions = new Collection();

        /** @type {Collection<string, object>} */
        this.gbmi_sessions = new Collection();

        /**
         * @type {Object.<string, Object.<string, Object.<string, string>>>}
         * USERID: {
         *  command: string
         * }
         */
        this.lock = {
            rpg_handler: {},
        };

        this.setMaxListeners(Infinity);
    };

    async on_ready() {
        this.dvoice = new Collection(Object.entries(await loadDvoiceData()));
    };

    /**
     * Get all guilds from all shards.
     * @returns {Promise<Guild[]>}
     */
    async getAllGuilds() {
        const shard = this.shard;
        if (shard) {
            const guilds = await shard.fetchClientValues("guilds.cache");

            return Array.from(guilds.values())
                .flat()
            // .filter(Boolean);
        } else {
            return Array.from(this.guilds.cache.values()).flat();
        };
    };

    /**
     * Get all members from a guild.
     * @param {Guild} guild
     * @param {boolean} [fetch] - 是否fetch guild的member而不是使用cache
     * @param {number} [fetch_timeout=360] - fetch members的timeout
     * @returns {Promise<GuildMember[]>}
     */
    async getGuildMembers(guild, fetch = true, fetch_timeout = 360) {
        let members;

        if (fetch) {
            try {
                if (fetch === "necessary") {
                    members = guild.members.cache || await guild.members.fetch({ time: fetch_timeout * 1000 });
                } else {
                    members = await guild.members.fetch({ time: fetch_timeout * 1000 });
                };
            } catch (err) {
                if (!err.message.includes("GuildMembersTimeout")) throw err;

                members = guild.members.cache;
            };
        } else {
            members = guild.members.cache;
        };

        return Array.from(members.values())
            .flat()
        // .filter(Boolean);
    };

    /**
     * Get all members from all guilds.
     * @param {boolean | string} fetch - 是否fetch guild的member而不是使用cache
     * @param {number} [fetch_timeout=360] - fetch members的timeout
     * @returns {Promise<GuildMember[]>}
     */
    async getAllGuildMembers(fetch = true, fetch_timeout = 360) {
        const guilds = await this.getAllGuilds();

        const members = await Promise.all(guilds.map(guild => this.getGuildMembers(guild, fetch, fetch_timeout)));

        return Array.from(members.values())
            .flat()
        // .filter(Boolean);
    };
};

module.exports = DogClient;
