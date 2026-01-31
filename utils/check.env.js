const { get_logger } = require("./logger");

const logger = get_logger();

function checkEnvFile() {
    require("node:process").loadEnvFile();

    if (!process.env.TOKEN || process.env.TOKEN === "YOUR_BOT_TOKEN") {
        logger.error("無效的機器人 TOKEN");
        process.exit(1);
    };
};

checkEnvFile();