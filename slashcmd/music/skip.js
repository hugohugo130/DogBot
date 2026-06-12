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
    embed_default_color,
} from "../../utils/config.js";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

/** @type {import("../../utils/types.js").Slash<["guild"]>} */
export const skipSlash = {
    builder: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song")
        .setNameLocalizations({
            "zh-TW": "跳過",
            "zh-CN": "跳过"
        })
        .setDescriptionLocalizations({
            "zh-TW": "跳過正在播放的音樂",
            "zh-CN": "跳过正在播放的音乐"
        }),
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

        const queue = getQueue(interaction.guild.id, true);

        const [clientMember, notPlayingEmbed, [emoji_cross, emoji_skip]] = await Promise.all([
            get_me(interaction.guild),
            noMusicIsPlayingEmbed(queue, interaction, client),
            get_emojis(["crosS", "skip"], client),
        ]);

        if (clientMember?.voice?.channelId && clientMember.voice.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue?.connection?.joinConfig.channelId || queue?.voiceChannel?.id}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed] });
        };

        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const skippedTrack = queue.currentTrack;
        if (!skippedTrack) return;

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_skip} | 跳過 \`${skippedTrack.title}\``)
            .setEmbedFooter(interaction);

        await Promise.all([
            queue.nextTrack(),
            interaction.reply({ embeds: [embed] }),
        ]);
    },
};