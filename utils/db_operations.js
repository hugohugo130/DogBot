/**
 * 資料庫操作函數 - SQL 版本
 * 這個檔案包含所有資料庫操作的 SQL 實作
 */

const { getDatabase, addToQueue } = require('./database.js');
const { get_logger } = require('./logger.js');
const { DEFAULT_VALUES } = require('./config.js');

const logger = get_logger();

/**
 * 從 JSON 字串轉換物件，處理錯誤
 */
function safeJSONParse(jsonString, defaultValue = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logger.warn(`JSON 解析失敗: ${error.message}`);
        return defaultValue;
    }
}

/**
 * 尋找預設值
 */
function find_default_value(filename, default_return = undefined) {
    const path = require('path');
    const basename = path.basename(filename);

    for (const categoryData of Object.values(DEFAULT_VALUES)) {
        if (categoryData.hasOwnProperty(basename)) return categoryData[basename];
    }

    return default_return;
}

// ========================================
// DATABASE (伺服器設定)
// ========================================

function loadData_SQL(guildID = null, mode = 0) {
    if (![0, 1].includes(mode)) {
        throw new TypeError("Invalid mode");
    }

    const database_emptyeg = find_default_value("database.json", {});
    const db = getDatabase();

    if (mode == 0 && guildID) {
        // 取得單一伺服器資料
        const row = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildID);
        
        if (!row) {
            // 不存在則創建
            saveData_SQL(guildID, database_emptyeg);
            return database_emptyeg;
        }

        return {
            rpg: row.rpg === 1,
            dynamicVoice: row.dynamic_voice
        };
    } else {
        // 取得所有伺服器資料
        const rows = db.prepare('SELECT * FROM guilds').all();
        const data = {};
        
        for (const row of rows) {
            data[row.guild_id] = {
                rpg: row.rpg === 1,
                dynamicVoice: row.dynamic_voice
            };
        }
        
        return data;
    }
}

function saveData_SQL(guildID, guildData) {
    const db = getDatabase();
    
    addToQueue(() => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO guilds (guild_id, rpg, dynamic_voice, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(
            guildID,
            guildData.rpg ? 1 : 0,
            guildData.dynamicVoice || null
        );
    }, 5);
}

// ========================================
// RPG 用戶資料
// ========================================

function load_rpg_data_SQL(userid) {
    const rpg_emptyeg = find_default_value("rpg_database.json", {});
    const db = getDatabase();
    
    const row = db.prepare('SELECT * FROM rpg_database WHERE user_id = ?').get(userid);
    
    if (!row) {
        save_rpg_data_SQL(userid, rpg_emptyeg);
        return rpg_emptyeg;
    }
    
    return {
        money: row.money,
        hunger: row.hunger,
        job: row.job,
        fightjob: row.fightjob,
        badge: row.badge,
        marry: {
            status: row.marry_status === 1,
            with: row.marry_with,
            time: row.marry_time
        },
        lastRunTimestamp: safeJSONParse(row.last_run_timestamp, {}),
        inventory: safeJSONParse(row.inventory, {}),
        transactions: safeJSONParse(row.transactions, []),
        count: safeJSONParse(row.count, {}),
        privacy: safeJSONParse(row.privacy, [])
    };
}

function save_rpg_data_SQL(userid, rpgdata) {
    const rpg_emptyeg = find_default_value("rpg_database.json", {});
    const db = getDatabase();
    
    // 先讀取現有資料
    const existing = db.prepare('SELECT * FROM rpg_database WHERE user_id = ?').get(userid);
    const currentData = existing ? {
        money: existing.money,
        hunger: existing.hunger,
        job: existing.job,
        fightjob: existing.fightjob,
        badge: existing.badge,
        marry: {
            status: existing.marry_status === 1,
            with: existing.marry_with,
            time: existing.marry_time
        },
        lastRunTimestamp: safeJSONParse(existing.last_run_timestamp, {}),
        inventory: safeJSONParse(existing.inventory, {}),
        transactions: safeJSONParse(existing.transactions, []),
        count: safeJSONParse(existing.count, {}),
        privacy: safeJSONParse(existing.privacy, [])
    } : rpg_emptyeg;
    
    // 合併資料
    const mergedData = { ...currentData, ...rpgdata };
    
    // 清理 inventory 中數量為 0 或 null 的物品
    if (mergedData.inventory) {
        Object.keys(mergedData.inventory).forEach(item => {
            if (mergedData.inventory[item] === 0 || mergedData.inventory[item] === null) {
                delete mergedData.inventory[item];
            }
        });
    }
    
    addToQueue(() => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO rpg_database (
                user_id, money, hunger, job, fightjob, badge,
                marry_status, marry_with, marry_time,
                last_run_timestamp, inventory, transactions, count, privacy,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(
            userid,
            mergedData.money || 1000,
            mergedData.hunger || 20,
            mergedData.job || null,
            mergedData.fightjob || null,
            mergedData.badge || null,
            mergedData.marry?.status ? 1 : 0,
            mergedData.marry?.with || null,
            mergedData.marry?.time || 0,
            JSON.stringify(mergedData.lastRunTimestamp || {}),
            JSON.stringify(mergedData.inventory || {}),
            JSON.stringify(mergedData.transactions || []),
            JSON.stringify(mergedData.count || {}),
            JSON.stringify(mergedData.privacy || [])
        );
    }, 5);
}

