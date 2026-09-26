import {
    Events,
    Guild,
    Message,
    type SendableChannels,
} from "discord.js";

import {
    get_me,
} from "../utils/discord.js";
import {
    MockMessage,
    rpg_commands,
} from "./rpg/msg_handler.js";
import {
    get_logger,
} from "../utils/logger.js";
import DogClient from "../utils/customs/client.js";

const DEBUG = false;

export const name = Events.GuildCreate;
export const once = false;

export const execute = async function (
    client: DogClient,
    guild: Guild,
) {
    const logger = get_logger();
    if (DEBUG) logger.debug(`[${guild.id}] 偵測到被邀請了`);

    // 1. 嘗試使用 systemChannel
    let targetChannel: SendableChannels | undefined | null = guild.systemChannel;
    if (DEBUG) logger.debug(`[${guild.id}] systemChannel: ${targetChannel}`);

    // 2. 如果沒有設定 systemChannel 或者沒權限, 尋找第一個有權限、可以發送訊息的文字頻道
    const me = await get_me(guild);
    if (!targetChannel || !targetChannel.permissionsFor(me).has('SendMessages')) {
        targetChannel = guild.channels.cache.find((channel) => (
            channel.isTextBased()
            && channel.isSendable()
            && channel.permissionsFor(me).has('SendMessages')
        )) as SendableChannels;
    };
    if (DEBUG) logger.debug(`[${guild.id}] 最終channel: ${targetChannel}`);

    if (!targetChannel) return;

    if (DEBUG) logger.debug(`[${guild.id}] 嘗試執行help指令`);
    const message = new MockMessage(null, null, null, guild);
    const options = await rpg_commands.help[1]({
        client,
        message,
        args: [],
        mode: 1,
    });

    if (DEBUG) logger.debug(`[${guild.id}] 收到options: ${options}`);
    if (!options || options instanceof Message) return;
    await targetChannel.send(options);
};