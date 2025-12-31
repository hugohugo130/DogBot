const path = require("path");
const util = require("node:util");
const axios = require("axios");
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { pipeline } = require("node:stream/promises");
const { Collection, TextChannel, VoiceChannel, Subscription, Guild } = require("discord.js");
const { createAudioResource, createAudioPlayer, AudioPlayerStatus, VoiceConnection, AudioPlayer, joinVoiceChannel, getVoiceConnection, StreamType } = require("@discordjs/voice");
const { Soundcloud } = require("soundcloud.ts");

const { get_logger } = require("../logger.js");
const { existsSync, createReadStream, get_temp_folder, join_temp_folder, basename, readdirSync, unlinkSync } = require("../file.js");
const { formatMinutesSeconds } = require("../timestamp.js");
const { get_emoji } = require("../rpg.js");
const { musicSearchEngine, embed_error_color, embed_default_color } = require("../config.js");
const EmbedBuilder = require("../customs/embedBuilder.js");
const DogClient = require("../customs/client.js");

let sc = global._sc ?? new Soundcloud();
global._sc = sc;

const logger = get_logger();

const queues = new Collection();

// SoundCloudTrack Object Example
/*
{
    "artwork_url": "https://i1.sndcdn.com/artworks-GUtkdN7hrPHY-0-large.jpg",
    "caption": null,
    "commentable": true,
    "comment_count": 3438,
    "created_at": "2021-01-26T13:09:44Z",
    "description": null,
    "downloadable": false,
    "download_count": 0,
    "duration": 30000,
    "full_duration": 155376,
    "embeddable_by": "all",
    "genre": "Pop",
    "has_downloads_left": false,
    "id": 973047190,
    "kind": "track",
    "label_name": "Polydor Records",
    "last_modified": "2025-10-10T17:54:07Z",
    "license": "all-rights-reserved",
    "likes_count": 56862,
    "permalink": "wellerman-sea-shanty",
    "permalink_url": "https://soundcloud.com/nathanevans-music/wellerman-sea-shanty",
    "playback_count": 3334201,
    "public": true,
    "publisher_metadata": {
        "id": 973047190,
        "urn": "soundcloud:tracks:973047190",
        "artist": "Nathan Evans",
        "album_title": "Wellerman",
        "contains_music": true,
        "upc_or_ean": "00602435763651",
        "isrc": "GBUM72100297",
        "explicit": false,
        "p_line": "℗ 2021 Universal Music Operations Limited",
        "p_line_for_display": "℗ 2021 Universal Music Operations Limited",
        "c_line": "© 2021 Universal Music Operations Limited",
        "c_line_for_display": "© 2021 Universal Music Operations Limited",
        "release_title": "Wellerman (Sea Shanty)"
    },
    "purchase_title": null,
    "purchase_url": null,
    "release_date": "2021-01-21T00:00:00Z",
    "reposts_count": 1222,
    "secret_token": null,
    "sharing": "public",
    "state": "finished",
    "streamable": true,
    "tag_list": "",
    "title": "Wellerman (Sea Shanty)",
    "uri": "https://api.soundcloud.com/tracks/soundcloud%3Atracks%3A973047190",
    "urn": "soundcloud:tracks:973047190",
    "user_id": 939262504,
    "visuals": null,
    "waveform_url": "https://wave.sndcdn.com/vdNMyVyTvXzE_m.json",
    "display_date": "2021-01-21T00:00:00Z",
    "media": {
        "transcodings": [
            {
                "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:973047190/f4ac86ce-2209-48c6-8040-4aa91dc917cb/preview/hls",
                "preset": "mp3_0_1",
                "duration": 30000,
                "snipped": true,
                "format": {
                    "protocol": "hls",
                    "mime_type": "audio/mpeg"
                },
                "quality": "sq",
                "is_legacy_transcoding": true
            },
            {
                "url": "https://api-v2.soundcloud.com/media/soundcloud:tracks:973047190/f4ac86ce-2209-48c6-8040-4aa91dc917cb/preview/progressive",
                "preset": "mp3_0_1",
                "duration": 30000,
                "snipped": true,
                "format": {
                    "protocol": "progressive",
                    "mime_type": "audio/mpeg"
                },
                "quality": "sq",
                "is_legacy_transcoding": true
            }
        ]
    },
    "station_urn": "soundcloud:system-playlists:track-stations:973047190",
    "station_permalink": "track-stations:973047190",
    "track_authorization": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW8iOiJISyIsInN1YiI6IiIsInJpZCI6IjJmMjRjZTgxLTU1NTctNDA0ZS05YWY3LWQwYmVmZDJjNzU2OSIsImlhdCI6MTc2NjU0NzkyOX0.RB83gVP3R6YzI_ZzSFH9qOwoSVZjSS4r1GOvQw1tktU",
    "monetization_model": "NOT_APPLICABLE",
    "policy": "SNIP",
    "user": {
        "avatar_url": "https://i1.sndcdn.com/avatars-mdN6Q8pM2qfpmWMI-LB9SiQ-large.jpg",
        "city": null,
        "comments_count": 0,
        "country_code": null,
        "created_at": "2021-01-26T10:37:31Z",
        "creator_subscriptions": [
            {
                "product": {
                    "id": "free"
                }
            }
        ],
        "creator_subscription": {
            "product": {
                "id": "free"
            }
        },
        "description": null,
        "followers_count": 12700,
        "followings_count": 0,
        "first_name": "",
        "full_name": "",
        "groups_count": 0,
        "id": 939262504,
        "kind": "user",
        "last_modified": "2021-06-24T13:46:35Z",
        "last_name": "",
        "likes_count": 0,
        "playlist_likes_count": 0,
        "permalink": "nathanevans-music",
        "permalink_url": "https://soundcloud.com/nathanevans-music",
        "playlist_count": 3,
        "reposts_count": null,
        "track_count": 55,
        "uri": "https://api.soundcloud.com/users/soundcloud%3Ausers%3A939262504",
        "urn": "soundcloud:users:939262504",
        "username": "Nathan Evans",
        "verified": false,
        "visuals": null,
        "badges": {
            "pro": false,
            "creator_mid_tier": false,
            "pro_unlimited": false,
            "verified": false
        },
        "station_urn": "soundcloud:system-playlists:artist-stations:939262504",
        "station_permalink": "artist-stations:939262504",
        "date_of_birth": null
    }
}
*/

