const { writeJson, existsSync, basename, join_db_folder, load_rpg_data } = require("./file.js");
const { DATABASE_FILES, DEFAULT_VALUES, priorityUserIDs, priorityGuildIDs } = require("./config.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready, client_ready } = require("./wait_until_ready.js");
const { getDatabase } = require("./SQLdatabase.js");
const { User } = require("discord.js");

const logger = get_logger();
const logger_nodc = get_logger({ nodc: true });

async function checkDBFilesExists() {
    // 檢查 SQL 資料庫檔案
    const sqlDbPath = join_db_folder("bot.db");
    if (!existsSync(sqlDbPath)) {
        logger.warn(`SQL 資料庫檔案 bot.db 不存在，將自動初始化`);
        // getDatabase() 會自動創建資料庫
        getDatabase();
    }

    // 檢查舊的 JSON 檔案（向後兼容）
    for (let file of DATABASE_FILES) {
        file = basename(file);
        const defaultValue = DEFAULT_VALUES?.single?.[file] || {};

        const filePath = join_db_folder(file);
        if (!existsSync(filePath) && defaultValue) {
            const default_value = await writeJson(filePath, defaultValue);
            logger.warn(`資料庫檔案 ${file} 不存在，已建立 (預設值為: ${default_value})`);
        };
    };
};

async function checkDBFilesCorrupted() {
    let err = false;

    // 檢查 SQL 資料庫完整性
    const sqlDbPath = join_db_folder("bot.db");
    if (existsSync(sqlDbPath)) {
        try {
            const db = getDatabase();
            // 執行簡單查詢測試資料庫完整性
            db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        } catch (error) {
            logger_nodc.error(`SQL 資料庫檔案 bot.db 已損毀: ${error.message}`);
            err = true;
        };
    };

    if (err) process.exit(1);
};

/**
 * 
 * @param {Array<User>} users 
 * @returns {void}
 */
function make_db_compatible(users) {
    for (const user of users) {
        if (user instanceof User) {
            /*
            2025 12 02:
            - 把db.count的mine, hew, herd, brew, fish, fell，合併成work，並刪除
            - 增加work鍵
            */

            const rpg_data = load_rpg_data(user.id);
            if (!rpg_data.count) rpg_data.count = {};

            const keys = ['mine', 'hew', 'herd', 'brew', 'fish', 'fell'];
            for (const key of keys) {
                if (!rpg_data.count.work) {
                    rpg_data.count.work = 0
                };

                if (typeof rpg_data.count.work === "string") {
                    logger.warn(`[userId ${user.id}] rpg_data.count.work is string, converted to number: ${rpg_data.count.work}`);

                    rpg_data.count.work = parseInt(rpg_data.count.work);
                };

                if (rpg_data.count.work[key]) {
                    if (typeof rpg_data.count.work[key] === "number") {
                        rpg_data.count.work += rpg_data.count.work[key];
                    };

                    delete rpg_data.count.work[key];
                };
            };

            save_rpg_data(user.id, rpg_data);
        };
    };
};

/**
 * @warning run this before client.login may block forever
 * @param {object} client 
 * @returns {Promise<void>}
 */
async function checkDBFilesDefault(client) {
    if (!client_ready(client)) wait_until_ready(client);

    const guildCollection = await client.guilds.fetch();
    const guildArray = [...guildCollection.values()];

    const guilds = (await Promise.all(guildArray.map(guild => guild.fetch())))
        .sort((a, b) => {
            if (a.id.includes(priorityGuildIDs)) return -1;
            if (b.id.includes(priorityGuildIDs)) return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    let users;
    try {
        users = await Promise.all(guilds.map(guild => guild.members.fetch()));
    } catch (err) {
        // use cache if rate limited [GuildMembersTimeout]
        if (!err.message.includes("GuildMembersTimeout")) throw err;
        users = guilds.map(guild => guild.members.cache);
    };

    users = users
        .flatMap(members => [...members.values()])
        .map(member => member.user)
        .sort((a, b) => {
            if (a.id.includes(priorityUserIDs)) return -1;
            if (b.id.includes(priorityUserIDs)) return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    // === SQL 資料庫預設值檢查 ===
    const db = getDatabase();

    // 檢查並插入用戶預設值
    const insertUserStmt = db.prepare(`
        INSERT OR IGNORE INTO rpg_database (user_id, money, hunger)
        VALUES (?, 1000, 20)
    `);

    const insertUserShopStmt = db.prepare(`
        INSERT OR IGNORE INTO rpg_shop (user_id, status)
        VALUES (?, 1)
    `);

    const insertUserFarmStmt = db.prepare(`
        INSERT OR IGNORE INTO rpg_farm (user_id, exp, lvl)
        VALUES (?, 0, 0)
    `);

    for (const user of users) {
        insertUserStmt.run(user.id);
        insertUserShopStmt.run(user.id);
        insertUserFarmStmt.run(user.id);
    };

    // 檢查並插入公會預設值
    const insertGuildStmt = db.prepare(`
        INSERT OR IGNORE INTO guilds (guild_id, rpg)
        VALUES (?, 0)
    `);

    for (const guild of guilds) {
        insertGuildStmt.run(guild.id);
    };

    // 執行 make_db_compatible
    make_db_compatible(users);
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesCorrupted,
    checkDBFilesDefault,
};
