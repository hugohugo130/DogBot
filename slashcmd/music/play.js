const { SlashCommandBuilder } = require("discord.js");
const EmbedBuilder = require('../utils/customs/embedBuilder.js');
const musicPlayer = require('../../utils/musicPlayer.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setNameLocalizations({
            'zh-TW': '播放',
            'zh-CN': '播放',
        })
        .setDescription("Play music using keywords or third-party links")
        .setDescriptionLocalizations({
            'zh-TW': '使用關鍵字搜尋音樂、支持第三方連結播放',
            'zh-CN': '使用关键字搜索音乐、支持第三方链接播放',
        })
        .addStringOption(option =>
            option.setName("keyword_or_url")
                .setNameLocalizations({
                    'zh-TW': '關鍵字或連結',
                    'zh-CN': '关键字或链接',
                })
                .setDescription("Enter a keyword or URL to search for music`")
                .setDescriptionLocalizations({
                    'zh-TW': '使用關鍵字來搜尋音樂、支持第三方連結播放',
                    'zh-CN': '使用关键字来搜索音乐、支持第三方链接播放',
                })
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async execute(interaction) {
        return
        const { embed_error_color } = require("../../utils/config.js");
        await interaction.deferReply();

        const keywordOrUrl = interaction.options.getString("keyword_or_url");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription('❌ 請先加入一個語音頻道！');

            return interaction.editReply({ embeds: [embed] });
        };

        // 檢查權限
        if (!voiceChannel.joinable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription('❌ 我沒有權限加入這個語音頻道！');

            return interaction.editReply({ embeds: [embed] });
        };

        if (!voiceChannel.speakable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription('❌ 我沒有權限在這個語音頻道說話！');

            return interaction.editReply({ embeds: [embed] });
        };

        try {
            const song = await musicPlayer.playMusic(
                voiceChannel,
                interaction.channel,
                keywordOrUrl,
                interaction.user.id
            );

            await interaction.editReply(`🎵 已加入隊列: **${song.title}**\n🎤 點播者: <@${interaction.user.id}>`);
        } catch (error) {
            console.error('播放指令錯誤:', error);

            let errorMessage = '❌ 播放音樂時發生錯誤，請稍後再試。';
            if (error.message.includes('沒有找到相關影片')) {
                errorMessage = '❌ 沒有找到相關影片，請嘗試其他關鍵字。';
            } else if (error.message.includes('Sign in to confirm you are not a bot')) {
                errorMessage = '❌ 這個影片需要年齡驗證，無法播放。';
            }

            await interaction.editReply(errorMessage);
        };
    },
}