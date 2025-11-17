const { SlashCommandBuilder } = require("discord.js");
// const musicPlayer = require('../../utils/musicPlayer.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('離開語音頻道')
        .setDescription('讓機器人離開語音頻道'),
    async execute(interaction) {
        return;
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply('❌ 請先加入一個語音頻道！');
        };

        if (!musicPlayer.isInVoiceChannel(interaction.guild.id)) {
            return interaction.reply('❌ 機器人目前不在語音頻道中。');
        };

        try {
            const success = await musicPlayer.leaveVoiceChannel(interaction.guild.id);
            if (success) {
                await interaction.reply('👋 已離開語音頻道');
            } else {
                await interaction.reply('❌ 離開語音頻道時發生錯誤');
            }
        } catch (error) {
            console.error('離開指令錯誤:', error);
            await interaction.reply('❌ 離開語音頻道時發生錯誤');
        };
    },
};