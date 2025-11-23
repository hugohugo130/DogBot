const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { isDeepStrictEqual } = require("node:util");
const { Logger } = require("winston");
const { VoiceChannel } = require("discord.js");
const axios = require("axios");

const { INDENT, DATABASE_FILES, DEFAULT_VALUES, database_folder, probabilities } = require("./config.js");
const { get_logger, getCallerModuleName } = require("./logger.js");
const { sleep } = require("./sleep.js");
const { getDatabase, addToQueue } = require("./SQLdatabase.js");

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const mkdirSync = fs.mkdirSync;
const mkdir = fsp.mkdir;
const createWriteStream = fs.createWriteStream;
const readdir = fsp.readdir;
const join = path.join;
const full_path = path.resolve;
const basename = path.basename;
const dirname = path.dirname;
const logger = get_logger();

/**
 * 
 * @param {fs.PathOrFileDescriptor} file_path 
 * @param {{encoding?: null | undefined, flag?: string | undefined, return?: any | undefined} | null} options 
 * @returns {NonSharedBuffer}
 */
function readFileSync(file_path, options = null) {
    const filename = path.basename(file_path);

    if (!existsSync(file_path) && DATABASE_FILES.includes(filename)) {
        if (typeof options === 'object' && options?.return) return stringify(options.return);

        const default_value = DEFAULT_VALUES.single[filename]
        const other_category_default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            return acc || category[filename];
        }, undefined);

        if (!default_value) {
            if (!other_category_default_value) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return stringify({});
        } else {
            writeJsonSync(file_path, default_value);
            return stringify((default_value));
        };
    };

    return fs.readFileSync(file_path, options);
};

/**
 * 從 JSON 字串轉換物件，處理錯誤
 */
function safeJSONParse(jsonString, defaultValue = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logger.warn(`JSON 解析失敗: ${error.message}`);
        return defaultValue;
    };
};

function needsStringify(obj) {
    if (typeof obj === 'string') {
        return false;
    };

    if (typeof obj !== 'object' || obj === null) {
        return false;
    };

    return true;
};

function stringify(data, replacer = "") {
    if (!needsStringify(data)) return data;
    return JSON.stringify(data, replacer, INDENT);
};

function writeSync(path, data, p = false) {
    if (path.endsWith(".json") && !p) return writeJsonSync(path, data);

    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    };

    if (typeof data !== "string") logger.warn(`[writeSync] gave a ${typeof data} instead of string. Called from\n${getCallerModuleName(null)}`);

    fs.writeFileSync(path, data);
};

async function read(path, encoding = "utf-8") {
    return await fsp.readFile(path, {
        encoding,
    });
};

async function write(path, data, p = false) {
    if (path.endsWith(".json") && !p) return await writeJson(path, data);

    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdir(dir, { recursive: true });
    };

    await fsp.writeFile(path, data);
};

function readJsonSync(path) {
    return JSON.parse(readFileSync(path));
};

function writeJsonSync(path, data, replacer = "") {
    data = stringify(data, replacer)
    writeSync(path, data, true);
    return data;
};

async function readJson(path) {
    return JSON.parse(await read(path));
};

async function writeJson(path, data, replacer = "") {
    data = stringify(data, replacer)
    await write(path, data, true);
    return data;
};

