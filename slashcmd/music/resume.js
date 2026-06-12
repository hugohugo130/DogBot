import {
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";
import {
    getVoiceConnection,
} from "@discordjs/voice";

import {
    get_emojis,
} from "../../utils/rpg.js";
import {
    getQueue,
    noMusicIsPlayingEmbed,
    youHaveToJoinVC_Embed,
} from "../../utils/music/music.js";
import {
    embed_error_color,
} from "../../utils/config.js";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

/** @type {import("../../utils/types.js").Slash<["guild"]>} */
export const resumeSlash = {
    builder: new SlashCommandBuilder()
        .setName("resume")
        .setNameLocalizations({
            "zh-TW": "繼續播放",
            "zh-CN": "继续播放"
        })
        .setDescription("Resume music playback")
        .setDescriptionLocalizations({
            "zh-TW": "繼續音樂播放",
            "zh-CN": "继续音乐播放"
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

        const guildId = interaction.guild?.id;

        if (!voiceChannel || !guildId) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const queue = getQueue(guildId);
        const [[emoji_cross, emoji_pause, emoji_play], notPlayingEmbed] = await Promise.all([
            get_emojis(["crosS", "pause", "play"], client),
            noMusicIsPlayingEmbed(queue, interaction, client),
        ]);

        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const connection = getVoiceConnection(guildId);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue?.connection?.joinConfig.channelId || queue?.voiceChannel?.id}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        if (queue.isPaused()) {
            await Promise.all([
                queue.unpause(),
                interaction.reply(`${emoji_play} | 繼續播放`),
            ]);
        } else {
            await Promise.all([
                queue.pause(),
                interaction.reply(`${emoji_pause} | 暫停!`),
            ]);
        };
    },
};
