const { readJson, writeJson, existsSync, basename, join_db_folder, load_rpg_data, save_rpg_data, loadData, saveData } = require("./file.js");
const { DATABASE_FILES, DEFAULT_VALUES, priorityUserIDs, priorityGuildIDs } = require("./config.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready, client_ready } = require("./wait_until_ready.js");
const { User, Guild } = require("discord.js");
const DogClient = require("./customs/client.js");

const logger = get_logger();
const logger_nodc = get_logger({ nodc: true });

async function checkDBFilesExists() {
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

    for (let file of DATABASE_FILES) {
        const filepath = join_db_folder(file);
        if (!existsSync(filepath)) continue;

        try {
            await readJson(filepath);
        } catch (err) {
            // 如果含有 "SyntaxError: Expected property name"，則警告並且退出程式
            if (err.message.includes("SyntaxError: Expected property name")) {
                logger_nodc.error(`資料庫檔案 ${file} 已損毀，請檢查檔案內容！`);
                err = true;
            } else throw err;
        };
    };

    if (err) process.exit(1);
};

/**
 * 
 * @param {Array<User>} users 
 * @param {Array<Guild>} guilds
 * @returns {Promise<void>}
 */
async function make_db_compatible(users, guilds) {
    for (const user of users) {
        continue;
        if (user instanceof User) {
            // const rpg_data = load_rpg_data(user.id);

            /*
            2025 12 02:
            - 把db.count的mine, hew, herd, brew, fish, fell，合併成work，並刪除
            - 增加work鍵
            */

            /*
            if (!rpg_data.count) rpg_data.count = {};

            const keys = ["mine", "hew", "herd", "brew", "fish", "fell"];
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
            */

            // =================================================================

            // save_rpg_data(user.id, rpg_data);
        };
    };

    for (const guild of guilds) {
        continue;
        if (guild instanceof Guild) {
            /*
            2025 12 05:
            - 更好的自定義前綴(prefix)
            -> prefix: "&" -> prefix: ["&"]
            */

            /*
            const guild_data = loadData(guild.id);

            const prefix = guild_data.prefix;
            if (typeof prefix === "string") {
                guild_data.prefix = [guild_data.prefix];
            };

            saveData(guild.id, guild_data);
            */
        };
    };
};

/**
 * @warning run this before client.login may block forever
 * @param {DogClient} client 
 * @returns {Promise<void>}
 */
async function checkDBFilesDefault(client) {
    logger.info("開始更新資料庫檔案 (用戶和伺服器的預設值)")

    const user_files = DEFAULT_VALUES.user;
    const guild_files = DEFAULT_VALUES.guild;

    if (!client_ready(client)) wait_until_ready(client);

    const guilds = (await client.getAllGuilds())
        .sort((a, b) => {
            if (a.id.includes(priorityGuildIDs)) return -1;
            if (b.id.includes(priorityGuildIDs)) return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    const users = (await client.getAllGuildMembers(true))
        .map(member => member.user)
        .sort((a, b) => {
            if (a.id.includes(priorityUserIDs)) return -1;
            if (b.id.includes(priorityUserIDs)) return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    for (const [file, default_value] of Object.entries(user_files)) {
        let modified = false;
        const filePath = join_db_folder(file);
        if (!existsSync(filePath)) continue;

        const data = await readJson(filePath);
        if (!default_value) {
            logger.warn(`警告：資料庫檔案 ${file} 缺失預設值，請及時補充。`);
            continue;
        };

        for (const user of users) {
            const userid = user.id;
            if (data[userid]) continue;
            data[userid] = default_value;
            modified = true;
        };

        if (modified) await writeJson(filePath, data);
    };

    for (const [file, default_value] of Object.entries(guild_files)) {
        let modified = false;
        const filePath = join_db_folder(file);
        if (!existsSync(filePath)) continue;

        const data = await readJson(filePath);
        if (!default_value) {
            logger.warn(`警告：資料庫檔案 ${file} 缺失預設值，請及時補充。`);
            continue;
        };

        for (const guild of guilds) {
            const guildID = guild.id;
            if (data[guildID]) continue;
            data[guildID] = default_value;
            modified = true;
        };

        if (modified) await writeJson(filePath, data);
    };

    await make_db_compatible(users, guilds);

    logger.info("資料庫檔案檢查完成");
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesCorrupted,
    checkDBFilesDefault,
};
