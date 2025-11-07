const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { isDeepStrictEqual } = require("node:util");
const { Logger } = require("winston");
const { VoiceChannel } = require("discord.js");

const { INDENT, DATABASE_FILES, DEFAULT_VALUES, database_folder, probabilities } = require("./config.js");
const { get_logger } = require("./logger.js");
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
        if (typeof options === 'object' && options?.return) return options.return;

        const default_value = DEFAULT_VALUES.single[filename]
        const other_category_default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            return acc || category[filename];
        }, undefined);

        if (!default_value) {
            if (!other_category_default_value) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return {};
        } else {
            writeJsonSync(file_path, default_value);
            return default_value;
        };
    };

    return fs.readFileSync(file_path, options);
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

    const everysec = readdirSync(scheduleEverysec, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverysec}/${file}`);

    const everymin = readdirSync(scheduleEverymin, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverymin}/${file}`);

    const every5min = readdirSync(scheduleEvery5min, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEvery5min}/${file}`);

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
function compareLocalRemote(filename, log = logger, maxRetries = 3) {
    let localContent;
    let remoteContent;

    filename = join_db_folder(filename);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            localContent = readFileSync(filename, {
                encoding: "utf8",
                return: null,
            });
        } catch (err) {
            log.error(`讀取本地檔案內容時遇到錯誤: ${err.stack}`);
            continue;
        };

        try {
            remoteContent = readFileSync(filename, {
                encoding: "utf8",
                return: null,
            });
        } catch (err) {
            if (err.response?.status === 404) {
                log.error(`遠端檔案不存在: ${filename}`);
            } else if (err.stack.includes("socket hang up")) continue;
            else {
                log.error(`獲取遠端檔案內容時遇到錯誤: ${err.stack}`);
                continue;
            };

            remoteContent = null;
        };

        break;
    };

    return [localContent && remoteContent && isDeepStrictEqual(localContent, remoteContent), localContent, remoteContent];
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

    if (fs.existsSync(database_file)) {
        const rawData = readFileSync(database_file);
        let data = JSON.parse(rawData);

        if (mode == 0 && guildID) {
            if (!data[guildID]) {
                data[guildID] = database_emptyeg;
                saveData(guildID, data[guildID]);
            };

            return data[guildID];
        } else {
            return data;
        };
    } else {
        return {};
    };
};

function saveData(guildID, guildData) {
    const { database_file } = require("./config.js");
    const database_emptyeg = find_default_value("database.json", {});

    // let old_data = {};
    // if (backup) {
    //     old_data = loadData(null, 1);
    // };

    let data = {};

    if (fs.existsSync(database_file)) {
        const rawData = readFileSync(database_file);
        data = JSON.parse(rawData);
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

function setRPG(guildID, enable) {
    if (![true, false].includes(enable)) throw new Error(`Invalid mode: ${enable}`)
    const data = loadData(guildID);
    data["rpg"] = enable;
    saveData(guildID, data)
}

function load_rpg_data(userid) {
    const { rpg_database_file } = require("./config.js");
    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    if (fs.existsSync(rpg_database_file)) {
        const rawData = readFileSync(rpg_database_file);
        const data = JSON.parse(rawData);

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
        data = JSON.parse(rawData);
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
        const data = JSON.parse(rawData);

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
        data = JSON.parse(rawData);
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
    load_bake_data,
    save_bake_data,
    load_smelt_data,
    save_smelt_data,
    // features
    setDynamicVoice,
    getDynamicVoice,
};
