const { Client, GatewayIntentBits, Options, Collection, VoiceChannel, Guild, GuildMember } = require("discord.js");
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
        this.dvoice = new Collection(Object.entries(loadDvoiceData()));

        /** @type {Collection<string, any>} */
        this.commands = loadslashcmd(true);

        /** @type {Collection<string, any>} */
        this.musicTrackSession = new Collection();

        /** @type {Collection<string, object>} */
        this.oven_sessions = new Collection();

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

    /**
     * 
     * @returns {Promise<Guild[]>}
     */
    async getAllGuilds() {
        const shard = this.shard;
        if (shard) {
            const guilds = await shard.fetchClientValues("guilds.cache");

            return Array.from(guilds.values());
        } else {
            return this.guilds.cache;
        };
    };

    /**
     * 
     * @param {string} guildID
     * @param {boolean} fetch - 是否fetch guild的member而不是使用cache
     * @returns {Promise<GuildMember[]>}
     */
    async getGuildMembers(guildID, fetch = true) {
        const guild = this.guilds.cache.get(guildID);

        if (!guild) return [];

        let members;
        if (fetch) {
            members = await guild.members.fetch();
        } else {
            members = guild.members.cache;
        };

        return Array.from(members.values());
    };

    /**
     * 
     * @param {boolean} fetch - 是否fetch guild的member而不是使用cache
     * @returns {Promise<GuildMember[]>}
     */
    async getAllGuildMembers(fetch = true) {
        const guilds = await this.getAllGuilds();

        const members = await Promise.all(guilds.map(guild => this.getGuildMembers(guild.id, fetch)));

        return Array.from(members.values());
    };
};

module.exports = DogClient;
