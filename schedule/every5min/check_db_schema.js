const { checkAndUpdateSchema } = require("../../utils/database.js");
const { get_logger } = require("../../utils/logger.js");

const logger = get_logger();

module.exports = {
    execute: async function () {
        try {
            checkAndUpdateSchema();
        } catch (error) {
            logger.error(`檢查資料庫 Schema 時出錯：${error.stack}`);
        }
    },
};
