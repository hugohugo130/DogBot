const { get_logger } = require("../../utils/logger.js");
const util = require("node:util");

const logger = get_logger();

module.exports = {
    execute: async function () {
        try {
            const { uploadChangedDatabaseFiles } = require("../../utils/onlineDB.js");

            await uploadChangedDatabaseFiles();
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`自動上載資料庫檔案時出錯：${errorStack}`);
        };
    },
};