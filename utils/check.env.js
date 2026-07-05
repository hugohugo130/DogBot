import {
    loadEnvFile,
} from "node:process";

import {
    get_logger,
} from "./logger.js";

const logger = get_logger();

function checkEnvFile() {
    loadEnvFile();

    if (!process.env.TOKEN || process.env.TOKEN === "YOUR_BOT_TOKEN") {
        logger.error("無效的機器人 TOKEN");
        process.exit(1);
    };
};

checkEnvFile();