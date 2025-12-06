const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const util = require('node:util');
const { Logger } = require("winston");
const { VoiceChannel } = require("discord.js");
const axios = require("axios");

const { INDENT, DATABASE_FILES, DEFAULT_VALUES, database_folder, probabilities } = require("./config.js");
const { get_logger, getCallerModuleName } = require("./logger.js");
const { sleep } = require("./sleep.js");

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
 * @argument {string} jsonString - 要解析的 JSON 字串
 * @argument {any} defaultValue - 解析失敗時的預設值
 * @returns {object | any} 解析後的物件或預設值
 */
function safeJSONParse(jsonString, defaultValue = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        const errorStack = util.inspect(error, { depth: null });

        logger.warn(`JSON 解析失敗: ${errorStack}`);
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
    return safeJSONParse(readFileSync(path));
};

function writeJsonSync(path, data, replacer = "") {
    data = stringify(data, replacer)
    writeSync(path, data, true);
    return data;
};

async function readJson(path) {
    return safeJSONParse(await read(path));
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
 * @param {Logger | Console} log 
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
                    localContent = stringify(safeJSONParse(localContent));
                } catch (e) {
                    // 不是 JSON 格式，保持原樣
                };
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
    const same = localContent && remoteContent && util.isDeepStrictEqual(localContent, remoteContent);

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

    const { database_file } = require("./config.js");
    const database_emptyeg = find_default_value("database.json", {});

    if (!fs.existsSync(database_file)) return {};

    const rawData = readFileSync(database_file);
    let data = safeJSONParse(rawData);

    if (mode == 0 && guildID) {
        if (!data[guildID]) {
            data[guildID] = database_emptyeg;
            saveData(guildID, data[guildID]);
        };

        return data[guildID];
    } else {
        return data;
    };
};

function saveData(guildID, guildData) {
    const { database_file } = require("./config.js");
    const database_emptyeg = find_default_value("database.json", {});

    let data = {};

    if (fs.existsSync(database_file)) {
        const rawData = readFileSync(database_file);
        data = safeJSONParse(rawData);
    };

    if (!data[guildID]) {
        data[guildID] = database_emptyeg;
    };

    data[guildID] = { ...data[guildID], ...guildData };
    data[guildID] = order_data(data[guildID], database_emptyeg)

    // 增加重試機制
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
        try {
            writeJsonSync(database_file, data);
            break;
        } catch (error) {
            lastError = error;
            retries--;
            if (retries > 0) {
                sleep(1000);
            };
        };
    };

    if (retries === 0) {
        throw lastError;
    };
};

/*
██████╗ ██████╗  ██████╗ 
██╔══██╗██╔══██╗██╔════╝ 
██████╔╝██████╔╝██║  ███╗
██╔══██╗██╔═══╝ ██║   ██║
██║  ██║██║     ╚██████╔╝
╚═╝  ╚═╝╚═╝      ╚═════╝ 
*/

/**
 * 
 * @param {string} guildID 
 * @param {boolean} enable 
 */
function setRPG(guildID, enable) {
    if (![true, false].includes(enable)) throw new Error(`Invalid mode: ${enable}`)

    const data = loadData(guildID);
    data["rpg"] = enable;

    saveData(guildID, data);
};

/**
 * 
 * @param {string} guildID 
 * @param {string} prefix 
 * @returns {string | null}
 */
function addPrefix(guildID, prefix) {
    if (!typeof prefix === "string") throw new Error(`Invalid prefix: ${enable}`)

    const data = loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
    };

    if (data["prefix"].includes(prefix)) return null;

    data["prefix"].push(prefix);

    saveData(guildID, data);

    return prefix;
};

/**
 * 
 * @param {string} guildID 
 * @param {string} prefix 
 * @returns {string | null}
 */
function rmPrefix(guildID, prefix) {
    if (!typeof prefix === "string") throw new Error(`Invalid prefix: ${enable}`)

    const data = loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
    };

    if (!data["prefix"].includes(prefix)) return null;

    data["prefix"] = data["prefix"].filter(p => p !== prefix);

    saveData(guildID, data);

    return prefix;
};

/**
 * 
 * @param {string} guildID 
 * @returns {string[]}
 */
function getPrefixes(guildID) {
    const data = loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
        saveData(guildID, data);
    };

    return data["prefix"];
};

function load_rpg_data(userid) {
    const { rpg_database_file } = require("./config.js");

    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    if (fs.existsSync(rpg_database_file)) {
        const rawData = readFileSync(rpg_database_file);
        const data = safeJSONParse(rawData);

        if (!data[userid]) {
            save_rpg_data(userid, rpg_emptyeg);
            return rpg_emptyeg;
        };
        return order_data(data[userid], rpg_emptyeg);
    } else {
        save_rpg_data(userid, rpg_emptyeg);
        return rpg_emptyeg;
    };
};

function save_rpg_data(userid, rpgdata) {
    const { rpg_database_file } = require("./config.js");

    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    let data = {};
    if (fs.existsSync(rpg_database_file)) {
        const rawData = readFileSync(rpg_database_file);
        data = safeJSONParse(rawData);
    };

    if (!data[userid]) {
        data[userid] = rpg_emptyeg;
    };

    data[userid] = { ...data[userid], ...rpgdata };

    // 檢查並清理 inventory 中數量為 0 或 null 的物品
    if (data[userid].inventory) {
        Object.keys(data[userid].inventory).forEach(item => {
            if (data[userid].inventory[item] === 0 || data[userid].inventory[item] === null) {
                delete data[userid].inventory[item];
            };
        });
    };

    data[userid] = order_data(data[userid], rpg_emptyeg);

    writeJsonSync(rpg_database_file, data);
};

