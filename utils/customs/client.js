const { Client, GatewayIntentBits, Options, Collection, VoiceChannel } = require("discord.js");
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
};

module.exports = DogClient;
