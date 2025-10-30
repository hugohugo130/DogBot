const { REST, Routes, Collection } = require("discord.js");
const { BotID } = require("./utils/config.js");
const { loadslashcmd } = require("./utils/loadslashcmd.js");
const { Logger } = require("winston");
const { get_logger } = require("./utils/logger.js");
const { should_register_cmd, update_cmd_hash } = require("./utils/auto_register.js");

function log(logger, message) {
    if (logger) logger.info(message);
    else console.log(message);
};

function _error(logger, message) {
    if (logger) logger.error(message);
    else console.error(message);
};

/**
 * 
 * @param {boolean} quiet 
 * @param {boolean | Logger} logger 
 * @param {boolean} updateHash 是否在註冊成功後更新 hash 文件
 * @returns {Promise<Collection>}
 */
async function registcmd(quiet = true, logger = false, updateHash = true) {
    require("dotenv").config({ quiet: true });

    if (logger === true) logger = get_logger();

    let commands = loadslashcmd();
    const rest = new REST().setToken(process.env.TOKEN);

    try {
        if (!quiet) log(logger, `正在註冊 ${commands.length} 個斜線指令...`);

        const data = await rest.put(
            Routes.applicationCommands(BotID),
            { body: commands },
        );

        if (!quiet) log(logger, `已註冊 ${data.length} 個斜線指令!`);

        // 註冊成功後更新 hash 文件
        if (updateHash) {
            await update_cmd_hash();
            if (!quiet) log(logger, "已更新命令 hash 文件");
        }

        return commands;
    } catch (error) {
        _error(logger, error);
        throw error;
    };
};

if (require.main === module) {
    (async () => {
        const res = await should_register_cmd();
        console.log("should_register_cmd: " + res);
        const force = false; // 改為 false，只在檢測到變化時註冊
        console.log(`force: ${force}`);
        if (res || force) {
            try {
                await registcmd(false, false, true); // 註冊成功後自動更新 hash
                console.log("命令註冊完成！");
            } catch (error) {
                console.error("命令註冊失敗，hash 文件未更新");
            }
        } else {
            console.log("無需註冊命令（無變化）");
        }
    })();
};

module.exports = {
    registcmd,
}
