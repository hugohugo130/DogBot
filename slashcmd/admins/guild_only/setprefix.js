const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setprefix")
        .setDescription("Set the prefix of the rpg game")
        .setNameLocalizations({
            "zh-CN": "设置前缀",
            "zh-TW": "設定前綴",
        })
        .setDescriptionLocalizations({
            "zh-CN": "设置RPG游戏的前缀",
            "zh-TW": "設定RPG遊戲的前綴",
        })
        .addStringOption(option =>
            option.setName("prefix")
                .setDescription("The prefix of the rpg game")
                .setNameLocalizations({
                    "zh-CN": "前缀",
                    "zh-TW": "前綴",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "RPG游戏的前缀",
                    "zh-TW": "RPG遊戲的前綴",
                })
                .setMinLength(1)
                .setMaxLength(10)
                .setRequired(true),
        )
        .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    async execute(interaction) {
        const { setPrefix } = require('../../../utils/file.js');
        await interaction.deferReply();
        if (!interaction.guild) return interaction.editReply({ content: "你不在伺服器內執行這個指令！" })
        const prefix = interaction.options.getString("prefix");
        const guildID = interaction.guildId;

        setPrefix(guildID, prefix);

        await interaction.editReply({ content: `已設定RPG遊戲的前綴為：${prefix}` });
    },
};