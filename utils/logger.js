const { EmbedBuilder, MessageFlags } = require('discord.js');
const winston = require('winston');
const path = require("path");

const { time2 } = require('./time.js');
const config = require('./config.js');

// 全局管理器
const loggerManager = new Map();
const loggerManager_log = new Map();
global.sendQueue = [];

const DEBUG = false;

// 顏色映射
const LEVEL_COLORS = {
    error: 0xEC0C25,
    warn: 0xFFCC00,
    info: 0x0099FF,
    debug: 0x808080,
    verbose: 0x800080
};

// 頻道映射
const CHANNEL_MAPPING = {
    error: config.error_channel_id,
    warn: config.warn_channel_id,
    info: config.log_channel_id,
    debug: config.log_channel_id,
    verbose: config.log_channel_id
};


function truncateContent(content, maxLength = 1500) {
    if (content.length <= maxLength) return content;
    return '...' + content.slice(-(maxLength - 3));
};

// 自定義 Discord Transport
class DiscordTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'discord';
        this.level = opts.level || 'info';
        this.levels = winston.config.npm.levels;
    };

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        if (DEBUG) console.debug(`[DEBUG] [DiscordTransport] pushed info to sendQueue: ${JSON.stringify(info, null, 4)}`);
        global.sendQueue.push(info);

        if (callback && this.levels[info.level] <= this.levels[this.level]) callback();

        return true;
    };
};

// 自定義 Backend Transport
class BackendTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'backend';
        this.level = opts.level || 'info';
        this.levels = winston.config.npm.levels;
        this.channel_id = config.backend_channel_id;
    };

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // 設置 channel_id 到 info 物件
        info.channel_id = this.channel_id;

        if (DEBUG) console.debug(`[DEBUG] [BackendTransport] pushed info to sendQueue: ${JSON.stringify(info, null, 4)}`);
        global.sendQueue.push(info);

        if (callback && this.levels[info.level] <= this.levels[this.level]) callback();

        return true;
    };
};

// 自定義控制台格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
        if (info.message && typeof info.message === 'object' && info.message.data) {
            return false; // 返回 false 表示過濾掉此日誌
        };

        return info;
    })(),
    winston.format.printf(({ timestamp, level, message, module }) => {
        return `${time2()} [${path.basename(module, ".js")}] - ${level.toUpperCase()} - ${message}`;
    }),
);

async function send_msg(channel, level, color, logger_name, message, timestamp = null, embed = null) {
    if (message) message = message.replace("```", "");

    if (!embed) {
        embed = new EmbedBuilder()
            .setTitle(`${level.toUpperCase()} - ${path.basename(logger_name, ".js")}`)
            .setDescription(`\`\`\`\n${message}\n\`\`\``)
            .setColor(color);
    } else {
        embed.setColor(color);
    };

    if (timestamp) embed.setTimestamp(timestamp);

    return await channel.send({
        embeds: [embed],
        flags: MessageFlags.SuppressNotifications
    });
};

function getCallerModuleName(depth = 4) {
    let res = 'unknown';
    try {
        const err = new Error();
        const stackLines = err.stack.split('\n');
        const callerLine = stackLines[depth] || stackLines[stackLines.length - 1];

        const match = callerLine.match(/\((.*):\d+:\d+\)$/) ||
            callerLine.match(/(.*):\d+:\d+$/);

        if (match) {
            const fullPath = match[1];
            const fileName = fullPath.split(/[\\/]/).pop();
            res = fileName.replace('.js', '');
        }
    } catch {
        res = 'unknown'
    };

    if (res !== "unknown") {
        const originalPrepareStackTrace = Error.prepareStackTrace;
        let callerFile;

        try {
            const err = new Error();
            Error.prepareStackTrace = (err, stack) => stack; // Override to get stack frames
            const currentFile = err.stack.shift().getFileName(); // File where getCallerFile is defined

            while (err.stack.length) {
                callerFile = err.stack.shift().getFileName();
                if (currentFile !== callerFile) { // Find the first different file in the stack
                    break;
                }
            }
        } catch (e) {
            callerFile = "unknown"
        } finally {
            Error.prepareStackTrace = originalPrepareStackTrace; // Restore original
        };
        return callerFile;
    };
    return res;
}

