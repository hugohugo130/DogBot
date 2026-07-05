import util from "util";

import {
    get_logger,
} from "../../utils/logger.js";
import {
    uploadChangedDatabaseFiles,
} from "../../utils/onlineDB.js";

const logger = get_logger();

export default {
    execute: async function () {
        try {
            await uploadChangedDatabaseFiles();
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`自動上載資料庫檔案時出錯：${errorStack}`);
        };
    },
};