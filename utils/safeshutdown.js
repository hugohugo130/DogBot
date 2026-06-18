import {
    shutdown,
} from "./logger.js";
import {
    saveDvoiceData,
} from "./file.js";
import {
    getCacheManager,
} from "./cache.js";
import {
    uploadAllDatabaseFiles,
} from "./onlineDB.js";
import {
    saveAllMusicStates,
} from "./music/persistence.js";
import {
    BotName,
} from "./config.js";
import DogClient from "./customs/client.js";

/**
 * exit the process safely.
 * @param {DogClient} client
 */
async function safeshutdown(client) {
    try {
        await saveDvoiceData(client.dvoice.entries().toArray() || []);
        console.log("成功保存dvoice資料！");

        await saveAllMusicStates();
        console.log("成功保存音樂狀態！");

        await uploadAllDatabaseFiles();
        console.log("已上載所有資料庫檔案");

        await shutdown(true, 200);
        console.log("已關閉所有logger");

        await client?.destroy?.();
        console.log(`🛑 ${client?.name || BotName || client?.user?.tag} 已關機！`);
    } finally {
        getCacheManager(false)?.destroy?.();
        process.exit();
    };
};

export {
    safeshutdown,
};
