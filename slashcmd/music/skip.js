const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Skip the current song")
        .setNameLocalizations({
            "zh-TW": "跳過",
            "zh-CN": "跳过"
        })
        .setDescriptionLocalizations({
            "zh-TW": "跳過正在播放的音樂",
            "zh-CN": "跳过正在播放的音乐"
        }),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const { embed_error_color, embed_default_color } = require("../../utils/config.js");
        const { get_emoji } = require("../../utils/rpg.js");
        const { getQueue } = require("../../utils/music/music.js");

        const voiceChannel = interaction.member.voice.channel;
        await interaction.deferReply();

        const emoji_cross = await get_emoji("crosS", client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter();

            return interaction.editReply({ embeds: [error_embed] });
        };

        const clientMember = await interaction.guild.members.fetchMe();

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue.connection?.channel?.id}> 裡面`)
                    .setEmbedFooter();

                return interaction.editReply({ embeds: [embed] });
            };
        };

        const queue = getQueue(interaction.guildId, false);

        if (!queue || !queue.isPlaying()) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 沒有音樂正在播放`)
                .setEmbedFooter();

            return interaction.editReply({ embeds: [embed] });
        };

        queue.nextTrack();

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`⏭️ | 跳過了當前歌曲`)
            .setEmbedFooter();

        return interaction.editReply({ embeds: [embed] });
    },
};