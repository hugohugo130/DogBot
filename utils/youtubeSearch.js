const yts = require('yt-search');

/**
 * 搜索影片並返回 AutoComplete 格式的結果
 * @param {string} query - 搜索查詢
 * @returns {Promise<Array<{name: string, value: string}>>}
 */
async function searchVideos(query) {
    if (!query || query.trim() === '') {
        return [];
    }

    try {
        // 如果是有效的 URL，直接返回
        if (isValidUrl(query)) {
            return await handleUrl(query);
        } else {
            // 關鍵字搜索
            return await handleKeywordSearch(query);
        }
    } catch (error) {
        console.error('搜索失敗:', error);
        return [{
            name: '❌ 搜索時發生錯誤，請稍後再試',
            value: 'error'
        }];
    };
};

/**
 * 處理 URL 輸入
 * @param {string} url 
 * @returns {Promise<Array<{name: string, value: string}>>}
 */
async function handleUrl(url) {
    try {
        // 如果是 YouTube URL，嘗試獲取影片資訊
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = extractVideoId(url);
            if (videoId) {
                const result = await yts({ videoId });
                if (result.video) {
                    return [{
                        name: `🎵 ${result.video.title} - ${result.video.author.name}`.substring(0, 100),
                        value: url
                    }];
                };
            };
        };

        // 其他類型的 URL
        return [{
            name: `🔗 使用連結: ${url.substring(0, 80)}...`,
            value: url
        }];
    } catch (error) {
        // 如果無法解析 URL，仍然返回它
        return [{
            name: `🔗 使用連結: ${url.substring(0, 80)}...`,
            value: url
        }];
    };
};

/**
 * 處理關鍵字搜索
 * @param {string} query 
 * @returns {Promise<Array<{name: string, value: string}>>}
 */
async function handleKeywordSearch(query) {
    try {
        const searchResult = await yts(query);

        if (!searchResult.videos || searchResult.videos.length === 0) {
            return [{
                name: '❌ 沒有找到相關影片，請嘗試其他關鍵字',
                value: 'not_found'
            }];
        };

        // 返回前 25 個結果（Discord AutoComplete 限制）
        return searchResult.videos.slice(0, 25).map(video => ({
            name: `🎵 ${video.title} - ${video.author.name} (${video.timestamp})`.substring(0, 100),
            value: video.url
        }));
    } catch (error) {
        console.error('關鍵字搜索失敗:', error);
        return [{
            name: '❌ 搜索失敗，請稍後再試',
            value: 'search_error'
        }];
    };
};

/**
 * 檢查是否為有效 URL
 * @param {string} string 
 * @returns {boolean}
 */
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    };
};

/**
 * 從 YouTube URL 提取影片 ID
 * @param {string} url 
 * @returns {string|null}
 */
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

module.exports = {
    searchVideos
};