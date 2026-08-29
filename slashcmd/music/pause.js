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
} from "../../utils/config.ts";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

/** @type {import("../../utils/types").Slash<["guild"]>} */
export const pauseSlash = {
    builder: new SlashCommandBuilder()
        .setName("pause")
        .setNameLocalizations({
            "zh-TW": "暫停",
            "zh-CN": "暂停"
        })
        .setDescription("pause the music")
        .setDescriptionLocalizations({
            "zh-TW": "暫停音樂播放",
            "zh-CN": "暂停音乐播放"
        }),
    allowedContext: ["guild"],
    stage: "beta",
    music: true,

    async execute(interaction, client) {
        const guildId = interaction.guild?.id;
        if (!guildId) return;

        const voiceChannel = (
            interaction.member
            && 'voice' in interaction.member
            && interaction.member.voice?.channel
            && "speakable" in interaction.member.voice?.channel
        )
            ? interaction.member.voice?.channel
            : null;

        if (!voiceChannel) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const queue = getQueue(guildId, false);
        const [[emoji_cross, emoji_pause, emoji_play], notPlayingEmbed] = await Promise.all([
            get_emojis(["crosS", "pause", "play"], client),
            noMusicIsPlayingEmbed(queue, interaction, client),
        ]);

        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const textChannel = interaction.channel;
        if (queue && textChannel?.isSendable()) queue.setTextChannel(textChannel);

        const connection = getVoiceConnection(guildId);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue?.connection?.joinConfig.channelId || queue?.voiceChannel?.id}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        if (queue?.isPaused()) {
            await Promise.all([
                queue.unpause(),
                interaction.reply(`${emoji_play} | 繼續播放`),
            ]);
        } else {
            await Promise.all([
                queue?.pause(),
                interaction.reply(`${emoji_pause} | 暫停!`),
            ]);
        };
    },
};
