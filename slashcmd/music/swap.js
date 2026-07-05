import {
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";

import {
    get_emojis,
} from "../../utils/rpg.js";
import {
    getQueue,
    noMusicIsPlayingEmbed,
    youHaveToJoinVC_Embed,
} from "../../utils/music/music.js";
import {
    get_me,
} from "../../utils/discord.js";
import {
    embed_error_color,
} from "../../utils/config.js";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

/** @type {import("../../utils/types").Slash<["guild"]>} */
export const swapSlash = {
    builder: new SlashCommandBuilder()
        .setName("swap")
        .setDescription("Swap two songs in the music queue")
        .setNameLocalizations({
            "zh-TW": "替換",
            "zh-CN": "替换"
        })
        .setDescriptionLocalizations({
            "zh-TW": "替換音樂歌單兩首歌的位置",
            "zh-CN": "替换音乐歌单两首歌的位置"
        })
        .addIntegerOption(option => option // first
            .setName("first")
            .setNameLocalizations({
                "zh-TW": "第一首",
                "zh-CN": "第一首"
            })
            .setDescription("The index of the first song to swap")
            .setDescriptionLocalizations({
                "zh-TW": "第一首曲目的索引",
                "zh-CN": "第一首曲目的索引"
            })
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption(option => option // second
            .setName("second")
            .setNameLocalizations({
                "zh-TW": "第二首",
                "zh-CN": "第二首"
            })
            .setDescription("The index of the second song to swap")
            .setDescriptionLocalizations({
                "zh-TW": "第二首曲目的索引",
                "zh-CN": "第二首曲目的索引"
            })
            .setRequired(true)
            .setMinValue(1),
        ),
    allowedContext: ["guild"],
    stage: "beta",
    music: true,

    async execute(interaction, client) {
        const voiceChannel = (
            interaction.member
            && 'voice' in interaction.member
            && interaction.member.voice?.channel
            && "speakable" in interaction.member.voice?.channel
        )
            ? interaction.member.voice?.channel
            : null;

        if (!voiceChannel || !interaction.guild) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const queue = getQueue(interaction.guild.id);
        const [clientMember, notPlayingEmbed, [emoji_cross, emoji_loop]] = await Promise.all([
            get_me(interaction.guild),
            noMusicIsPlayingEmbed(queue, interaction, client),
            get_emojis(["crosS", "loop"], client),
        ]);

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue?.connection?.joinConfig.channelId || clientMember.voice.channelId}> 裡面`)
                    .setEmbedFooter(interaction);

                return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            };
        };

        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const first = interaction.options.getInteger("first", true);
        const second = interaction.options.getInteger("second", true);

        if (first === second) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 重複的索引`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        const firstTrack = queue.tracks[first - 1];
        const secondTrack = queue.tracks[second - 1];

        if (!firstTrack || !secondTrack) {
            const wrongTrack = !firstTrack ? "一" : "二"

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 未知的第${wrongTrack}首索引`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await Promise.all([
            queue.swapTracks(first - 1, second - 1),
            interaction.reply({ content: `${emoji_loop} 成功交換了兩首歌 \`${firstTrack.title}\` 和 \`${secondTrack.title}\`` }),
        ]);
    },
};