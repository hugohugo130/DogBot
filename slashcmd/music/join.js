const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

const { get_emojis } = require("../../utils/rpg.js");
const { VCJoinConfig } = require("../../utils/discord.js");
const { getQueue, youHaveToJoinVC_Embed } = require("../../utils/music/music.js");
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
        const guild = interaction.guild;
        if (!guild?.id) return;

        const textChannel = interaction.channel;
        const voiceChannel = (
            interaction.member
            && 'voice' in interaction.member
            && interaction.member.voice?.channel
            && "speakable" in interaction.member.voice?.channel
        )
            ? interaction.member.voice?.channel
            : null;

        const queue = getQueue(guild.id);

        const [emoji_cross, emoji_voice] = await get_emojis(["crosS", "voice"], client);

        if (!voiceChannel?.joinable || !voiceChannel?.speakable) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        let connection = getVoiceConnection(guild.id);

        if (connection && connection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${queue.connection?.joinConfig?.channelId || queue?.voiceChannel?.id}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        if (!connection) {
            connection = joinVoiceChannel(VCJoinConfig(voiceChannel, guild));
        };

        queue.setConnection(connection);
        const validConnection = await queue.isConnectionValid();

        if (!validConnection) {
            queue.connection?.rejoin(VCJoinConfig(voiceChannel, guild));

            const validNow = await queue.isConnectionValid();
            if (!validNow) {
                queue.connection?.destroy();

                queue.setConnection(joinVoiceChannel(VCJoinConfig(voiceChannel, guild)));
            };
        };

        queue.setVoiceChannel(voiceChannel);

        if (textChannel?.isSendable()) queue.setTextChannel(textChannel);
        await interaction.editReply(`${emoji_voice} | 加入了 \`${interaction.user.username}\` 的語音頻道`);
    },
};