const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const { Innertube } = require('youtubei.js');
const yts = require('yt-search');
const { get_music_data, update_music_data, delete_music_data } = require('./file.js');

class MusicPlayer {
    constructor() {
        this.players = new Map();
        this.youtube = null;
        this.initializeYouTube();
    }

    async initializeYouTube() {
        try {
            this.youtube = await Innertube.create();
            console.log('YouTubei.js 初始化成功');
        } catch (error) {
            console.error('YouTubei.js 初始化失敗:', error);
        }
    }

    async joinVoiceChannel(voiceChannel, textChannel) {
        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            const audioPlayer = createAudioPlayer();
            connection.subscribe(audioPlayer);

            // 保存播放器狀態
            this.players.set(voiceChannel.guild.id, {
                connection,
                audioPlayer,
                voiceChannel,
                textChannel
            });

            // 更新音樂資料
            update_music_data(voiceChannel.id, {
                textChannelId: textChannel.id,
                isPlaying: false
            });

            return connection;
        } catch (error) {
            console.error('加入語音頻道失敗:', error);
            throw error;
        }
    }

    async playMusic(voiceChannel, textChannel, input, requestedBy) {
        try {
            // 確保機器人已經加入語音頻道
            let connection = getVoiceConnection(voiceChannel.guild.id);
            if (!connection) {
                connection = await this.joinVoiceChannel(voiceChannel, textChannel);
            }

            const guildPlayer = this.players.get(voiceChannel.guild.id);
            if (!guildPlayer) {
                throw new Error('播放器未初始化');
            }

            let song;

            // 檢查是否為有效的 URL
            if (this.isValidUrl(input)) {
                // 如果是 URL，直接使用
                song = await this.createSongFromUrl(input, requestedBy);
            } else {
                // 如果是關鍵字，進行搜索
                song = await this.createSongFromSearch(input, requestedBy);
            }

            // 確保歌曲 URL 有效
            if (!song || !song.url) {
                throw new Error('無法獲取有效的歌曲 URL');
            }

            // 更新隊列
            const musicData = get_music_data(voiceChannel.id);
            const newQueue = [...musicData.queue, song];
            update_music_data(voiceChannel.id, {
                queue: newQueue,
                currentIndex: musicData.currentIndex,
                isPlaying: true,
                textChannelId: textChannel.id
            });

            // 如果當前沒有在播放，開始播放
            if (musicData.queue.length === 0 || !musicData.isPlaying) {
                await this.playNext(voiceChannel.guild.id);
            }

            return song;
        } catch (error) {
            console.error('播放音樂失敗:', error);
            throw error;
        }
    }

    async createSongFromUrl(url, requestedBy) {
        try {
            // 等待 YouTube 客戶端初始化
            if (!this.youtube) {
                await this.initializeYouTube();
            }

            // 使用 youtubei.js 獲取影片資訊
            const info = await this.youtube.getInfo(url);
            const videoDetails = info.basic_info;

            return {
                url: url,
                title: videoDetails.title || '未知標題',
                duration: this.formatDuration(videoDetails.duration || 0),
                requestedBy: requestedBy,
                thumbnail: this.getBestThumbnail(info.thumbnail?.thumbnails),
                addedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('從 URL 創建歌曲失敗:', error);
            // 如果 youtubei.js 失敗，回退到 yt-search
            return await this.createSongFromSearch(url, requestedBy);
        }
    }

    async createSongFromSearch(query, requestedBy) {
        try {
            // 使用 yt-search 進行搜索
            const searchResult = await yts(query);

            if (!searchResult.videos || searchResult.videos.length === 0) {
                throw new Error('沒有找到相關影片');
            }

            const video = searchResult.videos[0];

            return {
                url: video.url,
                title: video.title || '未知標題',
                duration: video.timestamp || this.formatDuration(video.duration?.seconds || 0),
                requestedBy: requestedBy,
                thumbnail: video.thumbnail || '',
                addedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('從搜索創建歌曲失敗:', error);
            throw error;
        }
    }

    async playNext(guildId) {
        const guildPlayer = this.players.get(guildId);
        if (!guildPlayer) {
            console.error('找不到 guildPlayer for guildId:', guildId);
            return;
        }

        const musicData = get_music_data(guildPlayer.voiceChannel.id);

        if (!musicData.queue || musicData.queue.length === 0) {
            // 隊列為空，停止播放
            guildPlayer.audioPlayer.stop();
            update_music_data(guildPlayer.voiceChannel.id, {
                isPlaying: false,
                currentIndex: 0
            });
            return;
        }

        const currentIndex = musicData.currentIndex || 0;
        if (currentIndex >= musicData.queue.length) {
            musicData.currentIndex = 0;
        }

        const song = musicData.queue[musicData.currentIndex];

        // 確保歌曲和 URL 存在
        if (!song || !song.url) {
            console.error('歌曲或 URL 不存在:', song);
            this.handlePlaybackEnd(guildId);
            return;
        }

        console.log('準備播放歌曲:', song.title, 'URL:', song.url);

        try {
            // 使用 ytdl-core 作為最後的手段
            const ytdl = require('ytdl-core');

            const stream = ytdl(song.url, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            const resource = createAudioResource(stream);

            guildPlayer.audioPlayer.play(resource);

            // 更新當前播放索引
            update_music_data(guildPlayer.voiceChannel.id, {
                currentIndex: musicData.currentIndex,
                isPlaying: true
            });

            // 設置播放結束監聽器
            guildPlayer.audioPlayer.once(AudioPlayerStatus.Idle, () => {
                this.handlePlaybackEnd(guildId);
            });

            console.log('開始播放:', song.title);
            return song;
        } catch (error) {
            console.error('播放失敗:', error);
            // 嘗試跳過當前歌曲並播放下一首
            this.handlePlaybackEnd(guildId);
        }
    }

    handlePlaybackEnd(guildId) {
        const guildPlayer = this.players.get(guildId);
        if (!guildPlayer) return;

        const musicData = get_music_data(guildPlayer.voiceChannel.id);

        if (!musicData.queue || musicData.queue.length === 0) {
            update_music_data(guildPlayer.voiceChannel.id, {
                isPlaying: false,
                currentIndex: 0
            });
            return;
        }

        // 根據循環模式處理下一首
        if (musicData.loopMode === 'single') {
            // 單曲循環，不改變索引
            this.playNext(guildId);
        } else if (musicData.loopMode === 'queue') {
            // 隊列循環
            const nextIndex = ((musicData.currentIndex || 0) + 1) % musicData.queue.length;
            update_music_data(guildPlayer.voiceChannel.id, {
                currentIndex: nextIndex
            });
            this.playNext(guildId);
        } else {
            // 正常模式
            const nextIndex = (musicData.currentIndex || 0) + 1;
            if (nextIndex < musicData.queue.length) {
                update_music_data(guildPlayer.voiceChannel.id, {
                    currentIndex: nextIndex
                });
                this.playNext(guildId);
            } else {
                // 隊列結束
                update_music_data(guildPlayer.voiceChannel.id, {
                    isPlaying: false,
                    currentIndex: 0
                });
            }
        }
    }

    async leaveVoiceChannel(guildId) {
        const guildPlayer = this.players.get(guildId);
        if (!guildPlayer) return false;

        try {
            guildPlayer.audioPlayer.stop();
            guildPlayer.connection.destroy();
            this.players.delete(guildId);

            // 清除音樂資料
            delete_music_data(guildPlayer.voiceChannel.id);

            return true;
        } catch (error) {
            console.error('離開語音頻道失敗:', error);
            return false;
        }
    }

    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getBestThumbnail(thumbnails) {
        if (!thumbnails || thumbnails.length === 0) return '';

        // 返回最高質量的縮圖
        return thumbnails[thumbnails.length - 1].url;
    }

    isInVoiceChannel(guildId) {
        return this.players.has(guildId);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

module.exports = new MusicPlayer();