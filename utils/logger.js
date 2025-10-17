const { EmbedBuilder, MessageFlags } = require("discord.js");
const { wait_until_ready } = require("./wait_until_ready.js");
const { time } = require("./time.js");

global._loggers = {};
global._send_queue = [];
const year = new Date().getFullYear();

async function get_channel(client, id) {
    id = String(id);
    return client.channels.cache.get(id) || (await client.channels.fetch(id));
};

async function send_msg(channel, level, color, logger_name, message) {
    const embed = new EmbedBuilder()
        .setTitle(`${level} - ${logger_name}`)
        .setDescription(message)
        .setColor(color);

    return await channel.send({ embeds: [embed], flags: MessageFlags.SuppressNotifications})
};

class Console {
    constructor(name, client) {
        const { log_channel_id, warn_channel_id, error_channel_id } = require("./config.js");
        this.log_channel_id = log_channel_id;
        this.warn_channel_id = warn_channel_id;
        this.error_channel_id = error_channel_id;
        this.name = name;
        this.client = client;
    };


    beautifly_msg(msg) {
        if (!msg.includes(`[${year}`)) {
            msg = `${time()} ${msg}`;
        };

        if (!msg.includes("```")) {
            msg = `\`\`\`${msg}\`\`\``;
        };

        return msg;
    };

    log(message) {
        message = this.beautifly_msg(message);
        console.log(message.replaceAll("```", ""));
        const level = "INFO";
        const color = 0xFFFFFF;
        if (!this.client?.isReady()) {
            global._send_queue.push({
                name: this.name,
                message,
                level,
                color,
                channel: this.log_channel_id,
            });
        } else get_channel(this.client, this.log_channel_id).then(channel => {
            send_msg(channel, "INFO", 0xFFFFFF, this.name, message);
        });
    };

    warn(message) {
        message = this.beautifly_msg(message);
        console.warn(message.replaceAll("```", ""));
        const level = "WARN";
        const color = 0xFFCC00;
        if (!this.client) {
            global._send_queue.push({
                name: this.name,
                message,
                level,
                color,
                channel: this.warn_channel_id,
            });
        } else get_channel(this.client, this.warn_channel_id).then(channel => {
            send_msg(channel, "WARN", 0xFFCC00, this.name, message);
        });
    };

    error(message) {
        message = this.beautifly_msg(message);
        console.error(message.replaceAll("```", ""));
        const level = "ERROR";
        const color = 0xEC0C25;
        if (!this.client) {
            global._send_queue.push({
                name: this.name,
                message,
                level,
                color,
                channel: this.error_channel_id,
            });
        } else get_channel(this.client, this.error_channel_id).then(channel => {
            send_msg(channel, "ERROR", 0xEC0C25, this.name, message)
        });
    };
};

function getCallerModuleName(depth) {
    try {
        const err = new Error();
        const stackLines = err.stack.split('\n');
        // The caller's caller is typically the 4th line in the stack trace
        const callerLine = stackLines[depth - 1];
        if (!callerLine) return "unknown";

        // Extract the file path from the stack trace line
        const match = callerLine.match(/\((.*):\d+:\d+\)$/);
        if (!match) return "unknown";

        const fullPath = match[1];
        const parts = fullPath.split(/[\\/]/);
        const fileName = parts[parts.length - 1];
        return fileName.replace('.js', '');
    } catch {
        return "unknown";
    };
};

function get_logger({ name = null, client = null, depth = 4 }) {
    if (!name) name = getCallerModuleName(depth);
    if (name === "unknown") throw new Error("unknown caller");
    if (!client) {
        client = wait_until_ready();
    };

    if (global._loggers[name]) return global._loggers[name];

    const console2 = new Console(name, client);
    global._loggers[name] = console2;
    return console2
};

async function process_send_queue(client) {
    global._send_queue = global._send_queue.flat();
    while (global._send_queue.length > 0) {
        const data = global._send_queue[0];
        const { name, message, level, color, channel: channel_id } = data;
        const channel = await get_channel(client, channel_id);
        if (!channel) {
            get_logger({ client }).warn(`channel id ${channel_id} not found, can't process send queue`);
            global._send_queue.shift();
            continue;
        };
        await send_msg(channel, level, color, name, message);
        global._send_queue.shift();
    };
};

module.exports = {
    get_logger,
    process_send_queue,
};