const { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { getVoiceConnection, joinVoiceChannel } = require("@discordjs/voice");
const { Soundcloud } = require("soundcloud.ts");
const crypto = require("crypto");

const { getNowPlayingEmbed } = require("./nowplaying.js");
const { generateSessionId } = require("../../utils/random.js");
const { get_emojis, get_emoji } = require("../../utils/rpg.js");
const { search_until, IsValidURL, getAudioStream, getQueue, saveQueue } = require("../../utils/music/music.js");
const { formatMinutesSeconds } = require("../../utils/timestamp.js");
const { embed_error_color } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

let sc = global._sc ?? new Soundcloud();
global._sc = sc;

function generateSHA256(input) {
    const md5Hash = crypto.createHash('sha256');

    md5Hash.update(input);
    return md5Hash.digest('hex');
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setNameLocalizations({
            "zh-TW": "播放",
            "zh-CN": "播放",
        })
        .setDescription("Play music in the voice channel")
        .setDescriptionLocalizations({
            "zh-TW": "在語音頻道內播放音樂",
            "zh-CN": "在语音频道内播放音乐",
        })
        .addStringOption(option => // query
            option.setName("query")
                .setNameLocalizations({
                    "zh-TW": "關鍵字或連結",
                    "zh-CN": "关键字或链接",
                })
                .setDescription("Enter a keyword or URL to search for music")
                .setDescriptionLocalizations({
                    "zh-TW": "使用關鍵字來搜尋音樂、支持第三方連結播放",
                    "zh-CN": "使用关键字来搜索音乐、支持第三方链接播放",
                })
                .setRequired(true)
            // .setAutocomplete(true),
        )
        .addBooleanOption(option => // next
            option.setName("next")
                .setNameLocalizations({
                    "zh-TW": "next",
                    "zh-CN": "next",
                })
                .setDescription("Insert the music to be played into the next song (for single track use only)")
                .setDescriptionLocalizations({
                    "zh-TW": "將播放的音樂插入到下一首歌 (限單曲使用)",
                    "zh-CN": "将播放的音乐插入到下一首歌 (限单曲使用)",
                })
                .setRequired(false),
        )
        .addBooleanOption(option => // play_audio_url
            option.setName("play_audio_url")
                .setNameLocalizations({
                    "zh-TW": "萬物皆可播",
                    "zh-CN": "万物皆可播",
                })
                .setDescription("Download the audio from the url and play it as much as possible")
                .setDescriptionLocalizations({
                    "zh-TW": "從連結下載音訊並盡可能播放",
                    "zh-CN": "从链接下载音频并尽可能播放",
                })
                .setRequired(false),
        ),
    // .addBooleanOption(option =>
    //     option.setName("shuffle")
    //         .setNameLocalizations({
    //             "zh-TW": "隨機播放",
    //             "zh-CN": "随机播放",
    //         })
    //         .setDescription("Shuffle the playlist")
    //         .setDescriptionLocalizations({
    //             "zh-TW": "隨機播放",
    //             "zh-CN": "随机播放",
    //         })
    //         .setRequired(false),
    // )
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     */
    async execute(interaction, client) {
        const query = interaction.options.getString("query") ?? "wellerman";
        const next = interaction.options.getBoolean("next") ?? false;
        const play_audio_url = interaction.options.getBoolean("play_audio_url") ?? false;
        // const shuffle = interaction.options.getBoolean("shuffle") ?? false;

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel || !voiceChannel.joinable || !voiceChannel.speakable) {
            const emoji_music = await get_emoji("music", client);

            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_music} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        const guildId = interaction.guildId;

        const voiceConnection = getVoiceConnection(guildId);

        // 連接到語音頻道
        if (voiceConnection?.joinConfig?.channelId !== voiceChannel.id) {
            const emoji_cross = await get_emoji("crosS", client);
            
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${voiceConnection.joinConfig.channelId}> 裡面`)
                .setEmbedFooter(interaction);

            return interaction.reply({ content: "", embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        const [
            emoji_cross,
            emoji_search,
        ] = await get_emojis([
            "crosS",
            "search",
        ], client);

        await interaction.editReply({ content: `${emoji_search} | 正在從音樂的海洋中撈取...` });

        const will_play_audio_url = play_audio_url && IsValidURL(query);

        let audioStatusCode = null;
        try {
            await getAudioStream(query);
        } catch (error) {
            const statusCode = error.message;
            audioStatusCode = statusCode;
        };

        if (will_play_audio_url && audioStatusCode) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} | url無效: HTTP Error ${audioStatusCode}`)
                .setEmbedFooter(interaction);

            return interaction.editReply({ content: "", embeds: [embed] });
        };

        const tracks = await search_until(query, 25, will_play_audio_url);

        if (tracks.length === 0) {
            return interaction.editReply(`${emoji_cross} | 沒有找到任何音樂`);
        };

        if (tracks.length === 1) {
            const track = tracks[0];

            const queue = getQueue(guildId);

            if (!queue.voiceChannel) queue.voiceChannel = voiceChannel;
            if (!queue.textChannel && interaction.channel) queue.textChannel = interaction.channel;
            if (!queue.connection) {
                const connection = getVoiceConnection(guildId) || joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    selfMute: false,
                    selfDeaf: true,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                queue.connection = connection;
            };

            saveQueue(guildId, queue);

            queue.subscribe();

            queue.addTrack(track);

            const [embed, rows] = await getNowPlayingEmbed(queue, track, interaction, client, true);

            if (!queue.isPlaying()) {
                await queue.play(track);
            };

            return interaction.editReply({ content: "", embeds: [embed], components: rows });
        };

        const maxTrackIdLength = Math.max(...tracks.map(track => String(track.id).length));
        const optionValueLengthLimit = 100;
        const reserved_length = 10;
        const trackSessionID = generateSessionId(optionValueLengthLimit - 1 - maxTrackIdLength - reserved_length);

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`play-s|${interaction.user.id}`)
                    .setPlaceholder("選擇音樂")
                    .addOptions(
                        ...tracks.map((track) => ({
                            label: track.title,
                            description: `${track.author} · ${formatMinutesSeconds(track.duration)}`,
                            value: `${trackSessionID}|${track.id}`
                        }))
                    ),
            );

        client.musicTrackSession.set(trackSessionID, Object.fromEntries(await Promise.all(
            tracks.map(async (track) => {
                const id = track.id;

                return [[id], [{
                    track,
                    next,
                }]];
            })),
        ));

        await interaction.editReply({ content: "選擇要播放的音樂", components: [selectMenu] });
    },
};
