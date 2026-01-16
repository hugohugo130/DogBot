const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

const { get_emojis } = require("../../utils/rpg.js");
const { getQueue, saveQueue, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
const { embed_error_color } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

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
        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;
        const queue = getQueue(guildId);

        const [emoji_cross, emoji_voice] = await get_emojis(["crosS", "voice"], client);

        if (!voiceChannel?.joinable || !voiceChannel?.speakable) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        let connection = getVoiceConnection(guildId);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue.connection?.joinConfig?.channelId || queue.voiceChannel.id}> 裡面`)
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guild.id,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
        };

        queue.connection = connection;
        queue.voiceChannel = voiceChannel;

        saveQueue(guildId, queue);

        return await interaction.editReply(`${emoji_voice} | 加入了 \`${interaction.user.username}\` 的語音頻道`);
    },
};