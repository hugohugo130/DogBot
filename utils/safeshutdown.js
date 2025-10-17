const { uploadAllDatabaseFiles } = require("./file.js");
const { get_logger } = require("./logger.js");

async function safeshutdown(client) {
    const logger = get_logger({ client });
    await uploadAllDatabaseFiles()

    logger.info("已上載所有資料庫檔案");
    logger.info("🛑 哈狗機器犬 已關機！");

    while (global.sendQueue.length > 0) {
        await Promise.all(resolve => setTimeout(resolve, 1000));
    };

    await client.destroy();
    process.exit(0);
};

module.exports = {
    safeshutdown,
}