function load_shop_data(userid) {
    const { rpg_shop_file } = require("./config.js");
    const shop_emptyeg = find_default_value("rpg_shop.json", {});

    if (fs.existsSync(rpg_shop_file)) {
        const rawData = readFileSync(rpg_shop_file);
        const data = safeJSONParse(rawData);

        if (!data[userid]) {
            save_shop_data(userid, shop_emptyeg);
            return shop_emptyeg;
        };

        return order_data(data[userid], shop_emptyeg);
    } else {
        save_shop_data(userid, shop_emptyeg);
        return shop_emptyeg;
    };
};

function save_shop_data(userid, shop_data) {
    const { rpg_shop_file } = require("./config.js");
    const shop_emptyeg = find_default_value("rpg_shop.json", {});

    let data = {};
    if (fs.existsSync(rpg_shop_file)) {
        const rawData = readFileSync(rpg_shop_file);
        data = safeJSONParse(rawData);
    };

    if (!data[userid]) {
        data[userid] = shop_emptyeg;
    };

    data[userid] = { ...data[userid], ...shop_data };

    // 清除數量為0的物品
    if (data[userid].items) {
        for (const [item, itemData] of Object.entries(data[userid].items)) {
            if (itemData.amount <= 0) {
                delete data[userid].items[item];
            };
        };
    };

    data[userid] = order_data(data[userid], shop_emptyeg);

    writeJsonSync(rpg_shop_file, data);
};

/**
 * 
 * @param {string} userid 
 * @returns {{lvl: number, exp: number, waterAt: number, farms: Array<Object}}
 */
function load_farm_data(userid) {
    const { rpg_farm_file } = require("./config.js");
    const farm_emptyeg = find_default_value("rpg_farm.json", {});

    const rawData = readFileSync(rpg_farm_file);

    const data = safeJSONParse(rawData);

    if (!data[userid]) {
        save_shop_data(userid, farm_emptyeg);
        return farm_emptyeg;
    };

    return data[userid];
};

/**
 * 
 * @param {string} userid 
 * @param {Array} farm_data 
 */
function save_farm_data(userid, farm_data) {
    const { rpg_farm_file } = require("./config.js");
    const farm_emptyeg = find_default_value("rpg_farm.json", {});

    let data = {};
    if (fs.existsSync(rpg_farm_file)) {
        const rawData = readFileSync(rpg_farm_file);
        data = safeJSONParse(rawData);
    };

    if (!data[userid]) {
        data[userid] = farm_emptyeg;
    };

    data[userid] = { ...data[userid], ...farm_data };

    // 清除數量為0的物品
    if (data[userid].items) {
        for (const [item, itemData] of Object.entries(data[userid].items)) {
            if (itemData.amount <= 0) {
                delete data[userid].items[item];
            };
        };
    };

    writeJsonSync(rpg_farm_file, data);
};

function load_bake_data() {
    const { bake_data_file } = require("./config.js");

    return readJsonSync(bake_data_file);
};

function save_bake_data(data) {
    const { bake_data_file } = require("./config.js");

    writeJsonSync(bake_data_file, data);
};

function load_smelt_data() {
    const { smelt_data_file } = require("./config.js");

    return readJsonSync(smelt_data_file);
};

function save_smelt_data(data) {
    const { smelt_data_file } = require("./config.js");

    writeJsonSync(smelt_data_file, data);
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
    const { dvoice_data_file } = require("./config.js");

    return readJsonSync(dvoice_data_file);
};

function saveDvoiceData(data) {
    const { dvoice_data_file } = require("./config.js");

    writeJsonSync(dvoice_data_file, data);
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
    const { music_data_file } = require("./config.js");
    const music_emptyeg = find_default_value("music.json", {});

    if (!existsSync(music_data_file)) {
        writeJsonSync(music_data_file, music_emptyeg);

        return music_emptyeg;
    };

    return readJsonSync(music_data_file);
};

function save_music_data(data) {
    const { music_data_file } = require("./config.js");

    // 確保每個語音頻道的資料結構完整
    for (const [voiceChannelId, channelData] of Object.entries(data)) {
        if (!channelData.queue) channelData.queue = [];
        if (typeof channelData.currentIndex !== 'number') channelData.currentIndex = 0;
        if (typeof channelData.isPlaying !== 'boolean') channelData.isPlaying = false;
        if (typeof channelData.volume !== 'number') channelData.volume = 1.0;
        if (!channelData.loopMode) channelData.loopMode = "off";
        if (!channelData.textChannelId) channelData.textChannelId = "";

        // 確保 queue 中的每首歌都有必要的欄位
        channelData.queue = channelData.queue.map(song => ({
            url: song.url || "",
            title: song.title || "未知標題",
            duration: song.duration || "0:00",
            requestedBy: song.requestedBy || "",
            thumbnail: song.thumbnail || "",
            addedAt: song.addedAt || new Date().toISOString(),
            ...song
        }));
    };

    writeJsonSync(music_data_file, data);
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
    const musicData = load_music_data();

    if (musicData[voiceChannelId]) {
        delete musicData[voiceChannelId];
        save_music_data(musicData);
        return true;
    };

    return false;
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
    addPrefix,
    rmPrefix,
    getPrefixes,
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
