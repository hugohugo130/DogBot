const { Client, GatewayIntentBits, Options } = require('discord.js');
const { getServerIPSync } = require("../getSeverIPSync.js");
const { loadslashcmd } = require('../loadslashcmd.js');
const { loadDvoiceData } = require('../file.js');
const { authorName } = require("../config.js");

class DogClient extends Client {
    constructor() {
        this.last_send_log = "";
        this.dvoice = loadDvoiceData();
        this.commands = loadslashcmd(true);
        this.serverIP = getServerIPSync(this);
        this.author = authorName || "哈狗";

        this.setMaxListeners(Infinity);

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
        }

        super(options);
    };

}

module.exports = DogClient;