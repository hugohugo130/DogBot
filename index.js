const { Events } = require('discord.js');
const DogClient = require("./utils/customs/client.js");
const { checkDBFilesExists, checkDBFilesCorrupted } = require('./utils/check_db_files.js');
const { checkAllDatabaseFilesContent } = require('./utils/onlineDB.js');
const { load_cogs } = require("./utils/load_cogs.js");
const { get_logger, loggerManager, loggerManager_log, loggerManager_nodc } = require('./utils/logger.js');
const { safeshutdown } = require('./utils/safeshutdown.js');
const { get_areadline } = require('./utils/readline.js');
const { check_item_data } = require('./utils/rpg.js');
const { should_register_cmd } = require('./utils/auto_register.js');
const { registcmd } = require('./register_commands.js');
const { initDatabase, transferQueueToClient, closeDatabase } = require('./utils/database.js');
require("dotenv").config();

const client = new DogClient();

const logger = get_logger();

// 未捕獲的 Promise Rejection 處理
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`未捕獲的 Promise Rejection:\n${reason?.stack || reason}`);
});

// 未捕獲的異常處理
process.on('uncaughtException', (error) => {
    logger.error(`未捕獲的異常:\n${error.stack}`);
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
// 處理 Docker 容器關閉信號
process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信號，準備安全關閉...');
    try {
        await safeshutdown(client);
    } catch (error) {
        logger.error(`安全關閉時發生錯誤: ${error.stack}`);
        process.exit(1);
    };
});

process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信號，準備安全關閉...');
    try {
        await safeshutdown(client);
    } catch (error) {
        logger.error(`安全關閉時發生錯誤: ${error.stack}`);
        process.exit(1);
    };
});

(async () => {
    global._client = null;
    global.oven_sessions = {};
    global.smelter_sessions = {};

    // 初始化 SQL 資料庫
    logger.info('初始化 SQL 資料庫...');
    initDatabase();

    await checkDBFilesCorrupted();
    await checkAllDatabaseFilesContent();
    await checkDBFilesExists();
    check_item_data();

    const cogs = load_cogs(client);
    logger.info(`已加載 ${cogs} 個程式碼`);

    if (await should_register_cmd()) await registcmd(false, true);

    logger.info(`已加載 ${client.commands.size} 個斜線指令`);

    await client.login(process.env.TOKEN);
    global._client = client;
    
    // 將 Queue 從 global 轉移到 client
    transferQueueToClient(client);
})();
