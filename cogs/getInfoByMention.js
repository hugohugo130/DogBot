import util from "node:util";
import {
    Events,
    Message,
} from "discord.js";

import {
    get_logger,
} from "../utils/logger.js";
import {
    get_loophole_embed,
} from "../utils/rpg.js";
import {
    embed_default_color,
} from "../utils/config.js";
import DogClient from "../utils/customs/client.js";
import EmbedBuilder from "../utils/customs/embedBuilder.js";

const logger = get_logger();

const name = Events.MessageCreate;

/**
 *
 * @param {DogClient} client
 * @param {Message} message
 */
const execute = async function (client, message) {
    try {
        if (message.content.trim().toLowerCase() !== `<@${client.user?.id}>`) return;

        const InfoEmbed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setDescription(`
**${client.name}**
🐶 我是一隻狗狗，我會在伺服器裡為大家服務！

————————————

作者: happyhugoe
我又在 <t:${Math.floor((client.readyTimestamp || 0) / 1000)}:R> 的時候復活了！
哈狗使用discord.js做出這個機器人，但如果變熱門的話記憶體應該會炸掉吧
`)
            .setFooter({ text: `在 ${(await client.getAllGuilds()).length} 個伺服器裡為大家服務 :D` })
            .setEmbedAuthor(client);

        const responseData = { embeds: [InfoEmbed] };
        if ('send' in message.channel) await message.channel.send(responseData);
        else if (message.reply) await message.reply(responseData);
    } catch (err) {
        const errorStack = util.inspect(err, { depth: null });
        if (errorStack.includes("Missing Access")) return;

        logger.error(`處理訊息時錯誤: ${errorStack}`);
        await message.reply({ embeds: await get_loophole_embed(errorStack, null, client) });
    };
}

export { name, execute };