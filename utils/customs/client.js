const { Client, GatewayIntentBits, Options, Collection, Guild, GuildMember, User } = require("discord.js");

const { authorName, BotName } = require("../config.js");

/**
 * @typedef OvenBakeSession
 * @property {string} item_id
 * @property {number} amount
 * @property {number} coal_amount
 * @property {number} duration
 * @property {{ item: string, amount: number }[]} item_need
 * @property {string} userId
 */

/**
 * @typedef {{ item: string, amount: number }[]} SmelterSession
*/

/**
 * @typedef CookSession
 * @property {string} userId
 * @property {{ input: { name: string, amount: number }[], output: string, amount: number }} recipe
 * @property {{ item: string, amount: number}[]} inputed_foods
 * @property {{ item: string, amount: number}[]} item_needed
 * @property {number} amount
 * @property {number} cooked
 * @property {number} last_cook_time
 */

/**
 * @typedef GbmiSession
 * @property {{ item: string, amount: number }[]} item_needed
 * @property {string} userId
 */

class DogClient extends Client {
    constructor() {
        const { loadslashcmd } = require("../loadslashcmd.js");

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

                    filter: () =>
                        /** @param {User} user */
                        (user) => user.bot && user.id !== user.client.user.id,
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

        /** @type {Collection<string, import("../config.js").DvoiceData>} */
        this.dvoice = new Collection();

        const cmds = loadslashcmd(true);
        if (!(cmds instanceof Collection)) throw new Error("loadslashcmd(true) should return an Collection");

        /** @type {Collection<string, any>} */
        this.commands = cmds;

        /** @type {Collection<string, any>} */
        this.musicTrackSession = new Collection();

        /** @type {Collection<string, OvenBakeSession>} */
        this.oven_sessions = new Collection();

        /** @type {Collection<string, SmelterSession>} */
        this.smelter_sessions = new Collection();

        /** @type {Collection<string, CookSession>} */
        this.cook_sessions = new Collection();

        /** @type {Collection<string, GbmiSession>} */
        this.gbmi_sessions = new Collection();

        /** @type {{IP: string, PORT: number}} */
        this.serverIP = { IP: "192.168.0.156", "PORT": 3003 };

        /** @type {string} */
        this.name = BotName; // will be set when the client is ready if BotName is not set

        /**
         * @type {{ rpg_handler: { [k: string]: string} }}
         */
        this.lock = {
            rpg_handler: {},
        };

        this.setMaxListeners(Infinity);
    };

    /**
     * @returns {Promise<void>}
     */
    async on_ready() {
        const { loadDvoiceData } = require("../file.js");

        this.dvoice = new Collection(await loadDvoiceData());

        if (!this.name && this.user?.id) this.name = this.user.id;
    };

    /**
     * Get all guilds from all shards.
     * @returns {Promise<Guild[]>}
     */
    async getAllGuilds() {
        const shard = this.shard;
        if (shard) {
            /** @type {Guild[]} */
            const guilds = [];

            for (const item of (await shard.fetchClientValues("guilds.cache"))) {
                if (item instanceof Collection) {
                    guilds.push(...item.values());
                };
            };

            return guilds;
        };

        // 非分片模式：直接返回本地的 guilds.cache 的值
        return Array.from(this.guilds.cache.values());
    };

    /**
     * Get all members from a guild.
     * @param {Guild} guild
     * @param {boolean | "necessary"} [fetch] - 是否fetch guild的member而不是使用cache
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
                if (err instanceof Error && err.stack && !err.stack.includes("GuildMembersTimeout")) throw err;

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
     * @param {boolean | "necessary"} fetch - 是否fetch guild的member而不是使用cache
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
