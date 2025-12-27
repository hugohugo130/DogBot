const { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { getVoiceConnection, joinVoiceChannel } = require("@discordjs/voice");
const { Soundcloud } = require("soundcloud.ts");
const crypto = require("crypto");

const { get_logger } = require("../../utils/logger.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

let sc = global._sc ?? new Soundcloud();
global._sc = sc;

function generateSHA256(input) {
    const md5Hash = crypto.createHash('sha256');

    md5Hash.update(input);
    return md5Hash.digest('hex');
};

const logger = get_logger();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setNameLocalizations({
            "zh-TW": "播放",
            "zh-CN": "播放",
        })
        .setDescription("Play music using keywords or third-party links")
        .setDescriptionLocalizations({
            "zh-TW": "使用關鍵字搜尋音樂、支持第三方連結播放",
            "zh-CN": "使用关键字搜索音乐、支持第三方链接播放",
        })
        .addStringOption(option =>
            option.setName("keyword_or_url")
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
        .addIntegerOption(option =>
            option.setName("volume")
                .setNameLocalizations({
                    "zh-TW": "音量",
                    "zh-CN": "音量",
                })
                .setDescription("Set the volume of the music. 0~100 (Default 100)")
                .setDescriptionLocalizations({
                    "zh-TW": "設定音樂的音量 0~100 (預設50)",
                    "zh-CN": "设置音乐的音量 0~100 (默认50)",
                })
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100)
        )
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
        .addBooleanOption(option =>
            option.setName("24-7")
                .setNameLocalizations({
                    "zh-TW": "24小時不間斷播放",
                    "zh-CN": "24小时不间断播放",
                })
                .setDescription("24/7 mode")
                .setDescriptionLocalizations({
                    "zh-TW": "24小時不間斷播放",
                    "zh-CN": "24小时不间断播放",
                })
                .setRequired(false),
        ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     * @param {DogClient} client 
     */
    async execute(interaction, client) {
        const { get_emoji } = require("../../utils/rpg.js");
        const { getQueue, saveQueue, search_until, getTrack } = require("../../utils/music/music.js");
        const { formatMinutesSeconds } = require("../../utils/timestamp.js");
        const { embed_error_color } = require("../../utils/config.js");

        await interaction.deferReply();

        const keywordOrUrl = interaction.options.getString("keyword_or_url") ?? "wellerman";
        const volume = interaction.options.getInteger("volume");
        const leaveOnEmpty = !interaction.options.getBoolean("24/7") ?? true;

        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guildId;
        const emoji_cross = await get_emoji("crosS", client);
        const emoji_search = await get_emoji("search", client);

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter();

            return interaction.editReply({ embeds: [error_embed] });
        };

        // 檢查權限
        if (!voiceChannel.joinable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} 我沒有權限加入這個語音頻道！`);

            return interaction.editReply({ embeds: [embed] });
        };

        if (!voiceChannel.speakable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} 我沒有權限在這個語音頻道說話！`);

            return interaction.editReply({ embeds: [embed] });
        };

        const queue = getQueue(guildId);

        await interaction.editReply({ content: `${emoji_search} | 正在從音樂的海洋中撈取...` });

        let voiceConnection = getVoiceConnection(guildId);

        // 連接到語音頻道
        if (!voiceConnection) {
            voiceConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
        } else if (voiceConnection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${voiceConnection.joinConfig.channelId}> 裡面`)
                .setEmbedFooter();

            return interaction.editReply({ content: "", embeds: [embed] });
        };

        if (volume) queue.volume = volume;
        queue.textChannel = interaction.channel;
        queue.voiceChannel = voiceChannel;
        queue.connection = voiceConnection;
        queue.subscribe();

        saveQueue(guildId, queue);

        const tracks = await search_until(keywordOrUrl);

        if (tracks.length === 0) {
            return interaction.editReply(`${emoji_cross} | 沒有找到任何音樂`);
        };

        const trackSessionID = generateSHA256(interaction.user.id + Date.now().toString());

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
                const source = track.source;

                return [[id], [{
                    track,
                    source,
                }]];
            })),
        ));

        await interaction.editReply({ content: "選擇要播放的音樂", components: [selectMenu] });
    },
};