class MusicQueue {
    /**
     *
     * @param {string} guildID - 伺服器ID
     * @param {DogClient} [client=null] - Discord Client
     */
    constructor(guildID, client = global._client) {
        /** @type {string} */
        this.guildID = guildID;

        /** @type {DogClient} */
        this.client = client;

        /** @type {Guild} */
        this.guild = client.guilds.cache.get(guildID);

        /** @type {Array<import('soundcloud.ts').SoundcloudTrack | any>} */
        this.tracks = [];

        /** @type {AudioPlayer} */
        this.player = createAudioPlayer();

        /** @type {boolean} */
        this.playing = false;

        /** @type {import('soundcloud.ts').SoundcloudTrack | any} */
        this.currentTrack = null;

        /** @type {boolean} */
        this.loop = false;

        /** @type {boolean} */
        this.loopQueue = false;

        /** @type {boolean} */
        this.paused = false;

        /** @type {TextChannel} */
        this.textChannel = null;

        /** @type {VoiceChannel} */
        this.voiceChannel = null;

        /** @type {VoiceConnection} */
        this.connection = null;

        /** @type {Subscription} */
        this.subscription = null;

        this.player.on("error", async (error) => {
            const errorStack = util.inspect(error, { depth: null });
            logger.error(`[${this.guildID}] 播放音樂時發生錯誤: ${errorStack}`);

            if (this.textChannel?.send) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 播放音樂時發生了錯誤`)
                    .setDescription(`請嘗試將機器人手動中斷連線，或是等待幾秒後再試一次`)
                    .setEmbedFooter();

                this.textChannel.send({ embeds: [embed] });
            };
        });

        this.player.on("stateChange", async (oldState, newState) => {
            // const { getVoiceConnection } = require("@discordjs/voice");
            // logger.debug(`[${this.guildID}] 音樂播放器狀態改變: ${oldState.status} -> ${newState.status}: ${Boolean(getVoiceConnection(this.guildID))}; ${require("util").inspect(this.tracks, { depth: null })}; ${require("util").inspect(this.currentTrack, { depth: null })}`);

            try {
                if (!getVoiceConnection(this.guildID)) {
                    if (this.voiceChannel) {
                        const voiceConnection = joinVoiceChannel({
                            channelId: this.voiceChannel.id,
                            guildId: this.guildID,
                            adapterCreator: this.voiceChannel.guild.voiceAdapterCreator
                        });

                        this.connection = voiceConnection;
                        this.subscribe();
                    } else {
                        if (this.textChannel?.send) {
                            const emoji_cross = await get_emoji("crosS", client);
                            const embed = new EmbedBuilder()
                                .setColor(embed_error_color)
                                .setTitle(`${emoji_cross} | 播放語音時發生錯誤`)
                                .setDescription(`找不到語音頻道，請重新執行播放指令`)
                                .setEmbedFooter();

                            await this.textChannel.send({ embeds: [embed] });

                            // wait 500ms
                            await new Promise(resolve => setTimeout(resolve, 500));

                            this.destroy();
                        } else {
                            this.destroy();
                        };
                    };
                };

                if (newState.status === AudioPlayerStatus.Playing) {
                    // 正在播放
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle("🎵 | 正在播放")
                        .setDescription(`[**${this.currentTrack.title}**](<${this.currentTrack.url}>)`)
                        .setThumbnail(this.currentTrack.thumbnail)
                        .setFooter({ text: `時長: ${formatMinutesSeconds(this.currentTrack.duration)}` })

                    if (this.textChannel?.send) {
                        await this.textChannel.send({ embeds: [embed] });
                    };
                } else if (
                    oldState.status === AudioPlayerStatus.Playing &&
                    newState.status === AudioPlayerStatus.Idle
                ) {
                    // 閒置 (播完了)
                    this.playing = false;
                    this.currentTrack = null;

                    if (this.loop) {
                        // 如果是單曲循環
                        this.play(this.currentTrack.id, this.currentTrack.url, this.currentTrack.source);
                    } else if (this.loopQueue) {
                        // 如果是循環播放清單
                        this.tracks.push(this.tracks.shift());
                        this.play(this.tracks[0].id, this.tracks[0].url, this.tracks[0].source);
                    } else {
                        // 如果是正常播放
                        this.nextTrack();
                    };
                };
            } catch (err) {
                if (err.stack.includes("Missing Access")) return;

                throw err;
            };
        });
    };

    /**
     * 
     * @param {import('soundcloud.ts').SoundcloudTrack | any} track
     */
    addTrack(track) {
        this.tracks.push(track);
    };

    /**
     * 
     * @returns {boolean}
     */
    isPlaying() {
        return this.playing;
    };

    /**
     * 
     * @returns {boolean}
     */
    isPaused() {
        return this.paused;
    };

    /**
     * 
     * @param {string} id
     * @param {string} url
     * @param {string} source
     */
    async play(id, url, source) {
        if (this.playing) {
            this.stopPlaying(true);
        };

        if (!this.connection && this.voiceChannel) {
            const connection = getVoiceConnection(this.guildID);
            if (connection) {
                this.connection = connection;
            } else {
                this.connection = joinVoiceChannel({
                    channelId: this.voiceChannel.id,
                    guildId: this.guildID,
                    adapterCreator: this.guild.voiceAdapterCreator,
                });
            };
        };

        const audioPath = await getTrack({ id, url, source });
        let track = await global._sc.tracks.get(id);
        track = fixStructure([track])[0];

        let inputType = path.extname(audioPath) === ".ogg"
            ? StreamType.OggOpus
            : StreamType.Arbitrary;

        const resource = createAudioResource(
            createReadStream(audioPath),
            { inputType },
        );

        this.player.play(resource);

        this.playing = true;
        this.currentTrack = track;

        this.tracks = this.tracks.filter(track => track.id !== this.currentTrack?.id);
    };

    stopPlaying(force = false) {
        this.tracks = this.tracks.filter(track => track.id !== this.currentTrack?.id);

        this.player.stop(force);

        this.playing = false;
        this.currentTrack = null;
    };

    nextTrack(force = false) {
        this.stopPlaying(force);

        if (this.tracks.length > 0) {
            this.play(this.tracks[0].id, this.tracks[0].url, this.tracks[0].source);
        };
    };

    subscribe() {
        if (this.connection && this.player) {
            this.subscription = this.connection.subscribe(this.player)
            return this.subscription;
        };

        return null;
    };

    unsubscribe() {
        try {
            if (this.subscription) {
                this.subscription.unsubscribe();
                return true;
            };
        } catch (_) {
            return false;
        };

        return false;
    };

    pause() {
        if (!this.paused) {
            this.player.pause();
            this.paused = true;
        };
    };

    unpause() {
        if (this.paused) {
            this.player.unpause();
            this.paused = false;
        };
    };

    destroy() {
        this.unsubscribe();
        this.player.stop(true);
        this.connection.destroy();
        queues.delete(this.guildID);
    };
};



/**
 *
 * @param {string} [guildID]
 * @param {boolean} [create=true]
 * @returns {MusicQueue}
 */
function getQueue(guildID, create = true) {
    const queueExists = queues.get(guildID);
    if (queueExists) {
        return queueExists;
    };

    if (create) {
        const queue = new MusicQueue(guildID);
        queues.set(guildID, queue);

        return queue;
    };

    return null;
};

/**
 *
 * @returns {Collection<any, MusicQueue>}
 */
function getQueues() {
    return queues;
};

/**
 *
 * @param {string} guildID
 * @param {MusicQueue} queue
 * @returns {MusicQueue}
 */
function saveQueue(guildID, queue) {
    queues.set(guildID, queue);

    return queue;
};

function isAxiosResponse(response) {
    return (
        typeof response === 'object' &&
        response !== null &&
        'data' in response &&
        'status' in response &&
        'headers' in response &&
        'config' in response
    );
};

function isSoundCloudTracks(object) {
    return (
        Array.isArray(object) &&
        object.length &&
        typeof object[0] === "object" &&
        'comment_count' in object[0] &&
        'full_duration' in object[0] &&
        'downloadable' in object[0] &&
        'created_at' in object[0] &&
        'description' in object[0] &&
        'media' in object[0] &&
        'title' in object[0] &&
        'publisher_metadata' in object[0] &&
        'duration' in object[0] &&
        'has_downloads_left' in object[0] &&
        'artwork_url' in object[0] &&
        'public' in object[0] &&
        'streamable' in object[0] &&
        'tag_list' in object[0] &&
        'genre' in object[0] &&
        'id' in object[0] &&
        'reposts_count' in object[0] &&
        'state' in object[0] &&
        'label_name' in object[0] &&
        'last_modified' in object[0] &&
        'commentable' in object[0] &&
        'policy' in object[0] &&
        'visuals' in object[0] &&
        'kind' in object[0] &&
        'purchase_url' in object[0] &&
        'sharing' in object[0] &&
        'uri' in object[0] &&
        'secret_token' in object[0] &&
        'download_count' in object[0] &&
        'likes_count' in object[0] &&
        'urn' in object[0] &&
        'license' in object[0] &&
        'purchase_title' in object[0] &&
        'display_date' in object[0] &&
        'embeddable_by' in object[0] &&
        'release_date' in object[0] &&
        'user_id' in object[0] &&
        'monetization_model' in object[0] &&
        'waveform_url' in object[0] &&
        'permalink' in object[0] &&
        'permalink_url' in object[0] &&
        'user' in object[0] &&
        'playback_count' in object[0]
    );
};

/**
 * 
 * @param {Array<any> | axios.AxiosResponse} object
 * @returns {Array<{id: string | number, title: string, url: string, duration: number, thumbnail: string, author: string, source: string}>}
 */
function fixStructure(object) {
    // if (object instanceof axios.AxiosResponse) {
    if (isAxiosResponse(object)) { // jamendo
        // https://developer.jamendo.com/v3.0/tracks

        object = object.data.results
            .filter(track => track.audiodownload_allowed) // 只有track.audiodownload_allowed才能下載
            .map(track => {
                return {
                    id: track.id,
                    title: track.name,
                    url: track.audiodownload,
                    duration: track.duration,
                    thumbnail: track.image,
                    author: track.artist_name,
                    source: "jamendo",
                };
            });
    } else if (isSoundCloudTracks(object)) {
        // https://www.npmjs.com/package/soundcloud.ts
        // https://moestash.github.io/soundcloud.ts/

        object = object.map((track) => {
            return {
                id: track.id,
                title: track.title,
                url: track.uri,
                duration: track.duration,
                thumbnail: track.artwork_url,
                author: track.publisher_metadata?.artist || track.user?.full_name || track.user?.username || "Unknown",
                source: "soundcloud",
            };
        });
    };

    return object;
};

async function downloadFile(url, outputPath) {
    const { createWriteStream } = require("../file.js");
    const response = await fetch(url);

    if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch ${url}. Status: ${response.status}`);
    };

    await pipeline(response.body, createWriteStream(outputPath));
    convertToOgg(outputPath);

    return outputPath;
};

/**
 * 
 * @param {Array<{track: any, id: string, url: string, source: string}>} tracks
 * @returns {Promise<{[key: string]: string}[]>}
 */
async function downloadTracks(tracks) {
    const files = await Promise.all(tracks.map(async (track) => {
        const file = await getTrack(track);

        return { [track.id]: file };
    }));

    return files;
};

/**
 * 
 * @param {{track: any, id: string, url: string, source: string}} param0 
 * @returns {Promise<string>} 保存路徑
 */
async function getTrack({ track, id, url, source }) {
    const { existsSync, unlinkSync, join_temp_folder } = require("../file.js");
    const engine = require(`./${source ?? "soundcloud"}.js`);

    let actualSavePath;
    const savePath = join_temp_folder(`${source}_${id}.mp3`);
    const oggPath = join_temp_folder(`${source}_${id}.ogg`);

    if (existsSync(oggPath)) {
        if (existsSync(savePath)) {
            unlinkSync(savePath);
        };

        return oggPath;
    };

    if (existsSync(savePath)) {
        return savePath;
    };

    if (!url && track) {
        url = track.url;
    } else if (!url && !track) throw new Error(`無效的參數`);

    if (engine.download_track && typeof engine.download_track === "function") {
        actualSavePath = await engine.download_track(url, savePath);
    } else {
        actualSavePath = await downloadFile(url, savePath);
    };

    return actualSavePath;
};

/**
 * 
 * @param {string} query
 * @param {number} amount
 * @returns {Promise<{id: string | number, title: string, url: string, duration: number, thumbnail: string, author: string, source: string}[]>}
 */
async function search_until(query, amount = 25) {
    let results = [];

    for (const engine of musicSearchEngine) {
        const file = require(`./${engine}.js`);

        if (!file) {
            logger.error(`找不到 搜索引擎 ${engine} 的 API模塊: ${engine}.js`);
            continue;
        };

        if (!file.search_tracks) {
            logger.warn(`API模塊 ${engine}.js 沒有搜索歌曲的 search_tracks 函數`);
            continue;
        };

        let tracks = [];
        let output;

        try {
            if (file.get_track_info
                && typeof file.get_track_info === "function"
                && file.validateURL
                && typeof file.validateURL === "function"
                && file.validateURL(query)
            ) {
                try {
                    output = [await file.get_track_info(query)];
                } catch (_) {
                    output = await file.search_tracks(query);
                };
            } else {
                output = await file.search_tracks(query);
            };
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });

            logger.warn(`使用音樂搜索引擎 ${engine}.js 搜索時出錯，忽略: ${errorStack}`);
            continue;
        };

