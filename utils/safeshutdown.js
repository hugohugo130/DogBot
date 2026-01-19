const { uploadAllDatabaseFiles } = require("./onlineDB.js");
const { shutdown } = require("./logger.js");
const { saveDvoiceData } = require("./file.js");
const { BotName } = require("./config.js");
const DogClient = require("./customs/client.js");

/**
 * 
 * @param {DogClient} client 
 */
async function safeshutdown(client) {
    try {
        await saveDvoiceData(client.dvoice.toJSON() || {});
        console.log("成功保存dvoice資料！");

        const [success, _] = await Promise.allSettled([
            uploadAllDatabaseFiles(),
            shutdown(true, 200),
        ]);

        console.log(success.status === "fulfilled" ? "已上載所有資料庫檔案" : `上載資料庫檔案失敗，下次請選擇上載資料庫檔案或無操作！\n${success.reason}`);
        console.log(`🛑 ${client?.name || BotName || client?.user?.tag} 已關機！`);
    } finally {
        await client?.destroy?.();
        process.exit();
    };
};

module.exports = {
    safeshutdown,
};
