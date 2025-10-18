const { uploadAllDatabaseFiles } = require("./onlineDB.js");
const { get_logger } = require("./logger.js");
const { asleep } = require("./sleep.js");
const { BotName } = require("./config.js");

async function safeshutdown(client) {
    const logger = get_logger({ client });
    const success = await uploadAllDatabaseFiles();

    logger.info(success ? "已上載所有資料庫檔案" : "上載資料庫檔案失敗，下次請選擇上載資料庫檔案或無操作！");
    logger.info(`🛑 ${client.name || BotName || client.user.tag} 已關機！`);

    while (true) {
        if (global.sendQueue.length <= 0) break;
        await asleep(250);
    };

    await client.destroy();
    process.exit(0);
};

module.exports = {
    safeshutdown,
}