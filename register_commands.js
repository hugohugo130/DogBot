const { REST, Routes, Collection } = require("discord.js");
const { BotID } = require("./utils/config.js");
const { loadslashcmd } = require("./utils/loadslashcmd.js");
const { Logger } = require("winston");
const { get_logger } = require("./utils/logger.js");
const { should_register_cmd } = require("./utils/auto_register.js");

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
 * @returns {Promise<Collection>}
 */
async function registcmd(quiet = true, logger = false) {
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

        return commands;
    } catch (error) {
        _error(logger, error);
    };
};

if (require.main === module) {
    (async () => {
        const res = await should_register_cmd();
        console.log("should_register_cmd: " + res);
        const force = true;
        console.log(`force: ${true}`);
        if (res || force) await registcmd(false);
    })();
};

module.exports = {
    registcmd,
}