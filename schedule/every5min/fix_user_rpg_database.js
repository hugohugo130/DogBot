import util from "util";

import {
    get_logger,
} from "../../utils/logger.js";
import {
    load_rpg_data,
    save_rpg_data,
} from "../../utils/file.js";
import DogClient from "../../utils/customs/client.js";

const logger = get_logger();

export default {
    /**
     * 
     * @param {DogClient} client 
     */
    execute: async function (client) {
        return;

        try {
            const users = client.users.cache.values();
            for (const user of users) {
                if (user.bot) continue;

                const rpg_data = await load_rpg_data(user.id);

                if (!rpg_data) continue;

                const backpack =
                    /** @type {{ [k: string]: any }} */
                    (rpg_data.inventory)
                    || {};

                let modified = false;

                for (const [item, amount] of Object.entries(backpack)) {
                    if (typeof amount === "string") {
                        logger.debug(`用戶 ${user.id} 的背包中 ${item} 的數量是字符串，正在修復... (${amount})`)

                        try {
                            // 過濾掉非數字的字符
                            const filteredAmount = amount.replace(/[^0-9]/g, "");

                            backpack[item] = parseInt(filteredAmount);

                            modified = true;
                        } catch {
                            delete backpack[item];

                            modified = true;
                        };
                    };

                    if (amount === 0) {
                        logger.debug(`用戶 ${user.id} 的背包中 ${item} 的數量為0，正在移除...`)
                        delete backpack[item];
                        modified = true;
                    };

                    if (typeof amount === "number" && !Number.isInteger(amount)) {
                        logger.debug(`用戶 ${user.id} 的背包中 ${item} 的數量為小數，轉換為整數`)
                        backpack[item] = Math.floor(amount);

                        modified = true;
                    };

                };

                if (modified) {
                    rpg_data.inventory = backpack;

                    await save_rpg_data(user.id, rpg_data);
                    logger.info(`已修復用戶 ${user.id} 的背包資料`);
                };
            };
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`修復用戶RPG資料庫時出錯：${errorStack}`);
        };
    },
};