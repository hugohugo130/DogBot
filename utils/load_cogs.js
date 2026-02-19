const fs = require("fs");
const path = require("path");
const util = require("util");

const { get_logger } = require("./logger.js");
const { cogsFolder } = require("./config.js");
const DogClient = require("./customs/client.js");

/** @type {string[]} */
const load_skiplist = [];
const logger = get_logger();

/**
 *
 * @param {DogClient} client
 * @param {any} cog
 * @param {string} itemPath
 * @returns {Promise<number>}
 */
async function load_cog(client, cog, itemPath) {
    /**
     *
     * @param  {...any} args
     * @returns
     */
    async function run_execute(...args) {
        try {
            await cog.execute(client, ...args);
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });
            if (errorStack.includes("Unknown Interaction")) return;

            logger.error(`執行 ${itemPath} 時發生錯誤: ${errorStack}`);
        };
    };

    if (cog.name && cog.execute) {
        const event_name = cog.name;
        const once = cog.once ?? false;

        if (once) client.once(event_name, run_execute);
        else client.on(event_name, run_execute);
    } else if (cog.execute) {
        await run_execute(client);
    } else {
        logger.warn(`找不到 cog ${itemPath} 的 name 和 execute 屬性`);
        return 0;
    };

    return 1;
};

/**
 *
 * @param {DogClient} client
 * @param {string} dirPath
 * @param {boolean} [quiet]
 * @returns {Promise<number>}
 */
async function processDirectory(client, dirPath, quiet = false) {
    const items = fs.readdirSync(dirPath, {
        encoding: "utf-8",
    }).filter(item => !load_skiplist.includes(item));

    let loadedFiles = 0;
    const logger = get_logger();

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            loadedFiles += await processDirectory(client, itemPath);
        } else if (item.endsWith(".js")) {
            try {
                delete require.cache[require.resolve(itemPath)];
                const cog = require(itemPath);

                const res = await load_cog(client, cog, itemPath);
                if (!res) continue;
                else if (!quiet) logger.info(`✅ Loaded ${item}`);

                loadedFiles++;
            } catch (err) {
                const errorStack = util.inspect(err, { depth: null });

                logger.error(`加載 ${itemPath} 時發生錯誤: ${errorStack}`);
                continue;
            };
        };
    };

    return loadedFiles;
};

/**
 *
 * @param {DogClient} client
 * @param {boolean} [quiet]
 * @returns {Promise<number>}
 */
async function load_cogs(client, quiet = false) {
    try {
        const totalFiles = await processDirectory(client, cogsFolder, quiet);
        return totalFiles;
    } catch (error) {
        const errorStack = util.inspect(error, { depth: null });

        logger.error(`加載程式碼(cogs)時出錯:\n${errorStack}`);
        return 0;
    };
};

module.exports = {
    load_cogs,
};