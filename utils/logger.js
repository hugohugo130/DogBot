import path from "path";
import Transport from "winston-transport";
import winston from "winston";
import {
    pathToFileURL,
} from "node:url";
import {
    EmbedBuilder as djsEmbedBuilder,
    MessageFlags,
    Embed,
    escapeMarkdown,
} from "discord.js";

import {
    error_channel_id,
    warn_channel_id,
    log_channel_id,
    dc_send_ignore_keywords,
    backend_channel_id,
    console_ignore_keywords,
} from "./config.js";
import {
    time2,
} from "./time.js";
import {
    get_channel,
} from "./discord.js";
import DogClient from "./customs/client.js";

// 全局管理器
/** @type {Map<string, winston.Logger>} */
const loggerManager = new Map();
/** @type {Map<string, winston.Logger>} */
const loggerManager_log = new Map();
/** @type {Map<string, winston.Logger>} */
const loggerManager_nodc = new Map();

const DEBUG = false;

// 顏色映射
/** @type {{ [k: string]: number }} */
const LEVEL_COLORS = {
    error: 0xEC0C25,
    warn: 0xFFCC00,
    info: 0x0099FF,
    debug: 0x808080,
    verbose: 0x800080
};

// 頻道映射
/** @type {{ [k: string]: string }} */
const CHANNEL_MAPPING = {
    error: error_channel_id,
    warn: warn_channel_id,
    info: log_channel_id,
    debug: log_channel_id,
    verbose: log_channel_id
};

/**
 *
 * @param {any[]} array
 * @returns {boolean}
 */
const any = (array) => array.some(e => !!e);

/**
 * Split string by length
 * @param {string} text
 * @param {number} maxLength
 * @returns {string[]}
 */
function splitStringByLength(text, maxLength = 3900) {
    const result = [];
    for (let i = 0; i < text.length; i += maxLength) {
        result.push(text.slice(i, i + maxLength));
    };

    return result;
};

// 自定義 Discord Transport
class DiscordTransport extends Transport {
    /**
     * @param {import("winston-transport").TransportStreamOptions} [opts]
     */
    constructor(opts) {
        super(opts);
        this.name = "discord";
        this.level = opts?.level || "info";
        this.levels = winston.config.npm.levels;
    };

    /**
     * @param {any} info
     * @param {() => void} [callback]
     * @returns {any}
     */
    log(info, callback) {
        setImmediate(() => {
            this.emit("logged", info);
        });

        if (DEBUG) console.debug(`[DEBUG] [DiscordTransport] pushed info to sendQueue: ${JSON.stringify(info, null, 4)}`);

        // 如果message含有config.dc_send_ignore_keywords中任何一個關鍵字，則不發送
        if (info.message && any(dc_send_ignore_keywords.map(keyword => info.message.includes(keyword)))) return;
        if (info.stack && any(dc_send_ignore_keywords.map(keyword => info.stack.includes(keyword)))) return;

        if (global.sendQueue) global.sendQueue.push(info);

        if (callback && this.levels[info.level] <= this.levels[this.level]) callback();

        return true;
    };
};

// 自定義 Backend Transport
class BackendTransport extends Transport {
    /**
     * @param {import("winston-transport").TransportStreamOptions} [opts]
     */
    constructor(opts) {
        super(opts);
        this.name = "backend";
        this.level = opts?.level || "info";
        this.levels = winston.config.npm.levels;
        this.channel_id = backend_channel_id;
    };

    /**
     * @param {any} info
     * @param {() => void} [callback]
     * @returns {any}
     */
    log(info, callback) {
        setImmediate(() => {
            this.emit("logged", info);
        });

        // 設置 channel_id 到 info 物件
        info.channel_id = this.channel_id;

        if (DEBUG) console.debug(`[DEBUG] [BackendTransport] pushed info to sendQueue: ${JSON.stringify(info, null, 4)}`);
        if (global.sendQueue) global.sendQueue.push(info);

        if (callback && this.levels[info.level] <= this.levels[this.level]) callback();

        return true;
    };
};

