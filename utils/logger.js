const winston = require('winston');
const { EmbedBuilder, MessageFlags } = require('discord.js');
const { wait_until_ready } = require('./wait_until_ready.js');
const { time } = require('./time.js');
const config = require('./config.js');

// 全局管理器
const loggerManager = new Map();
const sendQueue = [];

// 颜色映射
const LEVEL_COLORS = {
    error: 0xEC0C25,
    warn: 0xFFCC00,
    info: 0x0099FF,
    debug: 0x808080,
    verbose: 0x800080
};

// 频道映射
const CHANNEL_MAPPING = {
    error: config.error_channel_id,
    warn: config.warn_channel_id,
    info: config.log_channel_id,
    debug: config.log_channel_id,
    verbose: config.log_channel_id
};

// 自定义 Discord Transport
class DiscordTransport extends winston.Transport {
    constructor(opts) {
        super(opts);
        this.name = 'discord';
        this.client = opts.client;
        this.level = opts.level || 'warn'; // 默认只发送 warn 和 error
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
        }
    }

    async _getChannel(level) {
        const channelId = CHANNEL_MAPPING[level];
        if (!this.channels.has(channelId)) {
            try {
                const channel = await this.client.channels.fetch(channelId);
                this.channels.set(channelId, channel);
            } catch (error) {
                console.error(`Failed to fetch channel ${channelId}:`, error);
                return null;
            }
        }
        return this.channels.get(channelId);
    }

    _truncateContent(content, maxLength = 1000) {
        if (content.length <= maxLength) return content;
        return '...' + content.slice(-(maxLength - 3));
    }

    async _sendToDiscord(info) {
        try {
            const channel = await this._getChannel(info.level);
            if (!channel) {
                console.warn(`Channel for level ${info.level} not found`);
                return;
            }

            const moduleName = info.module || 'unknown';
            let description = info.message;
            
            // 处理错误堆栈
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
        }
    }

    async _processQueue() {
        while (sendQueue.length > 0) {
            const info = sendQueue.shift();
            await this._sendToDiscord(info);
        }
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        // 只在特定级别发送到 Discord
        if (!['error', 'warn'].includes(info.level)) {
            return callback();
        }

        // 如果客户端未就绪，加入队列
        if (!this._isReady) {
            sendQueue.push(info);
        } else {
            this._sendToDiscord(info).finally(() => callback());
        }

        return true;
    }
}

// 自定义控制台格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, module }) => {
        const formattedTime = time(new Date(timestamp));
        return `[${formattedTime}][${module}] - ${level.toUpperCase()} - ${message}`;
    })
);

// 获取调用者模块名（保持你的原有逻辑）
function getCallerModuleName(depth = 4) {
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
        // 忽略错误
    }
    return 'unknown';
}

// 主 logger 函数
function get_logger(options = {}) {
    // 处理参数
    if (typeof options === 'string') {
        options = { name: options };
    } else if (typeof options === 'object' && !options.name) {
        console.warn('Deprecated: Using object without name property');
    }
    
    const {
        name = getCallerModuleName(4),
        client = null,
        level = 'info'
    } = options;

    // 返回已存在的 logger
    if (loggerManager.has(name)) {
        return loggerManager.get(name);
    }

    // 创建 transports
    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug' // 控制台显示所有级别
        })
    ];

    // 如果有 Discord client，添加 Discord transport
    if (client) {
        transports.push(new DiscordTransport({
            client,
            level: 'info'
        }));
    }

    // 创建 logger
    const logger = winston.createLogger({
        level: level,
        format: winston.format.combine(
            winston.format.errors({ stack: true }), // 捕获错误堆栈
            winston.format.timestamp(),
            winston.format.json()
        ),
        defaultMeta: { module: name },
        transports: transports
    });

    // 存储 logger
    loggerManager.set(name, logger);

    return logger;
}

// 处理发送队列
async function process_send_queue(client) {
    // 如果队列中有消息且提供了 client，创建临时 logger 处理
    if (sendQueue.length > 0 && client) {
        const tempLogger = get_logger({ name: 'queue-processor', client });
        
        for (const info of sendQueue) {
            // 重新记录这些消息
            tempLogger.log(info);
        }
        
        // 清空队列
        sendQueue.length = 0;
    }
}

// 优雅关闭
async function shutdown() {
    for (const [name, logger] of loggerManager) {
        logger.end(() => {
            console.log(`Logger ${name} closed`);
        });
    }
    
    // 等待所有传输完成
    await new Promise(resolve => setTimeout(resolve, 1000));
}

module.exports = {
    get_logger,
    process_send_queue,
    shutdown,
    DiscordTransport
};