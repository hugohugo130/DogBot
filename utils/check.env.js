import {
    loadEnvFile,
} from "node:process";

import {
    get_logger,
} from "./logger.js";

const logger = get_logger();

const checks = {
    "TOKEN": ["YOUR_BOT_TOKEN", "無效的機器人 TOKEN"],
    "DATABASE_URL": ["postgresql://user:pass@host:5432/dogbot", "無效的資料庫連線 URL"],
};

function checkEnvFile() {
    loadEnvFile();

    for (const [key, [default_value, err_msg]] of Object.entries(checks)) {
        if (!process.env[key] || process.env[key] == default_value) {
            logger.error(err_msg);
            process.exit(1);
        };
    };
};

checkEnvFile();