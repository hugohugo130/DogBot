const fsp = require("fs").promises;
const path = require("path");
const { Collection } = require("discord.js");

const { readdir } = require("./file.js");
const { get_logger } = require("./logger.js");

const logger = get_logger();

/**
 * Process a command directory
 * @param {boolean} bot
 * @param {string} dirPath
 * @returns {Promise<Collection<string, any> | any[]>}
 */
async function processDirectory(bot, dirPath) {
    /** @type {Collection<string, any> | any[]} */
    const commands = bot ? new Collection() : [];

    const items = (await readdir(dirPath, {
        encoding: "utf-8",
    }))

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = await fsp.stat(itemPath);

        if (stat.isDirectory()) {
            const subCommands = await processDirectory(bot, itemPath);

            if (commands instanceof Collection) {
                for (const [name, command] of subCommands) {
                    commands.set(name, command);
                };
            } else {
                commands.push(...subCommands);
            };
        } else if (item.endsWith(".js")) {
            delete require.cache[require.resolve(itemPath)];

            const command = require(itemPath);
            if ("data" in command && "execute" in command) {
                if (commands instanceof Collection) {
                    commands.set(command.data.name, command);
                } else {
                    commands.push(command.data.toJSON());
                };
            } else {
                logger.warn(`[警告] ${itemPath} 中的指令缺少必要的 "data" 和 "execute" 屬性。`);
            };
        };
    };

    return commands;
};

/**
 * @overload
 * @param {true} [bot=true] true返回collection, false返回array
 * @returns {Promise<Collection<string, any>>}
 *
 * @overload
 * @param {boolean} [bot=true] true返回collection, false返回array
 * @returns {Promise<Collection<string, any> | any[]>}
 *
 * @param {boolean} [bot=true] true返回collection, false返回array
 */
async function loadslashcmd(bot = true) {
    if (!bot) return await loadslashcmd_array();

    const commandsPath = path.join(process.cwd(), "slashcmd");

    const commands = await processDirectory(bot, commandsPath);
    return commands;
};

/**
 *
 * @returns {Promise<any[]>}
 */
async function loadslashcmd_array() {
    const commandsPath = path.join(process.cwd(), "slashcmd");

    const commands = await processDirectory(false, commandsPath);
    return Array.from(commands);
};

module.exports = {
    loadslashcmd,
};
