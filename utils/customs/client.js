const { Client, GatewayIntentBits, Options, Collection, VoiceChannel, Guild } = require("discord.js");
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

        this.dvoice = new Collection(Object.entries(loadDvoiceData()));

        /** @type {Collection<string, any>} */
        this.commands = loadslashcmd(true);

        /** @type {string} */
        this.author = authorName || "哈狗";

        /** @type {Collection<string, any>} */
        this.musicTrackSession = new Collection();

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
     * @returns {Promise<Collection<string, Guild>}
     */
    async getAllGuilds() {
        const shard = this.shard;
        if (shard) {
            const guilds = await shard.fetchClientValues("guilds.cache");

            // filter(Boolean) 有什麼用？
            // 因為 fetchClientValues 會回傳一個 Array，裡面的元素可能是 null 或 undefined，所以要過濾掉。
            return guilds.flat(1).filter(Boolean);
        } else {
            return this.guilds.cache;
        };
    };

    async getGuildMembers(guildID) {
        const guild = this.guilds.cache.get(guildID);

        const members = await guild.members.fetch();

        // members 是一個 Collection，flat(1) 會將 Collection 轉換成 Array，filter(Boolean) 會過濾掉 null 和 undefined。
        return members.flat(1).filter(Boolean);
    };

    async getAllGuildMembers() {
        const guilds = await this.getAllGuilds();
        const members = await Promise.all(guilds.map(guild => guild.members.fetch()));

        return members.flat(1).filter(Boolean);
    };
};

module.exports = DogClient;