// 自定義控制台格式
const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
        if (
            (
                info.message &&
                typeof info.message === "object" &&
                "data" in info.message
            ) || (
                console_ignore_keywords.filter((keyword) => {
                    try {
                        let msg = String(info.stack || info.message);

                        return msg.includes(keyword);
                    } catch { return false; }
                }).length
            )
        ) {
            return false; // 返回 false 表示過濾掉此日誌
        };

        return info;
    })(),
    winston.format.printf(({ timestamp, level, message, module }) => {
        return `${time2()} [${path.basename(String(module), ".js")}] - ${level.toUpperCase()} - ${message}`;
    }),
);

/**
 * 
 * @param {any} channel
 * @param {string} level
 * @param {import('discord.js').ColorResolvable} color
 * @param {string} logger_name
 * @param {string} message
 * @param {number | null} [timestamp=null]
 * @returns {Promise<void>}
 */
async function send_msg(channel, level, color, logger_name, message, timestamp = null) {
    const { default: EmbedBuilder } = await import(new URL("./customs/embedBuilder.js", import.meta.url).href);

    message = message.replace("```", "");
    message = escapeMarkdown(message, {
        codeBlockContent: false,
        codeBlock: true,
    });

    const embeds = [];
    const messages = splitStringByLength(message, 4000);

    for (const msg of messages) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${level.toUpperCase()} - ${path.basename(logger_name, ".js")}`)
            .setDescription(`\`\`\`\n${msg}\n\`\`\``)
            .setTimestamp(timestamp);

        embeds.push(embed);
    };

    await channel.send({
        embeds,
        flags: MessageFlags.SuppressNotifications,
    });
    return;
};

/**
 * 取得呼叫者檔案資訊
 * @param {string[]} [skipURLs=[]] 額外要跳過的檔案 URL（例如 importModules 所在的檔案）
 * @returns {[string, string] | [null, null]} [檔案名稱, file:// URL]
 */
function getCallerFile(skipURLs = []) {
    /** @type {[null, null]} */
    const no_result = [null, null];

    // #region [method 1]

    const originalPrepareStackTrace = Error.prepareStackTrace;

    try {
        Error.prepareStackTrace = (err, stack) => stack; // Override to get stack frames

        const err = new Error();
        const stack = /** @type {NodeJS.CallSite[]} */ (/** @type {unknown} */ (err.stack));

        if (!stack) return no_result;

        const currentFileURL = import.meta.url;
        const skipSet = new Set([currentFileURL, ...skipURLs]);

        for (const callSite of stack) {
            const fileName = callSite.getFileName();
            if (!fileName) continue;

            const fileURL = fileName.startsWith("file://")
                ? fileName
                : pathToFileURL(fileName).href;

            if (skipSet.has(fileURL)) continue;

            // 第一個不同檔案即為呼叫者
            const callerFileURL = decodeURIComponent(fileURL); // 處理中文等編碼
            const fullPath = decodeURIComponent(new URL(callerFileURL).pathname);

            // Windows 路徑需移除開頭多餘的 '/'
            const normalizedPath = process.platform === 'win32'
                ? fullPath.slice(1)
                : fullPath;

            const callerFileName = path.basename(normalizedPath, '.js');

            return [callerFileName, callerFileURL];
        };
    } catch {
    } finally {
        Error.prepareStackTrace = originalPrepareStackTrace; // Restore original
    };

    // #endregion

    return no_result;
};

/**
 * Get the module name of the caller (who calls this function)
 * @overload
 * @param {"list"} mode
 * @returns {string[]}
 *
 * @overload
 * @param {"full" | "url" | null} [mode=1]
 * @param {string[]} [skipURLs=[]] 額外要跳過的檔案 URL
 * @returns {string}
 *
 * @param {any | "list" | "full" | "url" | null} [mode=1]
 * @param {string[]} [skipURLs=[]] 額外要跳過的檔案 URL
 * @returns {any}
 */
