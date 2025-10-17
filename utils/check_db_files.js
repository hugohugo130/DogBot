const { readJson, writeJson, existsSync, join } = require("./file.js");
const { database_folder, DATABASE_FILES, DEFAULT_VALUES } = require("./config.js");
const { get_logger } = require("./logger.js");

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

async function checkDBFilesDefault(client) {
    const files = DEFAULT_VALUES.user;
    if (Object.keys(files).length === 0) return;

    const guildCollection = await client.guilds.fetch();
    const guildArray = [...guildCollection.values()];
    const guilds = await Promise.all(guildArray.map(guild => guild.fetch()));
    const users = (await Promise.all(guilds.map(guild => guild.members.fetch())))
        .flatMap(members => [...members.values()])
        .map(member => member.user);

    for (const file of files) {
        let modified = false;
        const filePath = join(database_folder, file);
        const data = await readJson(filePath);
        const default_value = files[file]
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

        if (modified) await writeJson(filePath, file);
    };
};

module.exports = {
    checkDBFilesExists,
    checkDBFilesDefault,
};