        if (!Array.isArray(output)) {
            logger.warn(`API模塊 ${engine}.js 的 search_tracks 函數沒有返回陣列`);
            continue;
        };

        tracks = output.slice(0, amount);
        tracks = [...new Set(tracks)];
        tracks = fixStructure(tracks);

        if (!file.NO_CACHE) {
            const downloadedFiles = await downloadTracks(tracks.map(track => {
                return {
                    track,
                    id: track.id,
                    url: track.url,
                    source: engine,
                };
            }));

            const failedDownloadSongID = downloadedFiles
                .filter((info) => !Object.values(info)[0])
                .map((info) => {
                    const [file, success] = Object.entries(info)[0];

                    const basename = path.basename(file);
                    let fileExt = basename.split(".");
                    fileExt = fileExt[fileExt.length - 1];

                    const filename = basename.replace(`.${fileExt}`, "");
                    let songID = filename.split("_");
                    songID = songID[songID.length - 1];

                    return songID;
                });

            tracks = tracks.filter(track => !failedDownloadSongID.includes(track.id));
        };

        results.push(...tracks);

        if (results.length >= amount) {
            results = results.slice(0, amount);
            break;
        };
    };

    return results;
};

function getFFmpegPath() {
    const { execSync } = require('child_process');

    const command = process.platform === 'win32' ? 'cmd /C where ffmpeg' : 'which ffmpeg';

    const stdout = execSync(command).toString();

    const ffmpegPath = stdout.trim() || ffmpegInstaller.path;

    return ffmpegPath;
};

