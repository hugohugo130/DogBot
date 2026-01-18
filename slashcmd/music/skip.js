const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");

const { get_emojis } = require("../../utils/rpg.js");
const { getQueue, noMusicIsPlayingEmbed, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
const { get_me } = require("../../utils/discord.js");
const { embed_error_color, embed_default_color } = require("../../utils/config.js");
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
        const voiceChannel = interaction.member.voice.channel;

        const [emoji_cross, emoji_skip] = await get_emojis(["crosS", "skip"], client);

        if (!voiceChannel) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const clientMember = await get_me(interaction.guild);

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue.connection?.channel?.id}> 裡面`)
                    .setEmbedFooter(interaction);

                return await interaction.editReply({ embeds: [embed] });
            };
        };

        const queue = getQueue(interaction.guildId, false);

        const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
        if (notPlayingEmbed) {
            return await interaction.reply({ embeds: [notPlayingEmbed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        const [skippedTrack, _] = await queue.nextTrack();

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_skip} | 跳過 \`${skippedTrack.title}\``)
            .setEmbedFooter(interaction);

        return await interaction.editReply({ embeds: [embed] });
    },
};