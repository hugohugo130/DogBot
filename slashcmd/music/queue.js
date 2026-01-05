const { SlashCommandBuilder } = require("@discordjs/builders");
const { ChatInputCommandInteraction, SlashCommandSubcommandBuilder, MessageFlags } = require("discord.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder");
const DogClient = require("../../utils/customs/client");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setNameLocalizations({
            "zh-CN": "音乐队列",
            "zh-TW": "音樂佇列"
        })
        .setDescription("queue")
        .addSubcommand(new SlashCommandSubcommandBuilder() // list
            .setName("list")
            .setNameLocalizations({
                "zh-CN": "列表",
                "zh-TW": "列表"
            })
            .setDescription("get the music in queue")
            .setDescriptionLocalizations({
                "zh-CN": "查询队列中的音乐",
                "zh-TW": "查詢佇列中的音樂"
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // remove
            .setName("remove")
            .setNameLocalizations({
                "zh-CN": "移除",
                "zh-TW": "移除"
            })
            .setDescription("remove a music in queue")
            .setDescriptionLocalizations({
                "zh-CN": "移除一首歌曲",
                "zh-TW": "移除一首歌曲"
            })
            .addIntegerOption(option =>
                option.setName("song")
                    .setNameLocalizations({
                        "zh-CN": "歌曲",
                        "zh-TW": "歌曲"
                    })
                    .setDescription("the song position to remove")
                    .setDescriptionLocalizations({
                        "zh-CN": "要移除的歌曲位置",
                        "zh-TW": "要移除的歌曲位置"
                    })
                    .setMaxValue(1)
                    .setRequired(false),
            ),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client 
    */
    execute: async (interaction, client) => {
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue } = require("../../utils/music/music.js");
        const { formatMinutesSeconds } = require("../../utils/timestamp.js");
        const { embed_default_color, embed_error_color } = require("../../utils/config.js");

        await interaction.deferReply();

        const queue = getQueue(interaction.guildId);

        const [emoji_cross, emoji_playGrad, emoji_skip] = await get_emojis(["crosS", "playGrad", "skip"], client);

        // 檢查有沒有歌在佇列裡面
        if (!queue.isPlaying() && !queue?.tracks?.length) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 清單是空的`)
                .setEmbedFooter(interaction);

            return await interaction.editReply({ embeds: [error_embed] });
        };

        switch (interaction.options.getSubcommand(false)) {
            case "list":
                const currentTrack = queue.currentTrack;

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color);

                if (currentTrack) {
                    const queueString = queue.tracks.length ? queue.tracks
                        .slice(0, 25)
                        .map((track, index) => {
                            const duration = formatMinutesSeconds(track.duration);

                            return `\`${index + 1}.\` [${track.title}](<${track.url}>) - ${duration}`;
                        })
                        : "沒有音樂在佇列裡";

                    embed.setDescription(`
${emoji_playGrad} 正在播放
[${currentTrack.title}](<${currentTrack.url}>) - ${formatMinutesSeconds(currentTrack.duration)}
${emoji_skip} 播放佇列
${queueString}`);

                } else {
                    embed.setDescription(`${emoji_cross} | 清單是空的`);
                };

                embed.setFooter({ text: "第 1 / 1 頁" });

                return await interaction.editReply({ embeds: [embed] });
            case "remove":
                const index = (interaction.options.getInteger("song", false) ?? 1) - 1;

                const track = queue.tracks[index];
                if (!track) {
                    const error_embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 沒有這首歌`)
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ embeds: [error_embed] });
                };

                break;
        };
    },
};
