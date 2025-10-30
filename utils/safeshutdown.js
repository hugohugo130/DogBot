const { uploadAllDatabaseFiles } = require("./onlineDB.js");
const { get_logger, shutdown } = require("./logger.js");
const { BotName } = require("./config.js");

async function safeshutdown(client) {
    try {
        const success = await uploadAllDatabaseFiles();

        if (client) {
            const logger = get_logger();

            logger.info(success ? "已上載所有資料庫檔案" : "上載資料庫檔案失敗，下次請選擇上載資料庫檔案或無操作！");
            logger.info(`🛑 ${client.name || BotName || client.user.tag} 已關機！`);

            // 等待logger info成功發送discord
            // await new Promise((resolve) => {
            //     const maxWaitTime = 20000; // 最多等待20秒
            //     const checkInterval = 100; // 每100ms檢查一次
            //     const startTime = Date.now();

            //     const checkLog = setInterval(() => {
            //         if (client.last_send_log && client.last_send_log.includes(shutdown_keyword)) {
            //             clearInterval(checkLog);
            //             resolve();
            //         }

            //         // 超時處理
            //         else if (Date.now() - startTime >= maxWaitTime) {
            //             clearInterval(checkLog);
            //             logger.debug("⚠️ 等待發送關機訊息逾時，繼續關機流程");
            //             resolve();
            //         };
            //     }, checkInterval);
            // });

        };

        await shutdown(true, 200);

    } finally {
        await client.destroy();
        process.exit();
    }
};

module.exports = {
    safeshutdown,
}
