import fsp from "fs/promises";
import path from "path";
import {
    pathToFileURL,
} from "node:url";
import {
    Collection,
} from "discord.js";

import {
    readdir,
} from "./file.js";
import {
    get_logger,
} from "./logger.js";

const DEBUG = false;

const logger = get_logger();

/**
 * 
 * @param { { [s: string]: any } | ArrayLike<any> } module
 * @returns {import("./types").Slash | null}
 */
function findSlashFromModule(module) {
    for (const exp of Object.values(module)) {
        if (
            exp &&
            typeof exp === "object" &&
            "builder" in exp &&
            ("execute" in exp || "subCommands" in exp)
        ) {
            return exp;
        };
    };

    return null;
};

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
            const module = await import(pathToFileURL(itemPath).href);

            let command = findSlashFromModule(module);

            if (DEBUG) logger.debug(`Loading: ${itemPath}`);

            if (command) {
                if (commands instanceof Collection) {
                    commands.set(command.builder.name, command);
                } else {
                    commands.push(command.builder.toJSON());
                };
            } else {
                logger.warn(`[警告] ${itemPath} 中的指令缺少必要的 "builder" 和 ("execute" 或 "subCommands") 屬性。`);
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

export {
    loadslashcmd,
};
