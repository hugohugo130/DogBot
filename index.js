const { Client, GatewayIntentBits, Events } = require('discord.js');
const { checkDBFilesExists, checkDBFilesDefault } = require('./utils/check_db_files.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { time } = require("./utils/time.js");
const { get_logger } = require('./utils/logger.js');
const { loadslashcmd } = require('./utils/loadslashcmd.js');
const { run_schedule } = require("./utils/run_schedule.js");
const { safeshutdown } = require('./utils/safeshutdown.js');
const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
    ],
});

const logger = get_logger({ client });

client.setMaxListeners(Infinity);

rl.on("line", async (input) => {
    if (input === "stop") {
        await safeshutdown(client);
    };
});

client.once(Events.ClientReady, async () => {
    await checkDBFilesDefault(client);
    const schedules = run_schedule(client);
    logger.info(`已加載 ${schedules} 個排程`);
});

(async () => {
    logger.info("機器人正在啟動....");
    const cogs = load_cogs(client);
    logger.info(`已加載 ${cogs} 個程式碼`);
    const slashcmd = loadslashcmd(true);
    logger.info(`已加載 ${slashcmd.length} 個斜線指令`);
    await checkDBFilesExists();
    client.serverIP = getServerIPSync(client);

    await client.login(process.env.TOKEN);
})();
