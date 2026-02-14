/**
 * 資料庫緩存管理模組
 * 提供記憶體緩存功能以減少檔案系統讀取次數
 */


/**
 * 緩存項目結構
 * @typedef {Object} CacheItem
 * @property {any} data - 緩存的資料
 * @property {number} timestamp - 緩存建立時間戳（毫秒）
 */

class CacheManager {
    constructor(ttl = 30 * 60 * 1000) { // 預設 30 分鐘
        /**
         * 緩存儲存
         * @type {Map<string, CacheItem>}
         */
        this.cache = new Map();

        /**
         * 緩存存活時間（毫秒）
         * @type {number}
         */
        this.ttl = ttl;

        /**
         * 統計資訊
         */
        this.stats = {
            hits: 0,      // 緩存命中次數
            misses: 0,    // 緩存未命中次數
            sets: 0,      // 設定緩存次數
            deletes: 0,   // 刪除緩存次數
            expired: 0,   // 過期清除次數
        };

        // 啟動定期清理過期緩存的任務（每 5 分鐘）
        /** @type {NodeJS.Timeout | null} */
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
    };

    /**
     * 生成緩存鍵
     * @param {string} type - 緩存類型（如 'rpg', 'guild'）
     * @param {string} id - 資料 ID
     * @returns {string}
     */
    generateKey(type, id) {
        return `${type}:${id}`;
    };

    /**
     * 檢查緩存項目是否過期
     * @param {CacheItem} item - 緩存項目
     * @returns {boolean}
     */
    isExpired(item) {
        if (!item) return true;

        const age = Date.now() - item.timestamp;
        return age > this.ttl;
    };

    /**
     * 獲取緩存資料
     * @param {string} type - 緩存類型
     * @param {string} id - 資料 ID
     * @returns {any | null} 如果緩存存在且未過期則返回資料，否則返回 null
     */
    get(type, id) {
        const key = this.generateKey(type, id);
        const item = this.cache.get(key);

        if (!item) {
            this.stats.misses++;
            return null;
        };

        if (this.isExpired(item)) {
            this.cache.delete(key);
            this.stats.expired++;
            this.stats.misses++;
            return null;
        };

        this.stats.hits++;

        // 返回深拷貝以避免外部修改影響緩存
        return JSON.parse(JSON.stringify(item.data));
    };

    /**
     * 設定緩存資料
     * @param {string} type - 緩存類型
     * @param {string} id - 資料 ID
     * @param {any} data - 要緩存的資料
     */
    set(type, id, data) {
        const key = this.generateKey(type, id);

        // 深拷貝資料以避免外部修改影響緩存
        const clonedData = JSON.parse(JSON.stringify(data));

        this.cache.set(key, {
            data: clonedData,
            timestamp: Date.now(),
        });

        this.stats.sets++;
    };

    /**
     * 刪除特定緩存
     * @param {string} type - 緩存類型
     * @param {string} id - 資料 ID
     */
    delete(type, id) {
        const key = this.generateKey(type, id);
        const deleted = this.cache.delete(key);

        if (deleted) {
            this.stats.deletes++;
        };

        return deleted;
    };

    /**
     * 清除特定類型的所有緩存
     * @param {string} type - 緩存類型
     */
    clearType(type) {
        let count = 0;
        const prefix = `${type}:`;

        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            };
        };

        this.stats.deletes += count;

        return count;
    };

    /**
     * 清除所有緩存
     */
    clear() {
        const count = this.cache.size;
        this.cache.clear();
        this.stats.deletes += count;
    };

    /**
     * 清理過期的緩存項目
     */
    cleanupExpired() {
        let expiredCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (this.isExpired(item)) {
                this.cache.delete(key);
                expiredCount++;
            };
        };

        if (expiredCount > 0) {
            this.stats.expired += expiredCount;
        };
    };

    /**
     * 獲取緩存統計資訊
     * @returns {{ hits: number, misses: number, sets: number, deletes: number, expired: number, size: number, hitRate: string, ttl: number }} ttl: milliseconds
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`,
            ttl: this.ttl,
        };
    };

    /**
     * 重置統計資訊
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            expired: 0,
        };
    };

    /**
     * 銷毀緩存管理器
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);

            this.cleanupInterval = null;
        };

        this.clear();
    };
};

/**
 * Get the cache manager
 * @param {boolean} [create=true] - Whether to create the cache manager if not exists.
 * @returns {CacheManager | null}
 */
function getCacheManager(create = true) {
    /** @type {CacheManager | null} */ // @ts-ignore
    const global_cacheManager = global._cacheManager;

    return (
        global_cacheManager instanceof CacheManager
            ? global_cacheManager
            : null
    )
        ?? (
            create
                ? new CacheManager(30 * 60 * 1000) // 30 分鐘 TTL
                : null
        );
};

/**
 * 緩存類型常數
 */
const CacheTypes = Object.freeze({
    RPG: 'rpg',
    GUILD: 'guild',
    SHOP: 'shop',
    FARM: 'farm',
});

module.exports = {
    getCacheManager,
    CacheManager,
    CacheTypes,
};
