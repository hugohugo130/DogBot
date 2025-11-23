const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { get_logger } = require('./logger.js');
const { database_folder, DEFAULT_VALUES } = require('./config.js');

const logger = get_logger();

// 資料庫檔案路徑
const DB_PATH = path.join(database_folder, 'bot.db');

// 確保資料庫目錄存在
if (!fs.existsSync(database_folder)) {
    fs.mkdirSync(database_folder, { recursive: true });
}

// 初始化資料庫連接
let db = null;

// Queue 系統（在 client login 前用 global，之後用 client）
if (!global.dbQueue) {
    global.dbQueue = [];
    global.dbQueueProcessing = false;
}

/**
 * 初始化資料庫連接
 */
function initDatabase() {
    if (db) return db;

    try {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL'); // 使用 WAL 模式提升並發性能
        logger.info(`資料庫已連接: ${DB_PATH}`);
        createTables();
        return db;
    } catch (error) {
        logger.error(`初始化資料庫失敗: ${error.stack}`);
        throw error;
    }
}

/**
 * 關閉資料庫連接
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        logger.info('資料庫連接已關閉');
    }
}

/**
 * 獲取資料庫實例
 */
function getDatabase() {
    if (!db) {
        return initDatabase();
    }
    return db;
}

/**
 * 創建資料表結構
 */
