const { uploadAllDatabaseFiles } = require("./onlineDB.js");
const { get_logger, shutdown } = require("./logger.js");
const { BotName } = require("./config.js");
const { saveDvoiceData } = require("./file.js");
const DogClient = require("./customs/client.js");

/**
 * 
 * @param {DogClient} client 
 */
async function safeshutdown(client) {
    try {
        const success = await uploadAllDatabaseFiles();
        saveDvoiceData(client.dvoice.toJSON() || {});

        if (client) {
            const logger = get_logger();

            logger.info(success ? "已上載所有資料庫檔案" : "上載資料庫檔案失敗，下次請選擇上載資料庫檔案或無操作！");
            logger.info("成功保存dvoice資料！");
            logger.info(`🛑 ${client.name || BotName || client.user.tag} 已關機！`);
        };

        await shutdown(true, 200);
    } finally {
        if (client?.destroy) await client.destroy();
        process.exit();
    };
};

module.exports = {
    safeshutdown,
}
