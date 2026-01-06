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
        .addStringOption(option =>
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
        .addBooleanOption(option =>
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
        .addBooleanOption(option =>
            option.setName("all_things_can_play")
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
        const { get_emojis } = require("../../utils/rpg.js");
        const { getQueue, saveQueue, search_until, IsValidURL } = require("../../utils/music/music.js");
        const { formatMinutesSeconds } = require("../../utils/timestamp.js");
        const { embed_error_color } = require("../../utils/config.js");

        const query = interaction.options.getString("query") ?? "wellerman";
        const next = interaction.options.getBoolean("next") ?? false;
        const all_things_can_play = interaction.options.getBoolean("all_things_can_play") ?? false;
        // const shuffle = interaction.options.getBoolean("shuffle") ?? false;

        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                .setEmbedFooter(interaction);

            return interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        const guildId = interaction.guildId;

        const [emoji_cross, emoji_search] = await get_emojis(["crosS", "search"], client);

        // 檢查權限
        if (!voiceChannel.joinable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} 我沒有權限加入這個語音頻道！`);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        if (!voiceChannel.speakable) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} 我沒有權限在這個語音頻道說話！`);

            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        let voiceConnection = getVoiceConnection(guildId);

        // 連接到語音頻道
        if (voiceConnection?.joinConfig?.channelId && voiceConnection.joinConfig.channelId !== voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${voiceConnection.joinConfig.channelId}> 裡面`)
                .setEmbedFooter(interaction);

            return interaction.reply({ content: "", embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        const queue = getQueue(guildId);

        await interaction.editReply({ content: `${emoji_search} | 正在從音樂的海洋中撈取...` });

        queue.textChannel = interaction.channel;
        queue.voiceChannel = voiceChannel;
        queue.subscribe();

        saveQueue(guildId, queue);

        const tracks = await search_until(query, 25, (all_things_can_play && IsValidURL(query)));

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
                    next,
                }]];
            })),
        ));

        await interaction.editReply({ content: "選擇要播放的音樂", components: [selectMenu] });
    },
};
