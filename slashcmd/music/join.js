const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("join")
        .setDescription("make bot join your voice channel")
        .setNameLocalizations({
            "zh-TW": "加入語音頻道",
            "zh-CN": "加入语音频道"
        })
        .setDescriptionLocalizations({
            "zh-TW": "讓機器人加入你的語音頻道",
            "zh-CN": "让机器人加入你的语音频道"
        }),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const { embed_error_color } = require("../../utils/config.js");
        const { get_emoji } = require("../../utils/rpg.js");
        const { getQueue, saveQueue } = require("../../utils/music/music.js");

        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId);

        await interaction.deferReply();

        const emoji_cross = get_emoji("crosS", client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter();

            return interaction.editReply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        const clientMember = await interaction.guild.members.fetchMe();

        if (clientMember.voice.channelId) {
            if (clientMember.voice.channelId !== voiceChannel.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                    .setDescription(`你必須待在 <#${queue.connection?.channel?.id}> 裡面`)
                    .setEmbedFooter();

                return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            };
        };

        let connection = getVoiceConnection(guildId);
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
        };

        queue.connection = connection;
        queue.voiceChannel = voiceChannel;

        saveQueue(guildId, queue);

        return interaction.editReply(`🎵 | 加入了 \`${interaction.user.username}\` 的語音頻道`);
    },
};