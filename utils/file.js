const { Logger } = require("winston");
const { VoiceChannel } = require("discord.js");
const { finished } = require('stream/promises');
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const util = require("util");
const axios = require("axios");

const {
    INDENT,
    DATABASE_FILES,
    DEFAULT_VALUES,
    database_folder,
    probabilities,
    scheduleEvery5min,
    scheduleEverymin,
    scheduleEverysec,
    database_file,
    rpg_database_file,
    rpg_shop_file,
    rpg_farm_file,
    bake_data_file,
    smelt_data_file,
    dvoice_data_file,
    temp_folder,
} = require("./config.js");
const { get_logger, getCallerModuleName } = require("./logger.js");
const { asleep } = require("./sleep.js");
const { CacheTypes, getCacheManager } = require("./cache.js");

const cacheManager = getCacheManager();

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const mkdirSync = fs.mkdirSync;
const unlinkSync = fs.unlinkSync;
const createWriteStream = fs.createWriteStream;
const createReadStream = fs.createReadStream;
const join = path.join;
const full_path = path.resolve;
const basename = path.basename;
const dirname = path.dirname;
const mkdir = fsp.mkdir;
const readdir = fsp.readdir;
const logger = get_logger();

/**
*
 * @param {import("node:fs").PathLike} path
 * @returns {Promise<boolean>}
 */
async function exists(path) {
    try {
        await fsp.access(path);
        return true;
    } catch {
        return false;
    };
};

/**
 * 
 * @param {fs.PathOrFileDescriptor} file_path
 * @param {{encoding?: null | undefined, flag?: string | undefined, return?: any | undefined} | null} [options]
 * @returns {NonSharedBuffer}
 */
function readFileSync(file_path, options = { encoding: "utf-8" }) {
    const filename = path.basename(file_path);

    if (!existsSync(file_path) && DATABASE_FILES.includes(filename)) {
        if (typeof options === "object" && options?.return) return stringify(options.return);

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
 * 
 * @param {fs.PathOrFileDescriptor} file_path
 * @param {{encoding?: null | undefined, flag?: import("node:fs").OpenMode | undefined, return?: any | undefined} | null} [options]
 * @returns {Promise<NonSharedBuffer>}
 */
async function readFile(file_path, options = { encoding: "utf-8" }) {
    const filename = path.basename(file_path);

    if (!(await exists(file_path)) && DATABASE_FILES.includes(filename)) {
        if (typeof options === "object" && options?.return) return stringify(options.return);

        const default_value = DEFAULT_VALUES.single[filename]
        const other_category_default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            return acc || category[filename];
        }, undefined);

        if (!default_value) {
            if (!other_category_default_value) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return stringify({});
        } else {
            await writeJson(file_path, default_value);
            return stringify(default_value);
        };
    };

    return await fsp.readFile(file_path, options);
};

/**
 * 轉換 JSON 字串到物件
 * @argument {string} jsonString - 要解析的 JSON 字串
 * @returns {object} 解析後的物件
 */
function safeJSONParse(jsonString) {
    return JSON.parse(jsonString)
};