/**
 * 
 * @param {{name: string, client: object}} options
 * @returns {winston.Logger}
 */
function get_logger(options = {}) {
    let {
        name = getCallerModuleName(4),
        client = undefined,
        backend = false,
    } = options;

    // 返回已存在的 logger (backend 和非 backend 的 logger 分開管理)
    if (backend) {
        if (loggerManager_log.has(name)) {
            return loggerManager_log.get(name);
        };
    } else {
        if (loggerManager.has(name)) {
            return loggerManager.get(name);
        };
    };

    if (client) console.warn(`[get_logger] [DEPRECATED] get logger from module ${name} gave client args, that's not needed`);

    if (DEBUG) console.debug(`[DEBUG] [get_logger] create logger with backend=${backend}, name=${name}, call from ${getCallerModuleName(4)}`);

    // 創建 transports
    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug' // 控制台显示所有級別
        }),
        new DiscordTransport({
            level: 'warn',
        })
    ];

    if (backend) {
        transports.length = 0;
        transports.push(new BackendTransport({
            level: 'info',
        }));
    };

    // 創建 logger
    const logger = winston.createLogger({
        level: "debug",
        format: winston.format.combine(
            winston.format.errors({ stack: true }), // 捕獲錯誤堆棧
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: { module: name },
        transports: transports
    });

    // 儲存 logger
    if (backend) loggerManager_log.set(name, logger);
    else loggerManager.set(name, logger);

    return logger;
};

// 處理發送隊列
async function process_send_queue(client) {
    while (global.sendQueue.length > 0) {
        const info = global.sendQueue[0];
        if (DEBUG) console.debug(`[DEBUG] [process_send_queue] handling send Queue ${JSON.stringify(info, null, 4)}`)

        try {
            const level = info.level ? info.level.toUpperCase() : 'INFO';
            const logger_name = info.module || 'unknown';
            let message = info.stack || info.message;
            const color = LEVEL_COLORS[info.level] || 0x000000;
            const channel_id = info.channel_id || CHANNEL_MAPPING[info.level];
            const timestamp = Date.parse(info.timestamp);

            const channel = await client.channels.fetch(channel_id);
            if (!channel) {
                console.warn(`[WARN] channel id ${channel_id} not found, can't process send queue`);
                global.sendQueue.shift();
                continue;
            };

            // 檢查 message 是否為 EmbedBuilder 實例
            if (message && typeof message === 'object' && message.data) {
                const embed = message;
                if (!embed.data.color) {
                    embed.setColor(color);
                };

                if (timestamp && !embed.data.timestamp) {
                    embed.setTimestamp(timestamp);
                };

                await channel.send({
                    embeds: [embed],
                    flags: MessageFlags.SuppressNotifications
                });
                client.last_send_log = embed.data.description || embed.data.title || 'embed';
            } else {
                if (message && message.length >= 1000) {
                    message = truncateContent(message, 1484);
                };

                await send_msg(channel, level, color, logger_name, message, timestamp);
                client.last_send_log = message;
            };

            global.sendQueue.shift();
        } catch (error) {
            console.error('Failed to process queued message:', error);
            global.sendQueue.shift();
        };
    };
};

/**
 * 
 * @param {boolean} quiet
 */
async function shutdown(quiet = false, wait = 1000) {
    for (const [name, logger] of loggerManager) {
        logger.end(() => {
            if (!quiet) console.log(`Logger ${name} closed`);
        });
    };

    // 等待所有傳輸完成
    await new Promise(resolve => setTimeout(resolve, wait));
};

module.exports = {
    get_logger,
    getCallerModuleName,
    process_send_queue,
    shutdown,
    loggerManager,
};
