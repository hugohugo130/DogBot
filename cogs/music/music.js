const DogClient = require("../../utils/customs/client.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const util = require("node:util");
const { get_logger } = require("../../utils/logger.js");

const logger = get_logger();

async function onError(queue, error) {
    const { get_loophole_embed } = require("../../utils/rpg.js");

    const errorStack = util.inspect(error, { depth: null });

    logger.error(`[${queue.metadata.guild.name}] 播放音樂時發生錯誤: ${errorStack}`);

    await queue.metadata.channel.send({ embeds: await get_loophole_embed(errorStack) });
};

module.exports = {
    /**
     * 
     * @param {DogClient} client 
     */
    execute: async function (client) {
        // const { embed_default_color } = require("../../utils/config.js");

        // const player = client.player;
        // if (!player) return;

        // player.events.on("playerStart", async (queue, track) => {
        //     const embed = new EmbedBuilder()
        //         .setColor(embed_default_color)
        //         .setTitle(`🎵 | 正在播放`)
        //         .setDescription(`[${track.title}](${track.url})`)
        //         .setThumbnail(track.thumbnail)
        //         .setFooter({ text: `時長: ${track.duration}秒` })

        //     await queue.metadata.channel.send({ embeds: [embed] });
        // });

        // player.events.on("playerError", async (queue, error) => {
        //     await onError(queue, error);
        // });

        // player.events.on("error", async (queue, error) => {
        //     await onError(queue, error);
        // });
    },
}
