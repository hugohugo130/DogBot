const { Client, GatewayIntentBits, Events, Options } = require('discord.js');
const { checkDBFilesExists, checkDBFilesCorrupted } = require('./utils/check_db_files.js');
const { checkAllDatabaseFilesContent } = require('./utils/onlineDB.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { get_logger, loggerManager, loggerManager_log, loggerManager_nodc } = require('./utils/logger.js');
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

const split_line = "=".repeat(10);
logger.info(`${split_line}機器人正在啟動....${split_line}`);

client.setMaxListeners(Infinity);

client.once(Events.ClientReady, async () => {
    const rl = get_areadline();

    rl.on("line", async (input) => {
        if (input === "stop") {
            await safeshutdown(client);
        } else if (input === "fstop") {
            process.exit(0);
        } else if (input === "logger") {
            logger.log(`
loggerManager:
${Object.keys(loggerManager).join("\n")}
loggerManager_log:
${Object.keys(loggerManager_log).join("\n")}
loggerManager_nodc:
${Object.keys(loggerManager_nodc).join("\n")}`);
        };
    });
});

// 處理 Docker 容器關閉信號
process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信號，準備安全關閉...');
    await safeshutdown(client);
});

process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信號，準備安全關閉...');
    await safeshutdown(client);
});

(async () => {
    // const { downloadAllFiles } = require('./utils/onlineDB.js');
    // await downloadAllFiles();

    client.last_send_log = "";
    global._client = null;
    global.oven_sessions = {};

    await checkDBFilesCorrupted();
    await checkAllDatabaseFilesContent();
    await checkDBFilesExists();
    check_item_data();

    const cogs = load_cogs(client);
    logger.info(`已加載 ${cogs} 個程式碼`);

    if (await should_register_cmd()) await registcmd(false, true);
    client.commands = loadslashcmd(true);

    logger.info(`已加載 ${client.commands.size} 個斜線指令`);

    client.serverIP = getServerIPSync(client);

    await client.login(process.env.TOKEN);
    global._client = client;
})();
