const { Client, GatewayIntentBits, Events, Options } = require('discord.js');
const { checkDBFilesExists } = require('./utils/check_db_files.js');
const { checkAllDatabaseFilesContent } = require('./utils/onlineDB.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { get_logger, loggerManager } = require('./utils/logger.js');
const { loadslashcmd } = require('./utils/loadslashcmd.js');
const { safeshutdown } = require('./utils/safeshutdown.js');
const { get_areadline } = require('./utils/readline.js');
const { check_item_data } = require('./utils/rpg.js');
const { should_register_cmd } = require('./utils/auto_register.js');
const { registcmd } = require('./register_commands.js');
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
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
});

const logger = get_logger();

client.setMaxListeners(Infinity);

client.once(Events.ClientReady, async () => {
    const rl = get_areadline();

    rl.on("line", async (input) => {
        if (input === "stop") {
            await safeshutdown(client);
        } else if (input === "logger") {
            logger.log(`\n${loggerManager.keys().join("\n")}`);
        };
    });
});

(async () => {
    client.last_send_log = "";
    global._client = null;

    await checkAllDatabaseFilesContent();
    check_item_data();

    logger.info("機器人正在啟動....");

    const cogs = load_cogs(client);
    logger.info(`已加載 ${cogs} 個程式碼`);

    if (await should_register_cmd()) await registcmd(false, true);
    client.commands = loadslashcmd(true);

    logger.info(`已加載 ${client.commands.size} 個斜線指令`);

    await checkDBFilesExists();
    client.serverIP = getServerIPSync(client);

    await client.login(process.env.TOKEN);
    global._client = client;
})();
