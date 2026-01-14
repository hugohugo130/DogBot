const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("swap")
        .setDescription("Swap two songs in the music queue")
        .setNameLocalizations({
            "zh-TW": "替換",
            "zh-CN": "替换"
        })
        .setDescriptionLocalizations({
            "zh-TW": "替換音樂歌單兩首歌的位置",
            "zh-CN": "替换音乐歌单两首歌的位置"
        })
        .addIntegerOption(option => option
            .setName("first")
            .setNameLocalizations({
                "zh-TW": "第一首",
                "zh-CN": "第一首"
            })
            .setDescription("The index of the first song to swap")
            .setDescriptionLocalizations({
                "zh-TW": "第一首目曲的索引",
                "zh-CN": "第一首目曲的索引"
            })
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption(option => option
            .setName("second")
            .setNameLocalizations({
                "zh-TW": "第二首",
                "zh-CN": "第二首"
            })
            .setDescription("The index of the second song to swap")
            .setDescriptionLocalizations({
                "zh-TW": "第二首目曲的索引",
                "zh-CN": "第二首目曲的索引"
            })
            .setRequired(true)
            .setMinValue(1),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
    */
    async execute(interaction, client) {
        const { embed_error_color } = require("../../utils/config.js");
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue, noMusicIsPlayingEmbed } = require("../../utils/music/music.js");
        const { get_me } = require("../../utils/discord.js");

        const voiceChannel = interaction.member.voice.channel;

        const [emoji_cross, emoji_loop] = await get_emojis(["crosS", "loop"], client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        const clientMember = await get_me(interaction.guild);

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue.connection?.channel?.id || clientMember.voice.channelId}> 裡面`)
                    .setEmbedFooter(interaction);

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            };
        };

        const queue = getQueue(interaction.guildId, false);

        const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
        if (!notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        const first = interaction.options.getInteger("first");
        const second = interaction.options.getInteger("second");

        if (first === second) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 重複的索引`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        const firstTrack = queue.tracks[first - 1];
        const secondTrack = queue.tracks[second - 1];

        if (!firstTrack || !secondTrack) {
            const wrongTrack = !firstTrack ? "一" : "二"

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 未知的第${wrongTrack}首索引`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        queue.swapTracks(first - 1, second - 1);

        return interaction.reply({ content: `${emoji_loop} 成功交換了兩首歌 \`${firstTrack.title}\` 和 \`${secondTrack.title}\`` });
    },
};