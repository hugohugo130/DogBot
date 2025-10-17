const { Client, GatewayIntentBits, Events } = require('discord.js');
const { checkDBFilesExists } = require('./utils/check_db_files_exists.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { time } = require("./utils/time.js");
const { get_logger, process_send_queue } = require('./utils/logger.js');
const { loadslashcmd } = require('./utils/loadslashcmd.js');
const { run_schedule } = require("./utils/run_schedule.js");
const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});
require("dotenv").config({ quiet: true });

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

const logger = get_logger({ client: client });

client.setMaxListeners(Infinity);

rl.on("line", async (input) => {
    if (input === "stop") {
        logger.log(`${time()} 機器人正在關機....`);
        await client.destroy();
        process.exit();
    };
});

client.once(Events.ClientReady, async () => {
    const schedules = run_schedule(client);
    logger.log(`已加載 ${schedules} 個排程`);
});

(async () => {
    logger.log("機器人正在啟動....");
    const [cogs, reload] = load_cogs(client);
    logger.log(`已${reload ? "重新" : ""}加載 ${cogs} 個程式碼`);
    const slashcmd = loadslashcmd(true);
    logger.log(`已加載 ${slashcmd.length} 個斜線指令`);
    await checkDBFilesExists();
    client.serverIP = getServerIPSync(client);

    client.login(process.env.TOKEN);
})();
