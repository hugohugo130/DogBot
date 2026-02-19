const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

const { readdirSync } = require("./file.js");
const { get_logger } = require("./logger.js");

const logger = get_logger();

/**
 * Process a command directory
 * @param {boolean} bot
 * @param {string} dirPath
 * @returns {Collection<string, any> | any[]}
 */
function processDirectory(bot, dirPath) {
    /** @type {Collection<string, any> | any[]} */
    const commands = bot ? new Collection() : [];

    const items = readdirSync(dirPath, {
        encoding: "utf-8",
    });

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            const subCommands = processDirectory(bot, itemPath);

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
 * 
 * @param {boolean} bot true返回collection, false返回array
 * @returns {Collection<string, any> | any[]}
 */
function loadslashcmd(bot) {
    if (!bot) return loadslashcmd_array();

    const commandsPath = path.join(process.cwd(), "slashcmd");

    const commands = processDirectory(bot, commandsPath);
    return commands;
};

/**
 *
 * @returns {any[]}
 */
function loadslashcmd_array() {
    const commandsPath = path.join(process.cwd(), "slashcmd");

    const commands = processDirectory(false, commandsPath);
    return Array.from(commands);
};

module.exports = {
    loadslashcmd,
};
