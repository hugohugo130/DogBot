require("./utils/check.env.js") // check .env file
require("node:process").loadEnvFile(); // loads .env file
const { Events, Collection } = require("discord.js");
const { get_logger } = require("./utils/logger.js");
const { load_cogs } = require("./utils/load_cogs.js");
const { check_item_data } = require("./utils/rpg.js");
const { registcmd } = require("./register_commands.js");
const { getQueues } = require("./utils/music/music.js");
const { getCacheManager } = require("./utils/cache.js");
const { get_areadline } = require("./utils/readline.js");
const { safeshutdown } = require("./utils/safeshutdown.js");
const { check_language_keys } = require("./utils/language.js");
const { getServerIPSync } = require("./utils/getSeverIPSync.js");
const { should_register_cmd } = require("./utils/auto_register.js");
const { check_help_rpg_info } = require("./cogs/rpg/interactions.js");
const { checkDBFilesExists, checkDBFilesCorrupted } = require("./utils/check_db_files.js");
const { checkAllDatabaseFilesContent, uploadAllDatabaseFiles } = require("./utils/onlineDB.js");
const DogClient = require("./utils/customs/client.js");
const util = require("util");

const args = process.argv.slice(2);
const debug = args.includes("--debug");

const client = new DogClient();

const logger = get_logger();

// 未捕獲的 Promise Rejection 處理
process.on("unhandledRejection", (reason, promise) => {
    let errorStack = reason?.stack || reason;
    if (reason instanceof Error) {
        errorStack = util.inspect(reason, { depth: null });
    };

    if (errorStack.includes("Missing Access")) return;
    if (errorStack.includes("Missing Permissions")) return;
    if (errorStack.includes("Unknown interaction")) return;

    logger.error(`未捕獲的 Promise Rejection:\n${errorStack}`);
});

// 未捕獲的異常處理
process.on("uncaughtException", (error) => {
    const errorStack = util.inspect(error, { depth: null });

    if (errorStack.includes("Missing Access")) return;
    if (errorStack.includes("Missing Permissions")) return;
    if (errorStack.includes("Unknown interaction")) return;

    logger.error(`未捕獲的異常:\n${errorStack}`);
});

// CPU 和記憶體監控
let lastCpuUsage = process.cpuUsage();
let lastMemoryWarning = 0;
const memoryLimitMB = 500;

setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // 記憶體使用超過限制時警告（每5分鐘最多警告一次）
    if (memUsedMB > memoryLimitMB && Date.now() - lastMemoryWarning > 300000) {
        logger.warn(`記憶體使用過高: ${memUsedMB}MB / ${memTotalMB}MB`);
        lastMemoryWarning = Date.now();
    };

    // CPU 使用率監控
    const currentCpuUsage = process.cpuUsage(lastCpuUsage);
    lastCpuUsage = process.cpuUsage();

    // 計算 CPU 使用率（百分比）
    const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000000 / 30) * 100;

    if (cpuPercent > 80) {
        logger.warn(`CPU 使用率過高: ${cpuPercent.toFixed(2)}%`);
    };
}, 30000); // 每30秒檢查一次

const split_line = "=".repeat(10);
logger.info(`${split_line}機器人正在啟動....${split_line}`);

client.once(Events.ClientReady, async () => {
    get_areadline().on("line", async (input) => {
        switch (input) {
            case "stop": {
                await safeshutdown(client);
                break;
            };

            case "fstop": {
                process.exit(0);
            };

            case "music": {
                const musicQueues = getQueues();

                const playingPlayers = musicQueues.filter(queue => queue.isPlaying()).size;
                const playersCount = musicQueues.size;
                const totalTracks = musicQueues.reduce((acc, queue) => {
                    return acc + queue.isPlaying() ? 1 + queue.tracks.length : 0;
                }, 0);

                logger.info(`\n- 連接用戶 (音樂播放器)：${playersCount}\n- 正在播放總人數: ${playingPlayers}\n- 正在播放 ${totalTracks} 首音樂。`);
                break;
            };

            case "uploadall": {
                await uploadAllDatabaseFiles();
                logger.info(`done uploading all database files`)

                break;
            };
        };

        if (input.startsWith("musicd ")) {
            const [_, depth] = input.split(" ");
            const depthNum = parseInt(depth) || null;

            logger.info(util.inspect(getQueues(), { depth: depthNum }));
        } else if (input.startsWith("cache ")) {
            const [_, option] = input.split(" ");

            switch (option) {
                case "clear": {
                    const cachemgr = getCacheManager();

                    cachemgr.clear();
                    logger.info(`[cacheManager] cleaned all caches successfully`);
                    break;
                }

                case "stats": {
                    const cachemgr = getCacheManager();

                    logger.info(util.inspect(cachemgr.getStats(), { depth: null }));
                    break;
                }
            };
        };

        logger.info("=".repeat(20));
    });
});

(async () => {
    global._client = null;
    global.perloadResponse = new Collection();

    await checkDBFilesCorrupted();
    if (!debug) await checkAllDatabaseFilesContent();

    check_help_rpg_info();
    check_language_keys();
    check_item_data();
    await checkDBFilesExists();

    client.serverIP = getServerIPSync(client);

    const cogs = await load_cogs(client);
    logger.info(`✅ Loaded ${cogs} cogs`);

    if (await should_register_cmd()) await registcmd(true, true);

    logger.info(`✅ Loaded ${client.commands.size} slash commands`);

    await client.login(process.env.TOKEN);

    global._client = client;
})();
