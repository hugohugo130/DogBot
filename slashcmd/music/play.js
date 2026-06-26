import {
    SlashCommandBuilder,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    TextChannel,
    ThreadChannel,
} from "discord.js";
import {
    getVoiceConnection,
    joinVoiceChannel,
} from "@discordjs/voice";
import {
    Soundcloud,
} from "soundcloud.ts";

import {
    get_logger,
} from "../../utils/logger.js";
import {
    getNowPlayingEmbed,
} from "./nowplaying.js";
import {
    generateSessionId,
} from "../../utils/random.js";
import {
    get_emojis,
    get_emoji,
} from "../../utils/rpg.js";
import {
    search_until,
    IsValidURL,
    getQueue,
    youHaveToJoinVC_Embed,
    fixStructure,
    getPlayingPlayers,
    URLAvaliable,
    GDriveDirectLink,
} from "../../utils/music/music.js";
import {
    formatMinutesSeconds,
} from "../../utils/timestamp.js";
import {
    embed_error_color,
    musicPlayingPlayerLimit,
} from "../../utils/config.js";
import {
    get_lang_data,
} from "../../utils/language.js";
import EmbedBuilder from "../../utils/customs/embedBuilder.js";

const DEBUG = false;

/** @type {Soundcloud} */
let sc = global._sc ?? new Soundcloud();
global._sc = sc;

