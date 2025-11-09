const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const { get_music_data, update_music_data, delete_music_data } = require('./file.js');

class MusicPlayer {
    constructor() {
        this.players = new Map();
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

            let url = input;
            let songInfo;

            // 檢查是否為有效的 YouTube URL
            if (this.isValidYouTubeUrl(input)) {
                // 如果是 YouTube URL，直接使用 ytdl-core 獲取資訊
                const info = await ytdl.getInfo(input);
                songInfo = info.videoDetails;
            } else if (this.isValidUrl(input)) {
                // 如果是其他類型的 URL，直接使用
                url = input;
                songInfo = {
                    title: '未知標題',
                    lengthSeconds: 0,
                    thumbnails: []
                };
            } else {
                // 如果是關鍵字，使用 yt-search 進行搜索
                const searchResult = await yts(input);
                if (!searchResult.videos || searchResult.videos.length === 0) {
                    throw new Error('沒有找到相關影片');
                }
                url = searchResult.videos[0].url;
                songInfo = searchResult.videos[0];
            }

            const song = {
                url: url,
                title: songInfo.title || '未知標題',
                duration: this.formatDuration(parseInt(songInfo.lengthSeconds || songInfo.duration?.seconds || 0)),
                requestedBy: requestedBy,
                thumbnail: songInfo.thumbnail || songInfo.thumbnails?.[0]?.url || '',
                addedAt: new Date().toISOString()
            };

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

    async playNext(guildId) {
        const guildPlayer = this.players.get(guildId);
        if (!guildPlayer) return;

        const musicData = get_music_data(guildPlayer.voiceChannel.id);

        if (musicData.queue.length === 0) {
            // 隊列為空，停止播放
            guildPlayer.audioPlayer.stop();
            update_music_data(guildPlayer.voiceChannel.id, {
                isPlaying: false,
                currentIndex: 0
            });
            return;
        }

        const currentIndex = musicData.currentIndex;
        if (currentIndex >= musicData.queue.length) {
            musicData.currentIndex = 0;
        }

        const song = musicData.queue[musicData.currentIndex];

        try {
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

            return song;
        } catch (error) {
            console.error('播放失敗:', error);
            this.handlePlaybackEnd(guildId);
        }
    }

    handlePlaybackEnd(guildId) {
        const guildPlayer = this.players.get(guildId);
        if (!guildPlayer) return;

        const musicData = get_music_data(guildPlayer.voiceChannel.id);

        // 根據循環模式處理下一首
        if (musicData.loopMode === 'single') {
            // 單曲循環，不改變索引
            this.playNext(guildId);
        } else if (musicData.loopMode === 'queue') {
            // 隊列循環
            const nextIndex = (musicData.currentIndex + 1) % musicData.queue.length;
            update_music_data(guildPlayer.voiceChannel.id, {
                currentIndex: nextIndex
            });
            this.playNext(guildId);
        } else {
            // 正常模式
            const nextIndex = musicData.currentIndex + 1;
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
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

    isValidYouTubeUrl(string) {
        try {
            const url = new URL(string);
            return (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com' || url.hostname === 'm.youtube.com' || url.hostname === 'youtu.be');
        } catch (_) {
            return false;
        }
    }
}

module.exports = new MusicPlayer();