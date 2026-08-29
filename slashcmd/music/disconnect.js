import {
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";
import {
    getVoiceConnection,
} from "@discordjs/voice";

import {
    get_emoji,
} from "../../utils/rpg.js";
import {
    get_channel,
} from "../../utils/discord.js";
import {
    getQueue,
    youHaveToJoinVC_Embed,
} from "../../utils/music/music.js";
import {
    embed_error_color,
} from "../../utils/config.ts";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

/** @type {import("../../utils/types").Slash<["guild"]>} */
export const disconnectSlash = {
    builder: new SlashCommandBuilder()
        .setName("disconnect")
        .setNameLocalizations({
            "zh-TW": "中斷連線",
            "zh-CN": "离开",
        })
        .setDescription("make the bot leave the voice channel")
        .setDescriptionLocalizations({
            "zh-TW": "讓機器人離開語音頻道",
            "zh-CN": "让机器人离开语音频道",
        }),
    allowedContext: ["guild"],
    stage: "beta",
    music: true,

    async execute(interaction, client) {
        const voiceChannel = (
            interaction.member
            && 'voice' in interaction.member
        )
            ? interaction.member.voice?.channel
            : null;

        if (!voiceChannel) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const queue = getQueue(interaction.guild.id);
        const emoji_cross = await get_emoji("crosS", client);

        const vconnection = getVoiceConnection(interaction.guild.id);
        if (vconnection?.joinConfig.channelId) {
            if (!queue.connection) queue.connection = vconnection;

            if (!queue.voiceChannel) {
                const vchannel = await get_channel(vconnection.joinConfig.channelId, interaction.guild);

                if (vchannel?.isVoiceBased()) queue.setVoiceChannel(vchannel);
            };
        };

        if (!queue.connection) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我不在一個語音頻道`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (queue.voiceChannel?.id && queue.voiceChannel?.id !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue.voiceChannel?.id}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await Promise.all([
            queue.destroy(),
            interaction.reply(`👋 | 掰掰`),
        ]);
    },
};