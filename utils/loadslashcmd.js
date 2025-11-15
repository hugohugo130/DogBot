const { Collection } = require("discord.js");
const fs = require('fs');
const path = require('node:path');

const { readdirSync } = require("./file.js");
const { get_logger } = require("./logger.js");

const logger = get_logger();

function processDirectory(bot, dirPath) {
    const commands = bot ? new Collection() : [];
    const items = readdirSync(dirPath);

    for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            const subCommands = processDirectory(bot, itemPath);

            if (bot) {
                for (const [name, command] of subCommands) {
                    commands.set(name, command);
                }
            } else {
                commands.push(...subCommands);
            };
        } else if (item.endsWith('.js')) {
            delete require.cache[require.resolve(itemPath)];
            const command = require(itemPath);
            if ('data' in command && 'execute' in command) {
                if (bot) {
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
    const commandsPath = path.join(process.cwd(), 'slashcmd');

    const commands = processDirectory(bot, commandsPath);
    return commands;
};

module.exports = {
    loadslashcmd,
};
