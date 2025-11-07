const { get_logger } = require("../../utils/logger.js");

const logger = get_logger();

module.exports = {
    execute: async function (client) {
        try {
            const { checkDBFilesDefault } = require("../../utils/check_db_files.js");
            
            await checkDBFilesDefault(client);
        } catch (error) {
            logger.error(`檢查資料庫檔案預設值時出錯：${error.stack}`);
        };
    },
};