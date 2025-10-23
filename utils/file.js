const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const { INDENT, DATABASE_FILES, DEFAULT_VALUES } = require("./config.js");
const { get_logger } = require("./logger.js");
const { sleep } = require("./sleep.js");

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const readdir = fsp.readdir;
const join = path.join;
const full_path = path.resolve;
const logger = get_logger();

/**
 * 
 * @param {fs.PathOrFileDescriptor} file_path 
 * @param {{encoding?: null | undefined, flag?: string | undefined} | null} options 
 * @returns {NonSharedBuffer}
 */
function readFileSync(file_path, options = null) {
    const filename = path.basename(file_path)

    if (!existsSync(file_path) && DATABASE_FILES.includes(filename)) {
        const default_value = DEFAULT_VALUES.single[filename]
        const other_category_default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            return acc || category[filename];
        }, undefined);

        if (!default_value) {
            if (!other_category_default_value) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            else return {};
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

function readSync(path) {
    return fs.readFile(path, {
        encoding: "utf-8",
    });
};

function writeSync(path, data) {
    if (path.endsWith(".json")) return writeJsonSync(path, data);
    fs.writeFileSync(path, data);
};

async function read(path, encoding = "utf-8") {
    return await fsp.readFile(path, {
        encoding,
    });
};

async function write(path, data) {
    if (path.endsWith(".json")) return await writeJson(path, data);
    await fsp.writeFile(path, data);
};

function readJsonSync(path) {
    return JSON.parse(readSync(path));
};

function writeJsonSync(path, data, replacer = "") {
    data = stringify(data, replacer)
    writeSync(path, data);
    return data;
};

async function readJson(path) {
    return JSON.parse(await read(path));
};

async function writeJson(path, data, replacer = "") {
    data = stringify(data, replacer)
    await write(path, data);
    return data;
};

function readScheduleSync() {
    const { scheduleEverysec, scheduleEverymin } = require("./config.js");

    const everysec = readdirSync(scheduleEverysec, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverysec}/${file}`);

    const everymin = readdirSync(scheduleEverymin, { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `${scheduleEverymin}/${file}`);

    return [
        everysec,
        everymin,
    ];
};

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
 * @param {any} default_return 
 * @returns {object | any}
 */
function find_default_value(filename, default_return = undefined) {
    const basename = path.basename(filename);

    for (const categoryData of Object.values(DEFAULT_VALUES)) {
        if (categoryData.hasOwnProperty(basename)) {
            return categoryData[basename];
        };
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
        const rawData = fs.readFileSync(database_file);
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
        const rawData = fs.readFileSync(database_file);
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
        const rawData = fs.readFileSync(rpg_database_file);
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

function save_rpg_data(userid, userData) {
    const { rpg_database_file } = require("./config.js");
    const rpg_emptyeg = find_default_value("rpg_database.json", {});

    let data = {};
    if (fs.existsSync(rpg_database_file)) {
        const rawData = fs.readFileSync(rpg_database_file);
        data = JSON.parse(rawData);
    };

    if (!data[userid]) {
        data[userid] = rpg_emptyeg;
    };

    data[userid] = { ...data[userid], ...userData };

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
        const rawData = fs.readFileSync(rpg_shop_file);
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

function save_shop_data(userid, userData) {
    const { rpg_shop_file } = require("./config.js");
    const shop_emptyeg = find_default_value("rpg_shop.json", {});

    let data = {};
    if (fs.existsSync(rpg_shop_file)) {
        const rawData = fs.readFileSync(rpg_shop_file);
        data = JSON.parse(rawData);
    };

    if (!data[userid]) {
        data[userid] = shop_emptyeg;
    };

    data[userid] = { ...data[userid], ...userData };

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

module.exports = {
    readSync,
    writeSync,
    read,
    write,
    readJsonSync,
    writeJsonSync,
    readJson,
    writeJson,
    existsSync,
    readFileSync,
    readdirSync,
    readdir,
    readScheduleSync,
    readSchedule,
    join,
    full_path,
    // tools
    find_default_value,
    order_data,
    // database
    loadData,
    saveData,
    // RPG
    setRPG,
    load_rpg_data,
    save_rpg_data,
    load_shop_data,
    save_rpg_data,
};
