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
 * @param { { [s: string]: any } | ArrayLike<any> } module
 * @returns {import("./types").ContextMenu | null}
 */
function findContextMenuFromModule(module) {
    for (const exp of Object.values(module)) {
        if (
            exp &&
            typeof exp === "object" &&
            "builder" in exp &&
            "execute" in exp
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
export async function loadslashcmd(bot = true) {
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

/**
 * @overload
 * @param {true} returnArray
 * @returns {Promise<any[]>}
 *
 * @overload
 * @param {false} returnArray
 * @returns {Promise<Collection<string, import("./types").ContextMenu>>}
 *
 * @param {boolean} [returnArray=false]
 * @returns {Promise<any[] | Collection<string, import("./types").ContextMenu>>}
 */
export async function get_context_menus(returnArray = false) {
    /** @type {import("discord.js").RESTPostAPIContextMenuApplicationCommandsJSONBody[] | Collection<string, import("./types").ContextMenu>} */
    const context_menus = returnArray ? [] : new Collection();
    const dirpath = path.join(process.cwd(), "context_menus");

    const context_menu_files = (await readdir(dirpath, {
        encoding: "utf-8",
        recursive: true,
    })).filter(file => [".js", ".ts"].some(extension => file.endsWith(extension)));

    for (const file of context_menu_files) {
        const data = await import(pathToFileURL(path.join(dirpath, file)).href);

        const context_menu = findContextMenuFromModule(data);

        if (!context_menu || !["builder", "execute"].every(key => key in context_menu)) continue;

        if (Array.isArray(context_menus))
            context_menus.push(context_menu.builder.toJSON());
        else
            context_menus.set(context_menu.builder.name, context_menu);
    };

    return context_menus;
};
