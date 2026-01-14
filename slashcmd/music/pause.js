const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { getVoiceConnection } = require("@discordjs/voice");
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
        const { embed_error_color } = require("../../utils/config.js");
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue } = require("../../utils/music/music.js");

        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId, false);

        const [emoji_cross, emoji_pause, emoji_play] = await get_emojis(["crosS", "pause", "play"], client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        if (!queue || !queue.isPlaying()) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 沒有音樂正在播放`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        const connection = queue.connection || getVoiceConnection(guildId);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue.connection?.joinConfig.channelId || queue.voiceChannel.id}> 裡面`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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
