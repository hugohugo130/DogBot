import {
    loadEnvFile,
} from "node:process";
import {
    REST,
    Routes,
} from "discord.js";
import {
    Logger,
} from "winston";

import {
    BotID,
} from "./utils/config.ts";
import {
    get_context_menus,
    loadslashcmd,
} from "./utils/loadslashcmd.js";
import {
    get_logger,
} from "./utils/logger.js";
import {
    should_register_cmd,
    update_cmd_hash,
} from "./utils/auto_register.js";
import util from "util";

const args = process.argv.slice(2);
const isBeta = global.isBeta ?? args.includes("--beta");

global.isBeta = isBeta;

/**
 * Log something
 * @param {Logger | false | null} logger
 * @param {any} message - the message to be logged
 */
function log(logger, message) {
    if (logger) logger.info(message);
    else console.log(message);
};

/**
 * Log some errors
 * @param {Logger | false | null} logger
 * @param {any} message - the message of error to be logged
 */
function _error(logger, message) {
    if (logger) logger.error(message);
    else console.error(message);
};

/**
 * Register slash commands
 * @param {boolean} [quiet=true]
 * @param {boolean | Logger} [logger=false]
 * @param {boolean} [updateHash=true] 是否在註冊成功後更新 hash 文件
 * @param {boolean} [beta] 是否使用 beta bot
 * @returns {Promise<any[]>}
 */
async function registcmd(quiet = true, logger = false, updateHash = true, beta = isBeta) {
    loadEnvFile();

    const token_key = beta ? "BETA_TOKEN" : "TOKEN";
    const botID = BotID;

    if (!process.env[token_key]) throw new Error("no bot token provided in .env");
    if (!botID) throw new Error("no bot id provided");

    if (logger === true) logger = get_logger();

    const commands = [...Array.from(await loadslashcmd(false)), ...await get_context_menus(true)];
    const rest = new REST().setToken(process.env[token_key]);

    try {
        if (!quiet) log(logger, `正在註冊 ${commands.length} 個斜線指令和右鍵選單...`);

        const data = await rest.put(
            Routes.applicationCommands(botID),
            { body: commands },
        );

        if (!quiet) log(logger, `已註冊 ${Array.isArray(data) ? data.length : null} 個斜線指令和右鍵選單!`);

        // 註冊成功後更新 hash 文件
        if (updateHash) {
            await update_cmd_hash();
            if (!quiet) log(logger, "已更新命令 hash 文件");
        };

        return commands;
    } catch (error) {
        _error(logger, error);

        return [];
    };
};

if (import.meta.main) { // 等於 (require.main === module)
    (async () => {
        const res = await should_register_cmd();
        console.log("should_register_cmd: " + res);

        const force = args.includes("force");
        console.log(`force: ${force}`);

        const quiet = args.includes("quiet");
        console.log(`quiet: ${quiet}`);

        if (res || force) {
            try {
                await registcmd(quiet, false); // 註冊成功後自動更新 hash
                console.log("命令註冊完成！");
            } catch (error) {
                console.error(`命令註冊失敗，hash 文件未更新\n${util.inspect(error, { depth: null })}`);
            };
        } else {
            console.log("無需註冊命令");
        }
    })();
};

export {
    registcmd,
}
