const { checkAndUpdateSchema } = require("../../utils/SQLdatabase.js");
const { get_logger } = require("../../utils/logger.js");
const util = require('node:util');

const logger = get_logger();

module.exports = {
    execute: async function () {
        try {
            checkAndUpdateSchema();
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`檢查資料庫 Schema 時出錯：${errorStack}`);
        };
    },
};
