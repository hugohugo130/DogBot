const { get_logger } = require("./logger");

const logger = get_logger();

function checkEnvFile() {
    require("dotenv").config({ quiet: true });

    if (!process.env.TOKEN || process.env.TOKEN === "YOUR_BOT_TOKEN") {
        logger.error("無效的機器人 TOKEN");
        process.exit(1);
    };

    if (process.env.COOKIE && process.env.COOKIE === "YOUR_YOUTUBE_COOKIE_FOR_MUSIC") {
        logger.warn("無效的youtube cookie，留空或刪除行以停用音樂功能");
    };
};

checkEnvFile();