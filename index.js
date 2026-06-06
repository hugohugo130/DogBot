import "./utils/check.env.js"; // check .env file
import { inspect } from "util";
import { loadEnvFile } from "node:process";

import get_areadline from "./utils/readline.js";
import { Events, Collection } from "discord.js";
import { get_logger } from "./utils/logger.js";
import { load_cogs } from "./utils/load_cogs.js";
import { check_item_data } from "./utils/rpg.js";
import { registcmd } from "./register_commands.js";
import { getQueues } from "./utils/music/music.js";
import { getCacheManager } from "./utils/cache.js";
import { loadslashcmd } from "./utils/loadslashcmd.js";
import { safeshutdown } from "./utils/safeshutdown.js";
import { hot_reload_cogs } from "./utils/hot_reload.js";
import { check_language_keys } from "./utils/language.js";
import { getServerIPSync } from "./utils/getSeverIPSync.js";
import { should_register_cmd } from "./utils/auto_register.js";
import { check_help_rpg_info } from "./cogs/rpg/interactions.js";
import { saveAllMusicStates } from "./utils/music/persistence.js";
import { checkDBFilesExists, checkDBFilesCorrupted } from "./utils/check_db_files.js";
import { checkAllDatabaseFilesContent, uploadAllDatabaseFiles } from "./utils/onlineDB.js";
import DogClient from "./utils/customs/client.js";

loadEnvFile(); // load .env file

const args = process.argv.slice(2);
const debug = args.includes("--debug");
const isBeta = args.includes("--beta");

const TOKEN = !isBeta
    ? process.env.TOKEN
    : process.env.BETA_TOKEN;

const client = new DogClient();

const logger = get_logger();

// 未捕獲的 Promise Rejection 處理
process.on("unhandledRejection", (reason, promise) => {
    let errorStack = reason;

    if (reason instanceof Error) {
        errorStack = inspect(reason, { depth: null });
    };

    const errorStack_str = String(errorStack);

    if (errorStack_str.includes("Missing Access")) return;
    if (errorStack_str.includes("Missing Permissions")) return;
    if (errorStack_str.includes("Unknown interaction")) return;

    logger.error(`未捕獲的 Promise Rejection:\n${errorStack_str}`);
});

// 未捕獲的異常處理
process.on("uncaughtException", (error) => {
    const errorStack = inspect(error, { depth: null });

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
    get_areadline(true)?.on("line", async (input) => {
        input = input.trim();

        const [command, ...args] = input.split(" ");

        switch (command) {
            case "stop": {
                await safeshutdown(client);
                break;
            }

            case "fstop": {
                process.exit(0);

                break;
            }

            case "music": {
                const musicQueues = getQueues();

                const playingPlayers = musicQueues.filter(queue => queue.isPlaying()).size;
                const playersCount = musicQueues.size;
                const totalTracks = musicQueues.reduce((acc, queue) => {
                    return acc + (queue.isPlaying() ? 1 + queue.tracks.length : 0);
                }, 0);

                logger.info(`\n- 連接用戶 (音樂播放器)：${playersCount}\n- 正在播放總人數: ${playingPlayers}\n- 正在播放 ${totalTracks} 首音樂。`);

                break;
            }

            case "uploadall": {
                await uploadAllDatabaseFiles();
                logger.info(`done uploading all database files`)

                break;
            }

            case "ping": {
                logger.info(`Pong! ${client.ws.ping}ms`);

                break;
            }

            case "musicd": {
                const [depth] = args;

                const depthNum = parseInt(depth) || null;

                logger.info(inspect(getQueues(), { depth: depthNum }));

                break;
            }

            case "cache": {
                const [option] = args;

                switch (option) {
                    case "clear": {
                        const cachemgr = getCacheManager();
                        if (!cachemgr) break;

                        cachemgr.clear();
                        logger.info(`[cacheManager] cleaned all caches successfully`);
                        break;
                    }

                    case "stats": {
                        const cachemgr = getCacheManager();
                        if (!cachemgr) break;

                        logger.info(inspect(cachemgr.getStats(), { depth: null }));
                        break;
                    }
                };

                break;
            }

            case "debug": {
                const [option] = args;

                switch (option) {
                    case "music-persistence": {
                        await saveAllMusicStates();
                    };
                };

                break;
            }

            case "reload": {
                const [reload_what] = args;

                switch (reload_what) {
                    case "cog":
                    case "cogs": {
                        const reloaded_cogs = await hot_reload_cogs({ quiet: true });

                        logger.info(`✅ Reloaded ${reloaded_cogs} cogs`);

                        break;
                    }
                };

                break;
            }
        };

        logger.info("=".repeat(20));
    })
});

(async () => {
    global._client = null;
    global._areadline = null;
    global.sendQueue = [];
    global.preloadResponse = new Collection();

    await checkDBFilesCorrupted();
    if (!debug) await checkAllDatabaseFilesContent();

    check_help_rpg_info();
    check_language_keys();
    check_item_data();
    await checkDBFilesExists();

    client.serverIP = getServerIPSync();

    const cogs = await load_cogs(client);
    logger.info(`✅ Loaded ${cogs} cogs`);

    if (await should_register_cmd()) {
        await registcmd(true, true);
    };

    client.commands = await loadslashcmd(true);

    logger.info(`✅ Loaded ${client.commands.size} slash commands`);

    await client.login(TOKEN);

    global._client = client;
})();
