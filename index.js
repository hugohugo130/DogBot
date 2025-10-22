const { Client, GatewayIntentBits, Events } = require('discord.js');
const { checkDBFilesExists } = require('./utils/check_db_files.js');
const { checkAllDatabaseFilesContent } = require('./utils/onlineDB.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { get_logger } = require('./utils/logger.js');
const { loadslashcmd } = require('./utils/loadslashcmd.js');
const { safeshutdown } = require('./utils/safeshutdown.js');
const { get_areadline } = require('./utils/readline.js');
const { check_item_data } = require('./utils/rpg.js');
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const logger = get_logger({ client });

client.setMaxListeners(Infinity);

client.once(Events.ClientReady, async () => {
    const rl = get_areadline();

    rl.on("line", async (input) => {
        if (input === "stop") {
            await safeshutdown(client);
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
    const slashcmd = loadslashcmd(true);
    logger.info(`已加載 ${slashcmd.length} 個斜線指令`);
    await checkDBFilesExists();
    client.serverIP = getServerIPSync(client);

    await client.login(process.env.TOKEN);
    global._client = client;
})();
