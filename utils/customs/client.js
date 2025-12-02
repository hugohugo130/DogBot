const { Client, GatewayIntentBits, Options } = require('discord.js');
const { loadslashcmd } = require('../loadslashcmd.js');
const { loadDvoiceData } = require('../file.js');
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

        this.last_send_log = "";
        this.dvoice = loadDvoiceData();
        this.commands = loadslashcmd(true);
        this.author = authorName || "哈狗";
        this.users.cache2 = structuredClone(this.users.cache);

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