function readScheduleSync() {
    const { scheduleEverysec, scheduleEverymin, scheduleEvery5min } = require("./config.js");

    const everysec = existsSync(scheduleEverysec) ? readdirSync(scheduleEverysec, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverysec}/${file}`) : [];

    const everymin = existsSync(scheduleEverymin) ? readdirSync(scheduleEverymin, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverymin}/${file}`) : [];

    const every5min = existsSync(scheduleEvery5min) ? readdirSync(scheduleEvery5min, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEvery5min}/${file}`) : [];

    return [
        everysec,
        everymin,
        every5min,
    ];
};

/**
 * 
 * @param {string} filename 
 * @returns {string}
 */
function join_db_folder(filename) {
    const basename = path.basename(filename);
    return join(database_folder, basename);
};

/**
 * 
 * @returns {Promise<{everysec: string[], everymin: string[]}>}
 */
async function readSchedule() {
    const { scheduleEverysec, scheduleEverymin } = require("./config.js");
    const everysec = await readdir(scheduleEverysec, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `../schedule/everysec/${file}`);


    const everymin = await readdir(scheduleEverymin, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `../schedule/everysec/${file}`);

    return {
        everysec,
        everymin,
    };
};

/**
 * 
 * @param {string} filename 
 * @param {Logger} log 
 * @param {number} maxRetries 
 * @returns {Promise<{same: boolean, localContent: string, remoteContent: string}>}
 */
async function compareLocalRemote(filename, log = logger, maxRetries = 3) {
    const { getServerIPSync } = require("./getSeverIPSync.js");

    let localContent;
    let remoteContent;

    const basename_filename = path.basename(filename);
    const local_filepath = join_db_folder(basename_filename);

    // 獲取遠端伺服器地址
    const { IP: serverIP, PORT } = getServerIPSync();
    const SERVER_URL = `http://${serverIP}:${PORT}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // 讀取本地檔案
        try {
            if (existsSync(local_filepath)) {
                localContent = readFileSync(local_filepath, {
                    encoding: "utf8",
                    return: null,
                });
                // 嘗試解析並格式化 JSON 以便比較
                try {
                    localContent = stringify(JSON.parse(localContent));
                } catch (e) {
                    // 不是 JSON 格式，保持原樣
                }
            } else {
                localContent = null;
            }
        } catch (err) {
            log.error(`讀取本地檔案內容時遇到錯誤: ${err.stack}`);
            localContent = null;
        };

        // 從遠端伺服器獲取檔案
        try {
            const response = await axios.get(`${SERVER_URL}/files/${basename_filename}`);
            remoteContent = stringify(response.data);
        } catch (err) {
            if (err.response?.status === 404) {
                log.warn(`遠端檔案不存在: ${basename_filename}`);
                remoteContent = null;
            } else if (err.code === 'ECONNRESET' || err.message?.includes("socket hang up")) {
                if (attempt < maxRetries) {
                    log.warn(`連接遠端伺服器時中斷，正在重試 (${attempt}/${maxRetries})...`);
                    sleep(1000);
                    continue;
                } else {
                    log.error(`獲取遠端檔案內容時遇到錯誤: ${err.message}`);
                    remoteContent = null;
                };
            } else {
                log.error(`獲取遠端檔案內容時遇到錯誤: ${err.stack}`);
                remoteContent = null;
            };
        };

        break;
    };

    // 比較內容
    const same = localContent && remoteContent && isDeepStrictEqual(localContent, remoteContent);

    return [same, localContent, remoteContent];
};

/**
 * 
 * @param {string} filename 
 * @param {any} default_return 
 * @returns {object | any}
 */
function find_default_value(filename, default_return = undefined) {
    const basename = path.basename(filename);

    for (const categoryData of Object.values(DEFAULT_VALUES)) {
        if (categoryData.hasOwnProperty(basename)) return categoryData[basename];
    };

    return default_return;
};

/**
 * 
 * @param {string} item 
 * @param {any} default_return 
 * @returns {[number, number, number] | any}
 */
function get_probability_of_id(item, default_return = undefined) {
    for (const categoryData of Object.values(probabilities)) {
        if (categoryData.hasOwnProperty(item)) return categoryData[item];
    };

    return default_return;
};

/**
 * 
 * @param {object} data 
 * @param {object} follow 
 * @returns {object}
 */
function order_data(data, follow) {
    if (data instanceof Array) {
        logger.warn(`list cannot be ordered, called from ${getCallerModuleName(null)}`);
        return data;
    };

    const orderedData = {};
    for (const key of Object.keys(follow)) {
        orderedData[key] = data[key] ?? follow[key];
    };

    return orderedData;
};

