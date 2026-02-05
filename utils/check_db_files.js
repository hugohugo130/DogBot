const { User, Guild } = require("discord.js");

const { DATABASE_FILES, DEFAULT_VALUES, priorityUserIDs, priorityGuildIDs } = require("./config.js");
const { readJson, writeJson, exists, basename, join_db_folder, load_rpg_data, save_rpg_data, loadData, saveData } = require("./file.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready, client_ready } = require("./wait_until_ready.js");
const DogClient = require("./customs/client.js");

const logger = get_logger();
const logger_nodc = get_logger({ nodc: true });

async function checkDBFilesExists() {
    for (let file of DATABASE_FILES) {
        file = basename(file);
        const defaultValue = DEFAULT_VALUES?.single?.[file] || {};

        const filePath = join_db_folder(file);
        if (!(exists(filePath)) && defaultValue) {
            const default_value = await writeJson(filePath, defaultValue);
            logger.warn(`資料庫檔案 ${file} 不存在，已建立 (預設值為: ${default_value})`);
        };
    };
};

async function checkDBFilesCorrupted() {
    let err = false;

    for (let file of DATABASE_FILES) {
        const filepath = join_db_folder(file);
        if (!(await exists(filepath))) continue;

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
        if (!user instanceof User) continue;

        const rpg_data = await load_rpg_data(user.id);
        let modified = false;

        // #region [2025 12 02]
        /*
        2025 12 02:
        - 把db.count的mine, hew, herd, brew, fish, fell，合併成work，並刪除
        - 增加work鍵
        */
        // #endregion

        // #region [2025 12 02] [CODE]
        /*
        if (!rpg_data.count) {
            rpg_data.count = {};
            modified = true;
        };

        const keys = ["mine", "hew", "herd", "brew", "fish", "fell"];
        for (const key of keys) {
            if (!rpg_data.count.work) {
                rpg_data.count.work = 0
                modified = true;
            };

            if (typeof rpg_data.count.work === "string") {
                logger.warn(`[userId ${user.id}] rpg_data.count.work is string, converted to number: ${rpg_data.count.work}`);

                rpg_data.count.work = parseInt(rpg_data.count.work);
                modified = true;
            };

            if (rpg_data.count.work[key]) {
                if (typeof rpg_data.count.work[key] === "number") {
                    rpg_data.count.work += rpg_data.count.work[key];
                };

                delete rpg_data.count.work[key];
                modified = true;
            };
        };
        */
        // #endregion

        // #region [2026 01 21]
        /*
        2026 01 21:
        - feat: 每日簽到 (增加daily鍵)
        */
        // #endregion

        // #region [2026 01 21] [CODE]
        /*
        if (!rpg_data.daily && rpg_data.daily !== 0) {
            rpg_data.daily = 0;
            modified = true;
        };

        if (!rpg_data.daily_times && rpg_data.daily_times !== 0) {
            rpg_data.daily_times = 0;
            modified = true;
        };
        */
        // #endregion

        // #region [2026 01 25]
        /*
        2026 01 25:
        - feat: daily設定 (是否私訊)
        */
        // #endregion

        // #region [2026 01 25] [CODE]
        // if (!rpg_data.daily_msg && rpg_data.daily_msg !== false) {
        //     rpg_data.daily_msg = false;
        //     modified = true;
        // };
        // #endregion

        // =================================================================

        if (modified) await save_rpg_data(user.id, rpg_data);
    };

    for (const guild of guilds) {
        continue;
        if (!guild instanceof Guild) continue;

        /*
        2025 12 05:
        - 更好的自定義前綴(prefix)
        -> prefix: "&" -> prefix: ["&"]
        */

        /*
        const guild_data = await loadData(guild.id);

        const prefix = guild_data.prefix;
        if (typeof prefix === "string") {
            guild_data.prefix = [guild_data.prefix];
        };

        await saveData(guild.id, guild_data);
        */
    };
};

/**
 * @warning run this before client.login may block forever
 * @param {DogClient} client - The Discord Client
 * @returns {Promise<void>}
 */
async function checkDBFilesDefault(client) {
    logger.info("開始更新資料庫檔案 (用戶和伺服器的預設值)");
    const start_time = Date.now();

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
        if (!(exists(filePath))) continue;

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
        if (!(exists(filePath))) continue;

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

    logger.info(`資料庫檔案檢查完成, 耗時 ${Date.now() - start_time}ms`);
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesCorrupted,
    checkDBFilesDefault,
};
