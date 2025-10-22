const { EmbedBuilder, MessageFlags } = require('discord.js');
const winston = require('winston');
const path = require("path");

const { time } = require('./time.js');
const config = require('./config.js');
const { client_ready } = require('./wait_until_ready.js');

// 全局管理器
const loggerManager = new Map();
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
        this.client = opts.client;
        this.level = opts.level || 'info';
        this.levels = winston.config.npm.levels;
        this.channels = new Map();
        this._isReady = false;

        // 检查客户端状态
        if (client_ready(this.client)) {
            this._isReady = true;
        } else if (this.client) {
            this.client.once('ready', () => {
                this._isReady = true;
            });
        };
    };

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        if (DEBUG) console.debug(`[DEBUG] pushed info to sendQueue: ${JSON.stringify(info, null, 4)}`);
        global.sendQueue.push(info);

        if (callback && this.levels[info.level] <= this.levels[this.level]) callback();

        return true;
    };
};

// 自定義控制台格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, module }) => {
        return `${time()} [${path.basename(module, ".js")}] - ${level.toUpperCase()} - ${message.description ? `EMBED: ${message.description}` : message}`;
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
    // 處理參數
    if (typeof options === 'string') {
        console.warn(`[get_logger] [DEPRECATED] options use string instead of object, module ${getCallerModuleName(4)}`)
        options = { name: options };
    };

    let {
        name = getCallerModuleName(4),
        client = undefined,
    } = options;

    // 返回已存在的 logger
    if (loggerManager.has(name)) {
        return loggerManager.get(name);
    };

    if (DEBUG) console.debug(`[DEBUG] [get_logger] create logger, options: ${options}, call from ${getCallerModuleName(4)}`);

    // 創建 transports
    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug' // 控制台显示所有級別
        }),
        new DiscordTransport({
            client: (client ?? global._client),
        })
    ];

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
    loggerManager.set(name, logger);

    return logger;
};

// 處理發送隊列
async function process_send_queue(client) {
    while (global.sendQueue.length > 0) {
        const info = global.sendQueue[0];
        if (DEBUG) console.debug(`[DEBUG] [process_send_queue] handling send Queue ${JSON.stringify(info, null, 4)}`)

        try {
            const level = info.level.toUpperCase();
            const logger_name = info.module || 'unknown';
            let message = info.stack || info.message;
            const color = LEVEL_COLORS[info.level] || 0x000000;
            const channel_id = CHANNEL_MAPPING[info.level];
            const timestamp = Date.parse(info.timestamp);

            const channel = await client.channels.fetch(channel_id);
            if (!channel) {
                console.warn(`[WARN] channel id ${channel_id} not found, can't process send queue`);
                global.sendQueue.shift();
                continue;
            };

            if (message instanceof EmbedBuilder) {
                await send_msg(channel, null, null, null, null, timestamp, message);
            } else {
                if (message.length >= 1000) {
                    message = truncateContent(info.message, 1484);
                };

                await send_msg(channel, level, color, logger_name, message, timestamp);
            };

            client.last_send_log = message.description || message;
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
    process_send_queue,
    shutdown,
};
