const util = require("util");

const { get_logger } = require("../../utils/logger.js");
const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
const DogClient = require("../../utils/customs/client.js");

const logger = get_logger();

module.exports = {
    /**
     * 
     * @param {DogClient} client 
     */
    execute: async function (client) {
        try {
            // const users = client.users.cache.values();
            // for (const user of users) {
            //     if (user.bot) continue;

            //     const rpg_data = await load_rpg_data(user.id);

            //     if (!rpg_data) continue;

            //     const backpack = rpg_data.backpack || {};
            //     let modified = false;

            //     for (const [item, amount] of Object.entries(backpack)) {
            //         if (typeof amount === "string") {
            //             logger.warn(`用戶 ${user.id} 的背包中 ${item} 的數量是字符串，正在修復... (${amount})`)

            //             try {
            //                 backpack[item] = parseInt(amount);

            //                 modified = true;
            //             } catch {
            //                 // 過濾掉非數字的字符
            //                 const filteredAmount = amount.replace(/[^0-9]/g, "");
            //                 backpack[item] = parseInt(filteredAmount) || 0;

            //                 modified = true;
            //             };
            //         };

            //         if (amount === 0) {
            //             logger.warn(`用戶 ${user.id} 的背包中 ${item} 的數量為0，正在移除...`)
            //             delete backpack[item];
            //             modified = true;
            //         };
            //     };

            //     if (modified) {
            //         rpg_data.backpack = backpack;

            //         await save_rpg_data(user.id, rpg_data);
            //         logger.warn(`已修復用戶 ${user.id} 的背包資料`);
            //     };
            // };
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`修復用戶RPG資料庫時出錯：${errorStack}`);
        };
    },
};