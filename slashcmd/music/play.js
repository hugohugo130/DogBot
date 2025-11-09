const { SlashCommandBuilder } = require("discord.js");
const musicPlayer = require('../../utils/musicPlayer.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('播放音樂')
        .setDescription('播放音樂')
        .addStringOption(option =>
            option.setName('關鍵字或連結')
                .setDescription('使用關鍵字來搜尋音樂、支持第三方連結播放')
                .setRequired(true)
                .setAutocomplete(true),
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const keywordOrUrl = interaction.options.getString('關鍵字或連結');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.editReply('❌ 請先加入一個語音頻道！');
        }

        // 檢查權限
        if (!voiceChannel.joinable) {
            return interaction.editReply('❌ 我沒有權限加入這個語音頻道！');
        }

        if (!voiceChannel.speakable) {
            return interaction.editReply('❌ 我沒有權限在這個語音頻道說話！');
        }

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
        }
    },
}