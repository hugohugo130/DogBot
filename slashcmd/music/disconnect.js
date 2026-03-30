const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, VoiceChannel } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

const { get_emoji } = require("../../utils/rpg.js");
const { get_channel } = require("../../utils/discord.js");
const { getQueue, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
const { embed_error_color } = require("../../utils/config.js");
const DogClient = require("../../utils/customs/client.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("disconnect")
        .setDescription("make the bot leave the voice channel")
        .setNameLocalizations({
            "zh-TW": "中斷連線",
            "zh-CN": "离开",
        })
        .setDescriptionLocalizations({
            "zh-TW": "讓機器人離開語音頻道",
            "zh-CN": "让机器人离开语音频道",
        }),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        if (!interaction.guildId) return;

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

        const queue = getQueue(interaction.guildId);
        const emoji_cross = await get_emoji("crosS", client);

        const vconnection = getVoiceConnection(interaction.guildId);
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