const { readJson, writeJson, existsSync, join, basename } = require("./file.js");
const { database_folder, DATABASE_FILES, DEFAULT_VALUES, priorityUserIDs, priorityGuildIDs } = require("./config.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready, client_ready } = require("./wait_until_ready.js");

const logger = get_logger();

async function checkDBFilesExists() {
    for (let file of DATABASE_FILES) {
        file = basename(file);
        const defaultValue = DEFAULT_VALUES?.single?.[file] || {};

        const filePath = join(database_folder, file);
        if (!existsSync(filePath) && defaultValue) {
            const default_value = await writeJson(filePath, defaultValue);
            logger.warn(`資料庫檔案 ${file} 不存在，已建立 (預設值為: ${default_value})`);
        };
    };
};

/**
 * @warning run this before client.login may block forever
 * @param {object} client 
 * @returns {Promise<void>}
 */
async function checkDBFilesDefault(client) {
    const user_files = DEFAULT_VALUES.user;
    const guild_files = DEFAULT_VALUES.guild;

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

    const users = (await Promise.all(guilds.map(guild => guild.members.fetch())))
        .flatMap(members => [...members.values()])
        .map(member => member.user)
        .sort((a, b) => {
            if (a.id.includes(priorityUserIDs)) return -1;
            if (b.id.includes(priorityUserIDs)) return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    for (const [file, default_value] of Object.entries(user_files)) {
        let modified = false;
        const filePath = join(database_folder, file);
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
        const filePath = join(database_folder, file);
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
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesDefault,
};