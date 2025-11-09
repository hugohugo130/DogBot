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
        // 如果是有效的 YouTube URL，直接返回
        if (isValidYouTubeUrl(query)) {
            return [{
                name: `🔗 YouTube 連結: ${query.substring(0, 80)}...`,
                value: query
            }];
        }

        // 如果是其他類型的 URL，直接返回
        if (isValidUrl(query)) {
            return [{
                name: `🔗 外部連結: ${query.substring(0, 80)}...`,
                value: query
            }];
        }

        // 關鍵字搜索
        return await handleKeywordSearch(query);
    } catch (error) {
        console.error('搜索失敗:', error);
        return [{
            name: '❌ 搜索時發生錯誤，請稍後再試',
            value: 'error'
        }];
    }
}

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
        }

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
    }
}

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
    }
}

/**
 * 檢查是否為有效的 YouTube URL
 * @param {string} string 
 * @returns {boolean}
 */
function isValidYouTubeUrl(string) {
    try {
        const url = new URL(string);
        return (url.hostname === 'youtube.com' ||
            url.hostname === 'www.youtube.com' ||
            url.hostname === 'm.youtube.com' ||
            url.hostname === 'youtu.be');
    } catch (_) {
        return false;
    }
}

module.exports = {
    searchVideos
};