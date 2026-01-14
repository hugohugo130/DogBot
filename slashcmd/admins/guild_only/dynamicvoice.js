const { SlashCommandBuilder, ChannelType } = require("discord.js");

const { setDynamicVoice } = require("../../../utils/file.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dvoice")
        .setDescription("Enable or disable dynamic voice channel for this server")
        .setNameLocalizations({
            "zh-CN": "动态语音频道",
            "zh-TW": "動態語音頻道",
        })
        .setDescriptionLocalizations({
            "zh-CN": "为这个服务器启用或禁用动态语音频道",
            "zh-TW": "為這個伺服器啟用或禁用動態語音頻道",
        })
        .addChannelOption(option =>
            option.setName("vchannel")
                .setDescription("Create a temp voice channel when member joined this voice channel")
                .setNameLocalizations({
                    "zh-CN": "语音频道",
                    "zh-TW": "語音頻道",
                })
                .setDescriptionLocalizations({
                    "zh-CN": "当成员加入这个语音频道时，创建一个临时语音频道",
                    "zh-TW": "當成員加入這個語音頻道時，創建一個臨時語音頻道",
                })
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false),
        )
        .setDefaultMemberPermissions(0), // 只有管理員可以使用這個指令
    async execute(interaction) {
        await interaction.deferReply();

        if (!interaction.guild) return interaction.editReply({ content: "你不在伺服器內執行這個指令！" })

        const channel = interaction.options.getChannel("vchannel") ?? false;
        const guildID = interaction.guildId;

        await setDynamicVoice(guildID, channel);

        await interaction.editReply({ content: `已成功設定動態語音頻道${channel ? `為 ${channel}` : "：關閉"}` });
    },
};