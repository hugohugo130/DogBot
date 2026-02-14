const util = require("util");
const { Events, Message } = require("discord.js");

const { get_logger } = require("../utils/logger.js");
const { get_loophole_embed } = require("../utils/rpg.js");
const { embed_default_color } = require("../utils/config.js");
const DogClient = require("../utils/customs/client.js");
const EmbedBuilder = require("../utils/customs/embedBuilder.js");

const logger = get_logger();

module.exports = {
    name: Events.MessageCreate,
    /**
     *
     * @param {DogClient} client
     * @param {Message} message
     */
    execute: async function (client, message) {
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
                .setEmbedAuthor();

            const responseData = { embeds: [InfoEmbed] };
            if ('send' in message.channel) await message.channel.send(responseData);
            else if (message.reply) await message.reply(responseData);
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });
            if (errorStack.includes("Missing Access")) return;

            logger.error(`處理訊息時錯誤: ${errorStack}`);
            await message.reply({ embeds: await get_loophole_embed(errorStack, null, client) });
        };
    },
}
