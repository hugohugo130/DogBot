const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");

const { get_emojis } = require("../../utils/rpg.js");
const { getQueue, noMusicIsPlayingEmbed, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
const { embed_error_color } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("pause the music")
        .setNameLocalizations({
            "zh-TW": "暫停",
            "zh-CN": "暂停"
        })
        .setDescriptionLocalizations({
            "zh-TW": "暫停音樂播放",
            "zh-CN": "暂停音乐播放"
        }),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const voiceChannel = interaction.member && 'voice' in interaction.member
            ? interaction.member.voice?.channel
            : null;
        const guildId = interaction.guild?.id;

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

        const connection = getVoiceConnection(guildId);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue.connection?.joinConfig.channelId || queue.voiceChannel.id}> 裡面`)
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
