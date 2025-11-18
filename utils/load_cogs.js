const fs = require("fs");
const path = require("path");
const { get_logger } = require("./logger.js");

const load_skiplist = [];
const logger = get_logger();

function load_cog(client, cog, itemPath) {
    async function run_execute(...args) {
        try {
            await cog.execute(client, ...args);
        } catch (err) {
            logger.error(`執行 ${itemPath} 時發生錯誤: ${err.stack}`);
        };
    };

    if (cog.name && cog.execute) {
        const event_name = cog.name;
        const once = cog.once ?? false;
        if (once) client.once(event_name, run_execute);
        else client.on(event_name, run_execute);
    } else {
        logger.warn(`找不到 cog ${itemPath} 的 name 和 execute 屬性`);
        return 0;
    };

    return 1;
};

function processDirectory(client, dirPath) {
    const items = fs.readdirSync(dirPath).filter(item => !load_skiplist.includes(item));
    let loadedFiles = 0;
    const logger = get_logger({ client });

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            loadedFiles += processDirectory(client, itemPath);
        } else if (item.endsWith('.js')) {
            delete require.cache[require.resolve(itemPath)];
            const cog = require(itemPath);
            const res = load_cog(client, cog, itemPath);
            if (!res) continue;
            else logger.info(`cog ${item} 已加載`);

            loadedFiles++;
        };
    };

    return loadedFiles;
};

function load_cogs(client) {
    try {
        const { cogsFolder } = require("./config.js");

        const totalFiles = processDirectory(client, cogsFolder);
        return totalFiles;
    } catch (error) {
        logger.error(`加載程式碼(cogs)時出錯:\n${error.stack}`);
    };
};

module.exports = {
    load_cogs,
};