/** @type {import("../../utils/types").Slash<["guild"]>} */
export const playSlash = {
    builder: new SlashCommandBuilder()
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
                .setRequired(false)
            // .setAutocomplete(true),
        )
        .addAttachmentOption(option => // file
            option.setName("file")
                .setNameLocalizations({
                    "zh-TW": "檔案",
                    "zh-CN": "文件",
                })
                .setDescription("Upload a file to play")
                .setDescriptionLocalizations({
                    "zh-TW": "上傳檔案來播放",
                    "zh-CN": "上传文件来播放",
                })
                .setRequired(false),
        )
        .addStringOption(option => // track_name
            option.setName("track_name")
                .setNameLocalizations({
                    "zh-TW": "曲目名稱",
                    "zh-CN": "曲目名称",
                })
                .setDescription("Set a custom name of this track")
                .setDescriptionLocalizations({
                    "zh-TW": "設定這首曲目的名稱",
                    "zh-CN": "设定这首曲目的名称",
                })
                .setRequired(false),
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
        .addBooleanOption(option => // hide
            option.setName("hide")
                .setNameLocalizations({
                    "zh-TW": "隱藏",
                    "zh-CN": "隐藏",
                })
                .setDescription("Hide command output")
                .setDescriptionLocalizations({
                    "zh-TW": "隱藏指令輸出",
                    "zh-CN": "隐藏指令输出",
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
    permissions: {
        bot: ["ViewChannel", "SendMessages"],
    },
    allowedContext: ["guild"],
    stage: "beta",
    music: true,

    async execute(interaction, client) {
        const query = interaction.options.getString("query", false) ?? null;
        const file = interaction.options.getAttachment("file", false) ?? null;
        const next = interaction.options.getBoolean("next", false) ?? false;
        const custom_track_name = interaction.options.getString("track_name", false) ?? null;
        const hide = interaction.options.getBoolean("hide", false) ?? false;
        // const shuffle = interaction.options.getBoolean("shuffle") ?? false;

        if (!query && !file) {
            // 你必須提供一個搜尋字串或文件來播放
            // You must provide a query or file to play
            const lang_no_query = get_lang_data(interaction.locale, "/play", "no_query");

            const emoji_cross = await get_emoji("crosS", client);

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | ${lang_no_query}`)
                .setEmbedFooter(interaction);

            return await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        };

        const isAudioFile = file?.contentType?.startsWith('audio/');
        if (file && !isAudioFile) {
            // 你必須提供一個音頻文件
            // You must provide an audio file
            const lang_not_audio_file = get_lang_data(interaction.locale, "/play", "not_audio_file");

            const emoji_cross = await get_emoji("crosS", client);

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | ${lang_not_audio_file}`)
                .setEmbedFooter(interaction);

            return await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral,
            });
        };

        const voiceChannel = (
            interaction.member
            && "voice" in interaction.member
            && interaction.member.voice?.channel
            && "speakable" in interaction.member.voice?.channel
        )
            ? interaction.member.voice?.channel
            : null;

        const guildId = interaction.guildId;

        if (!voiceChannel?.joinable || !voiceChannel?.speakable || !guildId) {
            return await interaction.reply({
                embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                flags: MessageFlags.Ephemeral,
            });
        };

        const logger = get_logger();

        if (getPlayingPlayers().size >= musicPlayingPlayerLimit) {
            if (DEBUG) logger.debug(`達到了播放器數量: ${musicPlayingPlayerLimit}`);

            const emoji_cross = await get_emoji("crosS", client);

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 無法播放`)
                .setDescription(`正在播放音樂的播放器數量已達到限制 (${musicPlayingPlayerLimit} 個)`)
                .setEmbedFooter(interaction);

            return await interaction.reply({
                embeds: [embed],
                flags: !hide ? undefined : MessageFlags.Ephemeral,
            })
        };

        const custom_file_duration = file?.duration
            ? file?.duration * 1000
            : null;

        const queryOrURL =
            /** @type {string} */
            (query || file?.url);

        const voiceConnection = getVoiceConnection(guildId);

        // 連接到語音頻道
        if (voiceConnection?.joinConfig?.channelId && voiceConnection.joinConfig.channelId !== voiceChannel.id) {
            const emoji_cross = await get_emoji("crosS", client);

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我們不在同一個頻道`)
                .setDescription(`你必須待在 <#${voiceConnection.joinConfig.channelId}> 裡面`)
                .setEmbedFooter(interaction);

            return await interaction.reply({
                embeds: [embed],
                flags: !hide ? undefined : MessageFlags.Ephemeral,
            });
        };

        const [_, [
            emoji_cross,
            emoji_search,
        ]] = await Promise.all([
            interaction.deferReply({ flags: hide ? MessageFlags.Ephemeral : undefined }),
            get_emojis([
                "crosS",
                "search",
            ], client),
        ]);

        await interaction.editReply({ content: `${emoji_search} | 正在從音樂的海洋中撈取...` });

        const will_play_audio_url = IsValidURL(queryOrURL);
        const converted_gdrive_custom_url_or_query = will_play_audio_url && GDriveDirectLink(queryOrURL);
        const custom_url_or_query = converted_gdrive_custom_url_or_query || queryOrURL;

        if (DEBUG) logger.debug(`是否自定義url: ${will_play_audio_url}`);
        if (DEBUG) logger.debug(`轉換後的gdrive url: ${converted_gdrive_custom_url_or_query}`);
        if (DEBUG) logger.debug(`使用的自定義url: ${custom_url_or_query}`);

        let audioerr = null;
        try { // 檢查自定義url是否可訪問
            if (will_play_audio_url) {
                if (DEBUG) logger.debug(`正在檢查自定義url是否可訪問`);

                if (!(await URLAvaliable(custom_url_or_query))) {
                    throw new Error("URL無法訪問，請檢查拼字或稍後再試");
                };
            };
        } catch (error) {
            audioerr = error instanceof Error ? error.message : null;
        };

        if (will_play_audio_url && audioerr) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setDescription(`${emoji_cross} | 播放自定義url (<${custom_url_or_query}>) 時遇到問題: \n\`${audioerr}\``.slice(0, 4090))
                .setEmbedFooter(interaction);

            return await interaction.editReply({ content: "", embeds: [embed] });
        };

        if (DEBUG) logger.debug(`正在搜尋曲目`);
        const tracks = await search_until(custom_url_or_query, 25, {
            enable: will_play_audio_url,
            URLOnly: !!file,
            duration: custom_file_duration,
        });

        if (DEBUG) logger.debug(`搜到了${tracks.length}首曲目`);

        if (tracks.length === 0) return await interaction.editReply(`${emoji_cross} | 沒有找到任何音樂`);

        if (tracks.length === 1) {
            const track = (await fixStructure(tracks))[0];

            if (custom_track_name) track.title = custom_track_name;

            const queue = getQueue(guildId);

            if (!queue.voiceChannel) queue.setVoiceChannel(voiceChannel);
            if (
                !queue.textChannel
                && interaction.channel
                && (
                    interaction.channel instanceof TextChannel
                    || interaction.channel instanceof ThreadChannel
                )
            ) queue.setTextChannel(interaction.channel);
            if (!queue.connection && interaction.guild) {
                const connection = getVoiceConnection(guildId) || joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    selfMute: false,
                    selfDeaf: true,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                queue.setConnection(connection);
            };

            queue.subscribe();

            const [embed, rows] = await getNowPlayingEmbed(queue, track, interaction, client, true);

            await queue.addOrPlay(track, next ? 0 : null);

            return await interaction.editReply({ content: "", embeds: [embed], components: rows });
        };

        const maxTrackIdLength = Math.max(...tracks.map(track => String(track.id).length));
        const optionValueLengthLimit = 100;
        const reserved_length = 10;
        const trackSessionID = generateSessionId(optionValueLengthLimit - 1 - maxTrackIdLength - reserved_length);

        const selectMenu =
            /** @type {ActionRowBuilder<StringSelectMenuBuilder>} */
            (new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`play-s|${interaction.user.id}`)
                        .setPlaceholder("選擇音樂")
                        .addOptions(
                            ...tracks.map((track) => ({
                                label: track.title.slice(0, 100),
                                description: `${track.author} · ${formatMinutesSeconds(track.duration)}`.slice(0, 100),
                                value: `${trackSessionID}|${track.id}`
                            }))
                        ),
                ));

        client.musicTrackSession.set(trackSessionID, Object.fromEntries(
            tracks.map((track) => {
                const id = track.id;

                return [[id], [{
                    track,
                    next,
                    custom_track_name,
                }]];
            }))
        );

        await interaction.editReply({ content: "選擇要播放的音樂", components: [selectMenu] });
    },
};
