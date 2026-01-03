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
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue } = require("../../utils/music/music.js");
        const { get_me } = require("../../utils/discord.js");

        const voiceChannel = interaction.member.voice.channel;

        const [emoji_cross, emoji_skip] = await get_emojis(["crosS", "skip"], client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        const clientMember = await get_me(interaction.guild);

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue.connection?.channel?.id}> 裡面`)
                    .setEmbedFooter(interaction);

                return interaction.editReply({ embeds: [embed] });
            };
        };

        const queue = getQueue(interaction.guildId, false);

        if (!queue || !queue.isPlaying()) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 沒有音樂正在播放`)
                .setEmbedFooter(interaction);

            return interaction.editReply({ embeds: [embed] });
        };

        const [skippedTrack, _] = queue.nextTrack();

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_skip} | 跳過 \`${skippedTrack.title}\``)
            .setEmbedFooter(interaction);

        return interaction.editReply({ embeds: [embed] });
    },
};