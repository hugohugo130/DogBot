const { shutdown } = require("./logger.js");
const { saveDvoiceData } = require("./file.js");
const { getCacheManager } = require("./cache.js");
const { uploadAllDatabaseFiles } = require("./onlineDB.js");
const { BotName } = require("./config.js");
const DogClient = require("./customs/client.js");

/**
 * exit the process safely.
 * @param {DogClient} client
 */
async function safeshutdown(client) {
    try {
        await saveDvoiceData(client.dvoice.entries().toArray() || []);
        console.log("成功保存dvoice資料！");

        const [success, _] = await Promise.allSettled([
            uploadAllDatabaseFiles(),
            shutdown(true, 200),
        ]);

        console.log(success.status === "fulfilled" ? "已上載所有資料庫檔案" : `上載資料庫檔案失敗，下次請選擇上載資料庫檔案或無操作！\n${success.reason}`);
        console.log(`🛑 ${client?.name || BotName || client?.user?.tag} 已關機！`);
    } finally {
        getCacheManager(false)?.destroy?.();
        await client?.destroy?.();
        process.exit();
    };
};

module.exports = {
    safeshutdown,
};