// ========================================
// RPG 商店
// ========================================

function load_shop_data_SQL(userid) {
    const shop_emptyeg = find_default_value("rpg_shop.json", {});
    const db = getDatabase();
    
    const row = db.prepare('SELECT * FROM rpg_shop WHERE user_id = ?').get(userid);
    
    if (!row) {
        save_shop_data_SQL(userid, shop_emptyeg);
        return shop_emptyeg;
    }
    
    return {
        status: row.status === 1,
        items: safeJSONParse(row.items, {})
    };
}

function save_shop_data_SQL(userid, shop_data) {
    const shop_emptyeg = find_default_value("rpg_shop.json", {});
    const db = getDatabase();
    
    const existing = db.prepare('SELECT * FROM rpg_shop WHERE user_id = ?').get(userid);
    const currentData = existing ? {
        status: existing.status === 1,
        items: safeJSONParse(existing.items, {})
    } : shop_emptyeg;
    
    const mergedData = { ...currentData, ...shop_data };
    
    // 清除數量為0的物品
    if (mergedData.items) {
        for (const [item, itemData] of Object.entries(mergedData.items)) {
            if (itemData.amount <= 0) {
                delete mergedData.items[item];
            }
        }
    }
    
    addToQueue(() => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO rpg_shop (user_id, status, items, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(
            userid,
            mergedData.status ? 1 : 0,
            JSON.stringify(mergedData.items || {})
        );
    }, 5);
}

// ========================================
// RPG 農場
// ========================================

function load_farm_data_SQL(userid) {
    const farm_emptyeg = find_default_value("rpg_farm.json", {});
    const db = getDatabase();
    
    const row = db.prepare('SELECT * FROM rpg_farm WHERE user_id = ?').get(userid);
    
    if (!row) {
        save_farm_data_SQL(userid, farm_emptyeg);
        return farm_emptyeg;
    }
    
    return {
        exp: row.exp,
        lvl: row.lvl,
        waterAt: row.water_at,
        farms: safeJSONParse(row.farms, [])
    };
}

function save_farm_data_SQL(userid, farm_data) {
    const farm_emptyeg = find_default_value("rpg_farm.json", {});
    const db = getDatabase();
    
    const existing = db.prepare('SELECT * FROM rpg_farm WHERE user_id = ?').get(userid);
    const currentData = existing ? {
        exp: existing.exp,
        lvl: existing.lvl,
        waterAt: existing.water_at,
        farms: safeJSONParse(existing.farms, [])
    } : farm_emptyeg;
    
    const mergedData = { ...currentData, ...farm_data };
    
    addToQueue(() => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO rpg_farm (user_id, exp, lvl, water_at, farms, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        stmt.run(
            userid,
            mergedData.exp || 0,
            mergedData.lvl || 0,
            mergedData.waterAt || 0,
            JSON.stringify(mergedData.farms || [])
        );
    }, 5);
}

// ========================================
// 烘焙資料
// ========================================

function load_bake_data_SQL() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM bake_data').all();
    
    // 返回所有用戶的烘焙資料
    const result = {};
    for (const row of rows) {
        result[row.user_id] = safeJSONParse(row.data, []);
    }
    
    return result;
}