function createTables() {
    const db = getDatabase();

    // 伺服器設定表
    db.exec(`
        CREATE TABLE IF NOT EXISTS guilds (
            guild_id TEXT PRIMARY KEY,
            rpg INTEGER DEFAULT 0,
            dynamic_voice TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RPG 用戶資料表
    db.exec(`
        CREATE TABLE IF NOT EXISTS rpg_database (
            user_id TEXT PRIMARY KEY,
            money INTEGER DEFAULT 1000,
            hunger INTEGER DEFAULT 20,
            job TEXT DEFAULT NULL,
            fightjob TEXT DEFAULT NULL,
            badge TEXT DEFAULT NULL,
            marry_status INTEGER DEFAULT 0,
            marry_with TEXT DEFAULT NULL,
            marry_time INTEGER DEFAULT 0,
            last_run_timestamp TEXT DEFAULT '{}',
            inventory TEXT DEFAULT '{}',
            transactions TEXT DEFAULT '[]',
            count TEXT DEFAULT '{}',
            privacy TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RPG 商店表
    db.exec(`
        CREATE TABLE IF NOT EXISTS rpg_shop (
            user_id TEXT PRIMARY KEY,
            status INTEGER DEFAULT 1,
            items TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // RPG 農場表
    db.exec(`
        CREATE TABLE IF NOT EXISTS rpg_farm (
            user_id TEXT PRIMARY KEY,
            exp INTEGER DEFAULT 0,
            lvl INTEGER DEFAULT 0,
            water_at INTEGER DEFAULT 0,
            farms TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 烘焙資料表
    db.exec(`
        CREATE TABLE IF NOT EXISTS bake_data (
            user_id TEXT PRIMARY KEY,
            data TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 冶煉資料表
    db.exec(`
        CREATE TABLE IF NOT EXISTS smelt_data (
            user_id TEXT PRIMARY KEY,
            data TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 動態語音表
    db.exec(`
        CREATE TABLE IF NOT EXISTS dvoice (
            channel_id TEXT PRIMARY KEY,
            data TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 音樂資料表
    db.exec(`
        CREATE TABLE IF NOT EXISTS music (
            voice_channel_id TEXT PRIMARY KEY,
            queue TEXT DEFAULT '[]',
            current_index INTEGER DEFAULT 0,
            is_playing INTEGER DEFAULT 0,
            volume REAL DEFAULT 1.0,
            loop_mode TEXT DEFAULT 'off',
            text_channel_id TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 創建索引
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_guilds_updated ON guilds(updated_at);
        CREATE INDEX IF NOT EXISTS idx_rpg_database_updated ON rpg_database(updated_at);
        CREATE INDEX IF NOT EXISTS idx_rpg_shop_updated ON rpg_shop(updated_at);
        CREATE INDEX IF NOT EXISTS idx_rpg_farm_updated ON rpg_farm(updated_at);
    `);
}

/**
 * 添加操作到 Queue
 * @param {Function} operation - 要執行的資料庫操作
 * @param {number} priority - 優先級（數字越小越優先，預設 5）
 */
function addToQueue(operation, priority = 5) {
    const client = global._client;
    const queue = client?.dbQueue || global.dbQueue;

    queue.push({ operation, priority, timestamp: Date.now() });
    queue.sort((a, b) => a.priority - b.priority || a.timestamp - b.timestamp);

    processQueue();
}

/**
 * 處理 Queue 中的操作
 */
async function processQueue() {
    const client = global._client;
    const queueRef = client?.dbQueue || global.dbQueue;

    // 如果已經在處理，就不要重複處理
    if (client?.dbQueueProcessing || global.dbQueueProcessing) {
        return;
    }

    if (client) {
        client.dbQueueProcessing = true;
    } else {
        global.dbQueueProcessing = true;
    }

    while (queueRef.length > 0) {
        const { operation } = queueRef.shift();

        try {
            await operation();
        } catch (error) {
            logger.error(`處理資料庫 Queue 操作時出錯: ${error.stack}`);
        }
    }

    if (client) {
        client.dbQueueProcessing = false;
    } else {
        global.dbQueueProcessing = false;
    }
}

/**
 * 將 client Queue 轉移到 global
 */
function transferQueueToClient(client) {
    if (!client.dbQueue) {
        client.dbQueue = [];
    }

    if (!client.dbQueueProcessing) {
        client.dbQueueProcessing = false;
    }

    // 將 global queue 轉移到 client
    if (global.dbQueue && global.dbQueue.length > 0) {
        client.dbQueue.push(...global.dbQueue);
        global.dbQueue = [];
    }

    logger.info('資料庫 Queue 已轉移到 client');
}

/**
 * 檢查並更新資料表 Schema
 */
function checkAndUpdateSchema() {
    const db = getDatabase();

    try {
        // 檢查各資料表的欄位
        const tables = {
            'guilds': ['guild_id', 'rpg', 'dynamic_voice', 'created_at', 'updated_at'],
            'rpg_database': ['user_id', 'money', 'hunger', 'job', 'fightjob', 'badge',
                'marry_status', 'marry_with', 'marry_time', 'last_run_timestamp',
                'inventory', 'transactions', 'count', 'privacy', 'created_at', 'updated_at'],
            'rpg_shop': ['user_id', 'status', 'items', 'created_at', 'updated_at'],
            'rpg_farm': ['user_id', 'exp', 'lvl', 'water_at', 'farms', 'created_at', 'updated_at'],
            'bake_data': ['user_id', 'data', 'created_at', 'updated_at'],
            'smelt_data': ['user_id', 'data', 'created_at', 'updated_at'],
            'dvoice': ['channel_id', 'data', 'created_at', 'updated_at'],
            'music': ['voice_channel_id', 'queue', 'current_index', 'is_playing',
                'volume', 'loop_mode', 'text_channel_id', 'created_at', 'updated_at']
        };

        for (const [tableName, expectedColumns] of Object.entries(tables)) {
            const columns = db.pragma(`table_info(${tableName})`);
            const columnNames = columns.map(col => col.name);

            const missingColumns = expectedColumns.filter(col => !columnNames.includes(col));

            if (missingColumns.length > 0) {
                logger.warn(`資料表 ${tableName} 缺少欄位: ${missingColumns.join(', ')}`);
                // SQLite 不支援直接添加多個欄位，需要重建資料表
                // 這裡只記錄警告，實際添加欄位需要手動處理
            }
        }

        logger.info('Schema 檢查完成');
    } catch (error) {
        logger.error(`檢查 Schema 時出錯: ${error.stack}`);
    }
}

module.exports = {
    initDatabase,
    closeDatabase,
    getDatabase,
    createTables,
    addToQueue,
    processQueue,
    transferQueueToClient,
    checkAndUpdateSchema,
};
