const { time } = require("./time.js");
const fs = require("fs");
const path = require("path");
const { get_logger } = require("./logger.js");

const load_skiplist = [];

function load_cog(client, cog) {
    if (cog.name && cog.execute) {
        // 新版
        const event_name = cog.name;
        const once = cog.once ?? false;
        if (once) client.once(event_name, cog.execute);
        else client.on(event_name, cog.execute);
    } else {
        console.warn(`[${time()}] 未找到 ${itemPath} 的 name 和 execute 屬性`);
        return 0;
    };
    return 1;
};

function processDirectory(client, dirPath) {
    const items = fs.readdirSync(dirPath).filter(item => !load_skiplist.includes(item));
    let loadedFiles = 0;
    const logger = get_logger(null, client );

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            loadedFiles += processDirectory(client, itemPath);
        } else if (item.endsWith('.js')) {
            delete require.cache[require.resolve(itemPath)];
            const cog = require(itemPath);
            const res = load_cog(client, cog);
            if (!res) continue;
            else logger.log(`${time()} cog ${item} 已加載`);

            loadedFiles++;
        };
    };

    return loadedFiles;
};

function load_cogs(client, reload = false) {
    try {
        const { cogsFolder } = require("./config.js");

        const totalFiles = processDirectory(client, cogsFolder);
        return [totalFiles, reload];
    } catch (error) {
        require("./senderr.js").senderr({
            client: null,
            msg: `加載程式碼(cogs)時出錯:\n${error.stack}`,
            clientready: false
        });
    };
};

module.exports = {
    load_cogs,
};