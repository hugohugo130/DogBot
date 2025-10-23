const { REST, Routes } = require("discord.js");
const { BotID } = require("./utils/config.js");
const { loadslashcmd } = require("./utils/loadslashcmd.js");

function log(logger, message) {
    if (logger) logger.info(message);
    else console.log(message);
};

function _error(logger, message) {
    if (logger) logger.error(message);
    else console.error(message);
};

async function registcmd(quiet = true, logger = null) {
    require("dotenv").config({ quiet: true });

    let commands = loadslashcmd(false);
    const rest = new REST().setToken(process.env.TOKEN);

    try {
        if (!quiet) log(logger, `正在註冊${commands.length}個斜線指令...`);

        const data = await rest.put(
            Routes.applicationCommands(BotID),
            { body: commands },
        );

        if (!quiet) log(logger, `已註冊${data.length}個斜線指令!`);

        return commands;
    } catch (error) {
        _error(logger, error);
    };
};

if (require.main === module) {
    registcmd(false);
};

module.exports = {
    registcmd,
}