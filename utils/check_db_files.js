const { readJson, writeJson, existsSync, join } = require("./file.js");
const { database_folder, DATABASE_FILES, DEFAULT_VALUES } = require("./config.js");
const { get_logger } = require("./logger.js");
const { wait_until_ready } = require("./wait_until_ready.js");

const logger = get_logger({ name: "check_db_files" });

async function checkDBFilesExists() {
    for (const [file, defaultValue] of Object.entries(DATABASE_FILES)) {
        const filePath = join(database_folder, file);
        if (!existsSync(filePath)) {
            const default_value = await writeJson(filePath, defaultValue);
            console.warn(`資料庫檔案 ${file} 不存在，已建立 (預設值為: ${default_value})`);
        };
    };
};

/**
 * @warning run this before client.login may block forever
 * @param {object} client 
 * @returns {Promise<void>}
 */
async function checkDBFilesDefault(client) {
    const files = DEFAULT_VALUES.user;
    if (Object.keys(files).length === 0) return;

    wait_until_ready(client);

    const guildCollection = await client.guilds.fetch();
    const guildArray = [...guildCollection.values()];
    const guilds = await Promise.all(guildArray.map(guild => guild.fetch()));
    const users = (await Promise.all(guilds.map(guild => guild.members.fetch())))
        .flatMap(members => [...members.values()])
        .map(member => member.user)
        .sort((a, b) => {
            if (a.id === "898836485397180426") return -1;
            if (b.id === "898836485397180426") return 1;
            if (a.id.length !== b.id.length) return a.id.length - b.id.length;
            return a.id.localeCompare(b.id);
        });

    for (const [file, default_value] of Object.entries(files)) {
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
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesDefault,
};