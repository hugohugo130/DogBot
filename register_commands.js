const { REST, Routes } = require("discord.js");
const { BotID } = require("./utils/config.js");
const { loadslashcmd } = require("./utils/loadslashcmd.js");
require("dotenv").config({ quiet: true });

let commands = loadslashcmd(false);
const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`正在註冊${commands.length}個斜線指令...`);

        const data = await rest.put(
            Routes.applicationCommands(BotID),
            { body: commands },
        );

        console.log(`已註冊${data.length}個斜線指令!`);
    } catch (error) {
        console.error(error);
    };
})();