function convertToOgg(inputFile, outputFile = null) {
    if (!existsSync(inputFile)) {
        throw new Error(`輸入文件 ${inputFile} 不存在`);
    };

    if (!outputFile) {
        const fileExt = path.extname(inputFile);

        outputFile = inputFile.replace(fileExt, ".ogg");
    };

    if (existsSync(outputFile)) return;

    const ffmpegPath = getFFmpegPath();

    /*
     * -c:a libopus: 使用 libopus 編碼器進行音頻編碼。
     * -b:a 96k: 設定音頻比特率為 96 kbps。
     * -vbr off: 禁用可變比特率（VBR）模式，使用固定比特率（CBR）。
     * -compression_level 10: 設定壓縮級別為 10（範圍通常是 0-10，10 表示最高壓縮）。
     *
    */
    const commandData = {
        cmd: `${ffmpegPath} -i "${inputFile}" -c:a libopus -b:a 96k -vbr off -compression_level 10 "${outputFile}"`,
        input: inputFile,
        output: outputFile,
    };

    if (!global.convertToOggQueue) global.convertToOggQueue = [];
    global.convertToOggQueue.push(commandData);
};

function clear_duplicate_temp() {
    const temp_dir = get_temp_folder();

    const files = readdirSync(temp_dir)
        .filter(file => file.endsWith(".ogg"));

    for (const oggfile of files) {
        const filename = basename(oggfile, ".ogg");
        const oggFilePath = join_temp_folder(oggfile);
        const mp3FilePath = join_temp_folder(`${filename}.mp3`);

        if (existsSync(oggFilePath)) {
            try {
                unlinkSync(mp3FilePath);
            } catch (_) { };
        };
    };
};

module.exports = {
    getQueue,
    getQueues,
    saveQueue,
    getTrack,
    search_until,
    convertToOgg,
    clear_duplicate_temp,
};
