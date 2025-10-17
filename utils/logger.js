const winston = require('winston');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { time } = require('./time.js');
const config = require('./config.js');

// 全局管理器
const loggerManager = new Map();
const sendQueue = [];

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

// 自定義 Discord Transport
class DiscordTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'discord';
        this.client = opts.client;
        this.level = opts.level || 'warn'; // 默认只發送 warn 和 error
        this.channels = new Map();
        this._isReady = false;

        // 检查客户端状态
        if (this.client && this.client.isReady && this.client.isReady()) {
            this._isReady = true;
        } else if (this.client) {
            this.client.once('ready', () => {
                this._isReady = true;
                this._processQueue();
            });
        };
    };

    async _getChannel(level) {
        const channelId = CHANNEL_MAPPING[level];
        if (!this.channels.has(channelId)) {
            try {
                const channel = await this.client.channels.fetch(channelId);
                this.channels.set(channelId, channel);
            } catch (error) {
                console.error(`Failed to fetch channel ${channelId}:`, error);
                return null;
            };
        };
        return this.channels.get(channelId);
    };

    _truncateContent(content, maxLength = 1000) {
        if (content.length <= maxLength) return content;
        return '...' + content.slice(-(maxLength - 3));
    };

    async _sendToDiscord(info) {
        try {
            const channel = await this._getChannel(info.level);
            if (!channel) {
                console.warn(`Channel for level ${info.level} not found`);
                return;
            }

            const moduleName = info.module || 'unknown';
            let description = info.message;

            // 處理錯誤堆栈
            if (info.stack) {
                description = `\`\`\`${this._truncateContent(info.stack, 984)}\`\`\``;
            } else if (info.message && info.message.length > 100) {
                description = `\`\`\`${this._truncateContent(info.message, 984)}\`\`\``;
            } else {
                description = `\`\`\`${info.message}\`\`\``;
            }

            const embed = new EmbedBuilder()
                .setTitle(`${info.level.toUpperCase()} - ${moduleName}`)
                .setDescription(description)
                .setColor(LEVEL_COLORS[info.level] || 0x000000)
                .setTimestamp(info.timestamp);

            await channel.send({
                embeds: [embed],
                flags: MessageFlags.SuppressNotifications
            });
        } catch (error) {
            console.error('Failed to send log to Discord:', error);
        };
    };

    async _processQueue() {
        while (sendQueue.length > 0) {
            const info = sendQueue.shift();
            await this._sendToDiscord(info);
        };
    };

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // 只在特定級別發送到 Discord
        if (!['error', 'warn'].includes(info.level)) {
            return callback();
        };

        // 如果客户端未就緒，加入隊列
        if (!this._isReady) {
            sendQueue.push(info);
        } else {
            this._sendToDiscord(info).finally(() => callback());
        };

        return true;
    };
};

// 自定義控制台格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, module }) => {
        const formattedTime = time(new Date(timestamp));
        return `[${formattedTime}][${module}] - ${level.toUpperCase()} - ${message}`;
    })
);

function getCallerModuleName(depth = 4) {
    let res;
    try {
        const err = new Error();
        const stackLines = err.stack.split('\n');
        const callerLine = stackLines[depth] || stackLines[stackLines.length - 1];

        const match = callerLine.match(/\((.*):\d+:\d+\)$/) ||
            callerLine.match(/(.*):\d+:\d+$/);

        if (match) {
            const fullPath = match[1];
            const fileName = fullPath.split(/[\\/]/).pop();
            return fileName.replace('.js', '');
        }
    } catch {
        res = 'unknown'
    };
    res = 'unknown';
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

// 主 logger 函數
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

    const {
        name = getCallerModuleName(4),
        client = null,
    } = options;

    // 返回已存在的 logger
    if (loggerManager.has(name)) {
        return loggerManager.get(name);
    }

    // 創建 transports
    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug' // 控制台显示所有級別
        })
    ];

    // 如果有 Discord client，添加 Discord transport
    if (client) {
        transports.push(new DiscordTransport({
            client,
        }));
    }

    // 創建 logger
    const logger = winston.createLogger({
        level: "debug",
        format: winston.format.combine(
            winston.format.errors({ stack: true }), // 捕获錯誤堆栈
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
    // 如果隊列中有消息且提供了 client，創建臨時 logger 處理
    if (sendQueue.length > 0 && client) {
        const tempLogger = get_logger({ name: 'queue-processor', client });

        for (const info of sendQueue) {
            // 重新記錄這些訊息
            tempLogger.log(info);
        };

        // 清空隊列
        sendQueue.length = 0;
    };
};

async function shutdown() {
    for (const [name, logger] of loggerManager) {
        logger.end(() => {
            console.log(`Logger ${name} closed`);
        });
    };

    // 等待所有傳輸完成
    await new Promise(resolve => setTimeout(resolve, 1000));
};

module.exports = {
    get_logger,
    process_send_queue,
    shutdown,
    DiscordTransport
};