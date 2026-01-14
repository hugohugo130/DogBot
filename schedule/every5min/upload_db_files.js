const util = require("util");

const { get_logger } = require("../../utils/logger.js");
const { uploadChangedDatabaseFiles } = require("../../utils/onlineDB.js");

const logger = get_logger();

module.exports = {
    execute: async function () {
        try {
            await uploadChangedDatabaseFiles();
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`自動上載資料庫檔案時出錯：${errorStack}`);
        };
    },
};