function save_bake_data_SQL(data) {
    const db = getDatabase();
    
    addToQueue(() => {
        // 清空並重新插入所有資料
        db.prepare('DELETE FROM bake_data').run();
        
        const stmt = db.prepare(`
            INSERT INTO bake_data (user_id, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        
        for (const [userid, userData] of Object.entries(data)) {
            stmt.run(userid, JSON.stringify(userData));
        }
    }, 5);
}

// ========================================
// 冶煉資料
// ========================================

function load_smelt_data_SQL() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM smelt_data').all();
    
    const result = {};
    for (const row of rows) {
        result[row.user_id] = safeJSONParse(row.data, []);
    }
    
    return result;
}

function save_smelt_data_SQL(data) {
    const db = getDatabase();
    
    addToQueue(() => {
        db.prepare('DELETE FROM smelt_data').run();
        
        const stmt = db.prepare(`
            INSERT INTO smelt_data (user_id, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        
        for (const [userid, userData] of Object.entries(data)) {
            stmt.run(userid, JSON.stringify(userData));
        }
    }, 5);
}

// ========================================
// 動態語音
// ========================================

function loadDvoiceData_SQL() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM dvoice').all();
    
    const result = {};
    for (const row of rows) {
        result[row.channel_id] = safeJSONParse(row.data, {});
    }
    
    return result;
}

function saveDvoiceData_SQL(data) {
    const db = getDatabase();
    
    addToQueue(() => {
        db.prepare('DELETE FROM dvoice').run();
        
        const stmt = db.prepare(`
            INSERT INTO dvoice (channel_id, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);
        
        for (const [channelId, channelData] of Object.entries(data)) {
            stmt.run(channelId, JSON.stringify(channelData));
        }
    }, 5);
}

// ========================================
// 音樂資料
// ========================================

function load_music_data_SQL() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM music').all();
    
    const result = {};
    for (const row of rows) {
        result[row.voice_channel_id] = {
            queue: safeJSONParse(row.queue, []),
            currentIndex: row.current_index,
            isPlaying: row.is_playing === 1,
            volume: row.volume,
            loopMode: row.loop_mode,
            textChannelId: row.text_channel_id
        };
    }
    
    return result;
}

function save_music_data_SQL(data) {
    const db = getDatabase();
    
    addToQueue(() => {
        db.prepare('DELETE FROM music').run();
        
        const stmt = db.prepare(`
            INSERT INTO music (
                voice_channel_id, queue, current_index, is_playing,
                volume, loop_mode, text_channel_id, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        for (const [channelId, musicData] of Object.entries(data)) {
            stmt.run(
                channelId,
                JSON.stringify(musicData.queue || []),
                musicData.currentIndex || 0,
                musicData.isPlaying ? 1 : 0,
                musicData.volume || 1.0,
                musicData.loopMode || 'off',
                musicData.textChannelId || ''
            );
        }
    }, 5);
}

function get_music_data_SQL(voiceChannelId) {
    const musicData = load_music_data_SQL();
    const music_emptyeg = find_default_value("music.json", {});
    const channel_emptyeg = music_emptyeg[Object.keys(music_emptyeg)[0]] || {
        queue: [],
        currentIndex: 0,
        isPlaying: false,
        volume: 1.0,
        loopMode: "off",
        textChannelId: ""
    };

    if (!musicData[voiceChannelId]) {
        musicData[voiceChannelId] = { ...channel_emptyeg };
        save_music_data_SQL(musicData);
    }

    return musicData[voiceChannelId];
}

function update_music_data_SQL(voiceChannelId, newData) {
    const musicData = load_music_data_SQL();

    if (!musicData[voiceChannelId]) {
        musicData[voiceChannelId] = {};
    }

    musicData[voiceChannelId] = { ...musicData[voiceChannelId], ...newData };
    save_music_data_SQL(musicData);

    return musicData[voiceChannelId];
}

function delete_music_data_SQL(voiceChannelId) {
    const db = getDatabase();
    
    addToQueue(() => {
        const stmt = db.prepare('DELETE FROM music WHERE voice_channel_id = ?');
        const result = stmt.run(voiceChannelId);
        return result.changes > 0;
    }, 5);
    
    return true;
}

module.exports = {
    // DATABASE
    loadData_SQL,
    saveData_SQL,
    // RPG
    load_rpg_data_SQL,
    save_rpg_data_SQL,
    load_shop_data_SQL,
    save_shop_data_SQL,
    load_farm_data_SQL,
    save_farm_data_SQL,
    load_bake_data_SQL,
    save_bake_data_SQL,
    load_smelt_data_SQL,
    save_smelt_data_SQL,
    // DVOICE
    loadDvoiceData_SQL,
    saveDvoiceData_SQL,
    // MUSIC
    load_music_data_SQL,
    save_music_data_SQL,
    get_music_data_SQL,
    update_music_data_SQL,
    delete_music_data_SQL,
};