/*
██████╗  █████╗ ████████╗ █████╗ ██████╗  █████╗ ███████╗███████╗
██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝
██║  ██║███████║   ██║   ███████║██████╔╝███████║███████╗█████╗  
██║  ██║██╔══██║   ██║   ██╔══██║██╔══██╗██╔══██║╚════██║██╔══╝  
██████╔╝██║  ██║   ██║   ██║  ██║██████╔╝██║  ██║███████║███████╗
╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
*/

function loadData(guildID = null, mode = 0) {
    /*
    mode: 0 取得伺服器資料, 1 取得所有資料
    */
    if (![0, 1].includes(mode)) {
        throw new TypeError("Invalid mode");
    };

    const database_emptyeg = find_default_value("database.json", {});
    const db = getDatabase();

    if (mode == 0 && guildID) {
        // 取得單一伺服器資料
        const row = db.prepare('SELECT * FROM guilds WHERE guild_id = ?').get(guildID);

        if (!row) {
            // 不存在則創建
            saveData(guildID, database_emptyeg);
            return database_emptyeg;
        };

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
        };

        return data;
    };
};

function saveData(guildID, guildData) {
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
};

/*
██████╗ ██████╗  ██████╗ 
██╔══██╗██╔══██╗██╔════╝ 
██████╔╝██████╔╝██║  ███╗
██╔══██╗██╔═══╝ ██║   ██║
██║  ██║██║     ╚██████╔╝
╚═╝  ╚═╝╚═╝      ╚═════╝ 
*/

function setRPG(guildID, enable) {
    if (![true, false].includes(enable)) throw new Error(`Invalid mode: ${enable}`)

    const data = loadData(guildID);
    data["rpg"] = enable;

    saveData(guildID, data);
};

function load_rpg_data(userid) {
    const rpg_emptyeg = find_default_value("rpg_database.json", {});
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM rpg_database WHERE user_id = ?').get(userid);

    if (!row) {
        save_rpg_data(userid, rpg_emptyeg);
        return rpg_emptyeg;
    };

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
};

function save_rpg_data(userid, rpgdata) {
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
    };

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
};

function load_shop_data(userid) {
    const shop_emptyeg = find_default_value("rpg_shop.json", {});
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM rpg_shop WHERE user_id = ?').get(userid);

    if (!row) {
        save_shop_data(userid, shop_emptyeg);
        return shop_emptyeg;
    };

    return {
        status: row.status === 1,
        items: safeJSONParse(row.items, {})
    };
};

function save_shop_data(userid, shop_data) {
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
        };
    };

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
};

/**
 * 
 * @param {string} userid 
 * @returns {{lvl: number, exp: number, waterAt: number, farms: Array<Object}}
 */
function load_farm_data(userid) {
    const farm_emptyeg = find_default_value("rpg_farm.json", {});
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM rpg_farm WHERE user_id = ?').get(userid);

    if (!row) {
        save_farm_data(userid, farm_emptyeg);
        return farm_emptyeg;
    };

    return {
        exp: row.exp,
        lvl: row.lvl,
        waterAt: row.water_at,
        farms: safeJSONParse(row.farms, [])
    };
};

/**
 * 
 * @param {string} userid 
 * @param {Array} farm_data 
 */
function save_farm_data(userid, farm_data) {
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
};

function load_bake_data() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM bake_data').all();

    // 返回所有用戶的烘焙資料
    const result = {};
    for (const row of rows) {
        result[row.user_id] = safeJSONParse(row.data, []);
    };

    return result;
};

function save_bake_data(data) {
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
};

function load_smelt_data() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM smelt_data').all();

    const result = {};
    for (const row of rows) {
        result[row.user_id] = safeJSONParse(row.data, []);
    };

    return result;
};

function save_smelt_data(data) {
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
};

/*
██████╗ ██╗   ██╗ ██████╗ ██╗ ██████╗███████╗
██╔══██╗██║   ██║██╔═══██╗██║██╔════╝██╔════╝
██║  ██║██║   ██║██║   ██║██║██║     █████╗  
██║  ██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝  
██████╔╝ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗
╚═════╝   ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝
*/