export function getCallerModuleName(mode = 1, skipURLs = []) {
    const unknown_word = "unknown";

    if (!mode) {
        return new Error().stack || unknown_word;
    };

    if (mode === "list") {
        const err = new Error();

        const callers = [];
        const stackLines = err.stack?.split("\n");
        if (!stackLines) return unknown_word;

        for (let i = 1; i < stackLines.length; i++) {
            const callerLine = stackLines[i];
            const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/) || callerLine.match(/(.*):(\d+):(\d+)$/);
            if (match) {
                const fullPath = match[1];
                const fileName = fullPath.split(/[\\/]/).pop() || unknown_word;
                const lineNumber = match[2];
                const columnNumber = match[3];
                callers.push(`${fileName.replace(".js", "")}:${lineNumber}:${columnNumber}`);
            };
        };

        return callers;
    };

    const [callerFile, callerFileURL] = getCallerFile(skipURLs);

    if (!callerFileURL) return callerFile;

    if (mode === "full") {
        // 回傳完整路徑（去掉 file:// 前綴，轉為系統路徑）
        const fullPath = decodeURIComponent(new URL(callerFileURL).pathname);
        // Windows 路徑需要去除開頭的 '/'
        return process.platform === 'win32' ? fullPath.slice(1) : fullPath;
    };

    if (mode === "url") {
        // 回傳完整的 file:// URL（含編碼）
        return decodeURIComponent(callerFileURL);
    };

    return callerFile;
};

/**
 * Get the logger instance for a file
 * @param {{ name?: string, backend?: boolean, nodc?: boolean }} [options={}]
 * @returns {winston.Logger}
 */
export function get_logger(options = {}) {
    let {
        name = getCallerModuleName(),
        backend = false,
        nodc = false,
    } = options;

    // 返回已存在的 logger
    if (backend) {
        const cached_logger = loggerManager_log.get(name);

        if (cached_logger) return cached_logger;
    } else if (nodc) {
        const cached_logger = loggerManager_nodc.get(name);

        if (cached_logger) return cached_logger;
    } else {
        const cached_logger = loggerManager.get(name);

        if (cached_logger) return cached_logger;
    };

    if (DEBUG) console.debug(`[DEBUG] [get_logger] create logger with backend=${backend}, nodc=${nodc}, name=${name}, call from ${getCallerModuleName(null)}`);

    // 創建 transports
    /** @type {winston.transport[]} */
    const transports = [
        new winston.transports.Console({
            format: consoleFormat,
            level: "debug" // 控制台显示所有級別
        }),
    ];

    if (!nodc) {
        transports.push(new DiscordTransport({
            level: "warn",
        }));
    };

    if (backend) {
        transports.length = 0;
        transports.push(new BackendTransport({
            level: "info",
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
        transports: transports,
    });

    // 儲存 logger
    if (backend) loggerManager_log.set(name, logger);
    else if (nodc) loggerManager_nodc.set(name, logger);
    else loggerManager.set(name, logger);

    return logger;
};

/**
 * 處理發送佇列
 */
export async function process_send_queue() {
    const { default: EmbedBuilder } = await import(new URL("./customs/embedBuilder.js", import.meta.url).href);

    if (!Array.isArray(global.sendQueue)) {
        global.sendQueue = [];
    };

    while (global.sendQueue.length > 0) {
        const info = global.sendQueue.shift();
        if (!info) continue;
        if (DEBUG) console.debug(`[DEBUG] [process_send_queue] handling send Queue ${JSON.stringify(info, null, 4)}`)

        try {
            const level = info.level ? info.level.toUpperCase() : "INFO";
            const logger_name = info.module || "unknown";
            const message = info.stack || info.message;
            const color = LEVEL_COLORS[info.level] || 0x000000;
            const channel_id = info.channel_id || CHANNEL_MAPPING[info.level];
            const timestamp = Date.parse(info.timestamp);

            const channel = await get_channel(channel_id);
            if (!channel?.isSendable()) {
                continue;
            };

            // 檢查 message 是否為 EmbedBuilder 實例
            if (
                message
                && (
                    (typeof message === "object" && message.data)
                    || message instanceof djsEmbedBuilder
                    || message instanceof EmbedBuilder
                    || message instanceof Embed
                )
            ) {
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
            } else {
                const send_messages = splitStringByLength(message, 4000);

                for (const msg of send_messages) {
                    if (!msg) continue;

                    await send_msg(channel, level, color, logger_name, msg, timestamp);
                };
            };
        } catch (error) {
            console.error("Failed to process queued message:", error);
        };
    };
};

/**
 * 關閉所有 logger
 * @param {boolean} [quiet]
 * @param {number} [wait]
 * @returns {Promise<void>}
 */
export async function shutdown(quiet = false, wait = 1000) {
    for (const [name, logger] of loggerManager) {
        logger.end(() => {
            if (!quiet) console.log(`Logger ${name} closed`);
        });
    };

    // 等待所有傳輸完成
    await new Promise(resolve => setTimeout(resolve, wait));
};