function needsStringify(obj) {
    if (typeof obj === "string") {
        return false;
    };

    if (typeof obj !== "object" || obj === null) {
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

function readJsonSync(path) {
    return safeJSONParse(readFileSync(path));
};

function writeJsonSync(path, data, replacer = "") {
    data = stringify(data, replacer);

    writeSync(path, data, true);
    return data;
};

async function writeFile(path, data, p = false) {
    if (path.endsWith(".json") && !p) return await writeJson(path, data);

    const dir = dirname(path);
    if (!(await exists(dir))) {
        await mkdir(dir, { recursive: true });
    };

    await fsp.writeFile(path, data);
};

async function readJson(path) {
    return safeJSONParse(await readFile(path));
};

async function writeJson(path, data, replacer = "") {
    data = stringify(data, replacer);

    await writeFile(path, data, true);
    return data;
};

/**
 * Read schedule files from the schedule directory.
 * @returns {Promise<string[][]>}
 */
async function readSchedule() {
    const everysec = await exists(scheduleEverysec) ? (await readdir(scheduleEverysec, { recursive: true }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEverysec}/${file}`) : [];

    const everymin = await exists(scheduleEverymin) ? (await readdir(scheduleEverymin, { recursive: true }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEverymin}/${file}`) : [];

    const every5min = await exists(scheduleEvery5min) ? (await readdir(scheduleEvery5min, { recursive: true }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEvery5min}/${file}`) : [];

    return [
        everysec,
        everymin,
        every5min,
    ];
};

/**
 *
 * @param {fs.WriteStream} writer
 * @returns {Promise<void>}
 */
async function waitForWriterFinish(writer) {
    return await finished(writer);
};

/**
 * @warning filename will be converted to basename
 * @param {string} folder 
 * @param {string} filename 
 * @returns {string}
 */
function join_folder(folder, filename) {
    const basename = path.basename(filename);
    return join(folder, basename);
};

/**
 * @warning filename will be converted to basename
 * @param {string} filename
 * @returns {string}
 */
function join_db_folder(filename) {
    const basename = path.basename(filename);
    return join_folder(database_folder, basename);
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
            if (await exists(local_filepath)) {
                localContent = await readFile(local_filepath, {
                    encoding: "utf-8",
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
            const url = `${SERVER_URL}/files/${basename_filename}`;

            let response;

            const resp = global.perloadResponse.get(url);
            if (resp) {
                response = resp;
            };

            if (!response?.data) {
                response = await axios.get(url);
            };

            remoteContent = stringify(response.data);
        } catch (err) {
            if (err.response?.status === 404) {
                log.warn(`遠端檔案不存在: ${basename_filename}`);
                remoteContent = null;
            } else if (err.code === "ECONNRESET" || err.message?.includes("socket hang up")) {
                if (attempt < maxRetries) {
                    log.warn(`連接遠端伺服器時中斷，正在重試 (${attempt}/${maxRetries})...`);
                    await asleep(1000);
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

/**
 * 讀取伺服器資料庫
 * @param {string} guildID - 伺服器ID
 * @param {number} mode - 0: 取得伺服器資料, 1: 取得所有資料
 * @returns {Promise<object>}
 * @throws {TypeError} - 如果mode不是0或1
 */
async function loadData(guildID = null, mode = 0) {
    /*
    mode: 0 取得伺服器資料, 1 取得所有資料
    */
    if (![0, 1].includes(mode)) {
        throw new TypeError("Invalid mode");
    };

    const database_emptyeg = find_default_value("database.json", {});

    if (!(await exists(database_file))) return {};

    if (mode == 0 && guildID) {
        // 從緩存中獲取
        const cached = cacheManager.get(CacheTypes.GUILD, guildID);
        if (cached) {
            return cached;
        };
    };

    const data = await readJson(database_file);

    if (mode == 0 && guildID) {
        if (!data[guildID]) {
            data[guildID] = database_emptyeg;
            await saveData(guildID, data[guildID]);
        };

        // 存入緩存
        cacheManager.set(CacheTypes.GUILD, guildID, data[guildID]);

        return data[guildID];
    };

    return data;
};

/**
 * 儲存伺服器資料庫
 * @param {string} guildID - 伺服器ID
 * @param {object} guildData - 伺服器資料
 * @returns {Promise<void>}
 * @throws {Error}
 */
async function saveData(guildID, guildData) {
    const database_emptyeg = find_default_value("database.json", {});

    let data = {};

    if (await exists(database_file)) {
        data = await readJson(database_file);
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
            await writeJson(database_file, data);
            break;
        } catch (error) {
            lastError = error;
            retries--;
            if (retries > 0) {
                await asleep(1000);
            };
        };
    };

    if (retries === 0) {
        throw lastError;
    };

    // 更新緩存
    cacheManager.set(CacheTypes.GUILD, guildID, data[guildID]);
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
 * @returns {Promise<void>}
 */
async function setRPG(guildID, enable) {
    if (![true, false].includes(enable)) throw new Error(`Invalid mode: ${enable}`)

    const data = await loadData(guildID);
    data["rpg"] = enable;

    await saveData(guildID, data);
};

/**
 *
 * @param {string} guildID
 * @param {string} prefix
 * @returns {Promise<string | null>}
 */
async function addPrefix(guildID, prefix) {
    if (!typeof prefix === "string") throw new Error(`Invalid prefix: ${enable}`)

    const data = await loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
    };

    if (data["prefix"].includes(prefix)) return null;

    data["prefix"].push(prefix);

    await saveData(guildID, data);

    return prefix;
};

/**
 *
 * @param {string} guildID
 * @param {string} prefix
 * @returns {Promise<string | null>}
 */
async function rmPrefix(guildID, prefix) {
    if (!typeof prefix === "string") throw new Error(`Invalid prefix: ${enable}`)

    const data = await loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
    };

    if (!data["prefix"].includes(prefix)) return null;

    data["prefix"] = data["prefix"].filter(p => p !== prefix);

    await saveData(guildID, data);

    return prefix;
};

/**
 *
 * @param {string} guildID
 * @returns {Promise<string[]>}
 */
async function getPrefixes(guildID) {
    const data = await loadData(guildID);

    // 舊兼容
    if (!Array.isArray(data["prefix"])) {
        data["prefix"] = [data["prefix"]];
        await saveData(guildID, data);
    };

    return data["prefix"];
};

/**
 *
 * @param {string} userid
 * @returns {Promise<object>}
 */
async function load_rpg_data(userid) {
    logger.debug(`load_rpg_data(${userid}) - ${getCallerModuleName("list")}`);

    // 嘗試從緩存中獲取
    const cached = cacheManager.get(CacheTypes.RPG, userid);
    if (cached) {
        return cached;
    };

    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    if (await exists(rpg_database_file)) {
        const data = await readJson(rpg_database_file);

        if (!data[userid]) {
            await save_rpg_data(userid, rpg_emptyeg);
            return rpg_emptyeg;
        };

        const userData = order_data(data[userid], rpg_emptyeg);

        // 存入緩存
        cacheManager.set(CacheTypes.RPG, userid, userData);

        return userData;
    } else {
        await save_rpg_data(userid, rpg_emptyeg);
        return rpg_emptyeg;
    };
};

/**
 *
 * @param {string} userid
 * @returns {object}
 */
function load_rpg_dataSync(userid) {
    logger.debug(`load_rpg_dataSync(${userid}) - ${getCallerModuleName("list")}`);
    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    if (existsSync(rpg_database_file)) {
        const data = readJsonSync(rpg_database_file);

        if (!data[userid]) {
            save_rpg_dataSync(userid, rpg_emptyeg);
            return rpg_emptyeg;
        };

        return order_data(data[userid], rpg_emptyeg);
    } else {
        save_rpg_dataSync(userid, rpg_emptyeg);
        return rpg_emptyeg;
    };
};

/**
 * 
 * @param {string} userid
 * @param {object} rpg_data
 * @returns {Promise<void>}
 */
async function save_rpg_data(userid, rpg_data) {
    logger.debug(`save_rpg_data(${userid}) - ${getCallerModuleName("list")}`);
    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    let data = {};
    if (await exists(rpg_database_file)) {
        data = await readJson(rpg_database_file);
    };

    if (!data[userid]) {
        data[userid] = rpg_emptyeg;
    };

    data[userid] = { ...data[userid], ...rpg_data };

    // 檢查並清理 inventory 中數量為 0 或 null 的物品
    if (data[userid].inventory) {
        Object.keys(data[userid].inventory).forEach(item => {
            if (data[userid].inventory[item] === 0 || data[userid].inventory[item] === null) {
                delete data[userid].inventory[item];
            };
        });
    };

    data[userid] = order_data(data[userid], rpg_emptyeg);

    await writeJson(rpg_database_file, data);

    // 更新緩存
    cacheManager.set(CacheTypes.RPG, userid, data[userid]);
};

/**
 * 
 * @param {string} userid
 * @param {object} rpg_data
 * @returns {void}
 */
function save_rpg_dataSync(userid, rpg_data) {
    logger.debug(`save_rpg_dataSync(${userid}) - ${getCallerModuleName("list")}`);
    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    let data = {};
    if (existsSync(rpg_database_file)) {
        data = readJsonSync(rpg_database_file);
    };

    if (!data[userid]) {
        data[userid] = rpg_emptyeg;
    };

    data[userid] = { ...data[userid], ...rpg_data };

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

async function load_shop_data(userid) {
    const shop_emptyeg = find_default_value("rpg_shop.json", {});

    if (await exists(rpg_shop_file)) {
        const data = await readJson(rpg_shop_file);

        if (!data[userid]) {
            await save_shop_data(userid, shop_emptyeg);
            return shop_emptyeg;
        };

        return order_data(data[userid], shop_emptyeg);
    } else {
        await save_shop_data(userid, shop_emptyeg);
        return shop_emptyeg;
    };
};

async function save_shop_data(userid, shop_data) {
    const shop_emptyeg = find_default_value("rpg_shop.json", {});

    let data = {};
    if (await exists(rpg_shop_file)) {
        data = await readJson(rpg_shop_file);
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

    await writeJson(rpg_shop_file, data);
};

/**
 *
 * @param {string} userid
 * @returns {Promies<{lvl: number, exp: number, waterAt: number, farms: Object[]}>}
 */
async function load_farm_data(userid) {
    const farm_emptyeg = find_default_value("rpg_farm.json", {});

    const data = await readJson(rpg_farm_file);

    if (!data[userid]) {
        await save_shop_data(userid, farm_emptyeg);
        return farm_emptyeg;
    };

    return data[userid];
};

/**
 *
 * @param {string} userid
 * @param {Array} farm_data
 */
async function save_farm_data(userid, farm_data) {
    const farm_emptyeg = find_default_value("rpg_farm.json", {});

    let data = {};
    if (await exists(rpg_farm_file)) {
        data = await readJson(rpg_farm_file);
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

    await writeJson(rpg_farm_file, data);
};

/**
 * Get the bake data from Json
 * @param {string | null} [userId] null for whole json data
 * @returns {Promise<Array<object> | null>} null if no data
 */
async function load_bake_data(userId = null) {
    const whole_json_data = await readJson(bake_data_file);
    return userId
        ? whole_json_data?.[userId]
        : whole_json_data;
};

/**
 * Save the bake data to Json
 * @param {string} userId - The ID of user
 * @param {Array} bake_data - The bake data
 */
async function save_bake_data(userId, bake_data) {
    const currentData = await load_bake_data();

    currentData[userId] = [...currentData[userId], ...bake_data];

    await writeJson(bake_data_file, currentData);
};

async function load_smelt_data() {
    return await readJson(smelt_data_file);
};

async function save_smelt_data(data) {
    await writeJson(smelt_data_file, data);
};

/*
██████╗ ██╗   ██╗ ██████╗ ██╗ ██████╗███████╗
██╔══██╗██║   ██║██╔═══██╗██║██╔════╝██╔════╝
██║  ██║██║   ██║██║   ██║██║██║     █████╗  
██║  ██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝  
██████╔╝ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗
╚═════╝   ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝
*/

/**
 * Load dynamic voice data
 * @returns {Promise<object>}
 */
async function loadDvoiceData() {
    return await readJson(dvoice_data_file);
};

/**
 * Save dynamic voice data
 * @param {object} data - The data to save
 * @returns {Promise<void>}
 */
async function saveDvoiceData(data) {
    await writeJson(dvoice_data_file, data);
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
 * Set dynamic voice channel
 * @param {string} guildID - The ID of the guild
 * @param {VoiceChannel} channel - The voice channel to set as dynamic voice channel
 * @returns {Promise<void>}
 */
async function setDynamicVoice(guildID, channel) {
    const data = await loadData(guildID);
    data["dynamicVoice"] = channel.id;

    await saveData(guildID, data);
};


/**
 * 
 * @param {string} guildID 
 * @returns {Promise<string | undefined>}
 */
async function getDynamicVoice(guildID) {
    const data = await loadData(guildID);
    return data["dynamicVoice"];
};

/*
████████╗███████╗███╗   ███╗██████╗ 
╚══██╔══╝██╔════╝████╗ ████║██╔══██╗
   ██║   █████╗  ██╔████╔██║██████╔╝
   ██║   ██╔══╝  ██║╚██╔╝██║██╔═══╝ 
   ██║   ███████╗██║ ╚═╝ ██║██║     
   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝     
*/

/**
 * joins the temp folder with the filename
 * filename will be converted to basename
 * @param {string} filename - The filename to join with the temp folder
 * @returns {string}
 */
function join_temp_folder(filename) {
    const temp_folder = get_temp_folder();

    const basename = path.basename(filename);
    return join_folder(temp_folder, basename);
};

function get_temp_folder() {
    if (!existsSync(temp_folder)) {
        mkdirSync(temp_folder, { recursive: true });
    };

    return temp_folder;
};

module.exports = {
    // file operations
    createWriteStream,
    createReadStream,
    readFileSync,
    writeSync,
    readJsonSync,
    writeJsonSync,
    existsSync,
    readdirSync,
    unlinkSync,
    mkdirSync,
    readFile,
    writeFile,
    readJson,
    writeJson,
    readdir,
    mkdir,
    exists,
    readSchedule,
    join,
    full_path,
    basename,
    dirname,

    // tools
    waitForWriterFinish,
    join_folder,
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
    load_rpg_dataSync,
    save_rpg_data,
    save_rpg_dataSync,
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
    setDynamicVoice,
    getDynamicVoice,

    // features
    stringify,

    // temp
    get_temp_folder,
    join_temp_folder,
};