function loadDvoiceData() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM dvoice').all();

    const result = {};
    for (const row of rows) {
        result[row.channel_id] = safeJSONParse(row.data, {});
    };

    return result;
};

function saveDvoiceData(data) {
    const db = getDatabase();

    addToQueue(() => {
        db.prepare('DELETE FROM dvoice').run();

        const stmt = db.prepare(`
            INSERT INTO dvoice (channel_id, data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `);

        for (const [channelId, channelData] of Object.entries(data)) {
            stmt.run(channelId, JSON.stringify(channelData));
        };
    }, 5);
};

/*
███████╗███████╗ █████╗ ████████╗██╗   ██╗██████╗ ███████╗███████╗
██╔════╝██╔════╝██╔══██╗╚══██╔══╝██║   ██║██╔══██╗██╔════╝██╔════╝
█████╗  █████╗  ███████║   ██║   ██║   ██║██████╔╝█████╗  ███████╗
██╔══╝  ██╔══╝  ██╔══██║   ██║   ██║   ██║██╔══██╗██╔══╝  ╚════██║
██║     ███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗███████║
╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
*/

/**
 * 
 * @param {string} guildID 
 * @param {VoiceChannel} channel 
 */
function setDynamicVoice(guildID, channel) {
    const data = loadData(guildID);
    data["dynamicVoice"] = channel.id;

    saveData(guildID, data);
};


/**
 * 
 * @param {string} guildID 
 * @returns {string}
 */
function getDynamicVoice(guildID) {
    const data = loadData(guildID);
    return data["dynamicVoice"];
};

/*
███╗   ███╗██╗   ██╗███████╗██╗ ██████╗
████╗ ████║██║   ██║██╔════╝██║██╔════╝
██╔████╔██║██║   ██║███████╗██║██║     
██║╚██╔╝██║██║   ██║╚════██║██║██║     
██║ ╚═╝ ██║╚██████╔╝███████║██║╚██████╗
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝
*/

function load_music_data() {
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
    };

    return result;
};

function save_music_data(data) {
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
        };
    }, 5);
};

function get_music_data(voiceChannelId) {
    const musicData = load_music_data();
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
        save_music_data(musicData);
    };

    return musicData[voiceChannelId];
};

function update_music_data(voiceChannelId, newData) {
    const musicData = load_music_data();

    if (!musicData[voiceChannelId]) {
        musicData[voiceChannelId] = {};
    };

    musicData[voiceChannelId] = { ...musicData[voiceChannelId], ...newData };
    save_music_data(musicData);

    return musicData[voiceChannelId];
};

function delete_music_data(voiceChannelId) {
    const db = getDatabase();

    addToQueue(() => {
        const stmt = db.prepare('DELETE FROM music WHERE voice_channel_id = ?');
        const result = stmt.run(voiceChannelId);
        return result.changes > 0;
    }, 5);

    return true;
};

module.exports = {
    readFileSync,
    writeSync,
    read,
    write,
    readJsonSync,
    writeJsonSync,
    readJson,
    writeJson,
    existsSync,
    readdirSync,
    readdir,
    mkdirSync,
    mkdir,
    createWriteStream,
    readScheduleSync,
    readSchedule,
    join,
    full_path,
    basename,
    dirname,
    // tools
    join_db_folder,
    compareLocalRemote,
    find_default_value,
    get_probability_of_id,
    order_data,
    // database
    loadData,
    saveData,
    // RPG
    setRPG,
    load_rpg_data,
    save_rpg_data,
    load_shop_data,
    save_shop_data,
    load_farm_data,
    save_farm_data,
    load_bake_data,
    save_bake_data,
    load_smelt_data,
    save_smelt_data,
    // dvoice
    loadDvoiceData,
    saveDvoiceData,
    // features
    setDynamicVoice,
    getDynamicVoice,
    stringify,
    // music
    load_music_data,
    save_music_data,
    get_music_data,
    update_music_data,
    delete_music_data,
};
