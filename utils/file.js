import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import {
    VoiceChannel,
} from "discord.js";

import {
    INDENT,
    DEFAULT_VALUES,
    database_folder,
    probabilities,
    scheduleEvery5min,
    scheduleEverymin,
    scheduleEverysec,
    database_file,
    rpg_shop_file,
    rpg_farm_file,
    bake_data_file,
    smelt_data_file,
    dvoice_data_file,
    temp_folder,
} from "./config.ts";
import {
    get_logger,
    getCallerModuleName,
} from "./logger.js";
import {
    asleep,
} from "./sleep.js";
import {
    CacheTypes,
    getCacheManager,
} from "./cache.js";
import {
    inDATABASE_FILES,
    inSingleDefaultValues,
} from "./check_db_files.js";

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
 * @overload
 * @param {string} file_path
 * @param {{ encoding: BufferEncoding, flag?: import("node:fs").OpenMode | undefined, return?: object | string | null } | null} [options]
 * @returns {string}
 */
/**
 * @overload
 * @param {string} file_path
 * @param {{ encoding?: BufferEncoding | null | undefined, flag?: import("node:fs").OpenMode | undefined, return?: object | string | null } | null} [options]
 * @returns {string | Buffer<ArrayBuffer>}
 */
/**
 * Read the content of a file
 * @param {string} file_path
 * @param {{ encoding?: BufferEncoding | null, flag?: string, return?: object | string | undefined } | null} [options]
 * @returns {string | Buffer<ArrayBuffer>}
 */
function readFileSync(file_path, options = { encoding: "utf-8" }) {
    const filename = path.basename(file_path);

    const { return: returnWhat = null, ...readFileOption } = options ?? {};

    if (!existsSync(file_path) && inDATABASE_FILES(filename)) {
        if (returnWhat) return stringify(returnWhat);

        /** @type {object | null} */
        const default_value = inSingleDefaultValues(filename)
            ? DEFAULT_VALUES.single[filename]
            : null;

        const other_category_default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            // @ts-expect-error - e
            return acc || category[filename];
        }, {});

        if (!default_value) {
            if (!Object.keys(other_category_default_value).length) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return stringify({});
        } else {
            writeJsonSync(file_path, stringify(default_value));
            return stringify((default_value));
        };
    };

    if (Object.keys(readFileOption).length)
        return fs.readFileSync(file_path, readFileOption);
    return fs.readFileSync(file_path);
};

/**
 * @overload
 * @param {string} file_path
 * @param {{ encoding: BufferEncoding, flag?: import("node:fs").OpenMode | undefined, return?: object | string | null } | null} [options]
 * @returns {Promise<string>}
 */
/**
 * @overload
 * @param {string} file_path
 * @param {{ encoding?: BufferEncoding | null | undefined, flag?: import("node:fs").OpenMode | undefined, return?: object | string | null } | null} [options]
 * @returns {Promise<string | Buffer<ArrayBuffer>>}
 */
/**
 * Read the content of a file
 * @param {string} file_path
 * @param {{ encoding?: BufferEncoding | null | undefined, flag?: import("node:fs").OpenMode | undefined, return?: object | string | null } | null} [options]
 */
async function readFile(file_path, options = { encoding: "utf-8" }) {
    const filename = path.basename(file_path);

    const { return: returnWhat = null, ...readFileOption } = options ?? {};

    if (!(await exists(file_path)) && inDATABASE_FILES(filename)) {
        if (returnWhat) return stringify(returnWhat);

        /** @type {object | null} */
        const default_value = inSingleDefaultValues(filename)
            ? DEFAULT_VALUES.single[filename]
            : null;

        const other_category_default_value = find_default_value(filename);

        if (!default_value) {
            if (!other_category_default_value) logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return stringify({});
        } else {
            const stringified_default_value = stringify(default_value);
            await writeJson(file_path, stringified_default_value);

            return stringified_default_value;
        };
    };

    return await fsp.readFile(file_path, readFileOption);
};

/**
 * 轉換 JSON 字串到物件
 * @param {string} jsonString - 要解析的 JSON 字串
 * @returns {Record<string, unknown>} 解析後的物件
 */
const safeJSONParse = (jsonString) => JSON.parse(jsonString);

/**
 * Check whether an object needs to be stringified
 * @param {object | string} obj
 * @returns {obj is string}
 */
const noNeedsStringify = (obj) => (typeof obj === "string" || (typeof obj !== "object" || obj === null));

/**
 * Stringify an object
 * @param {object | string} data
 * @param {((this: unknown, key: string, value: unknown) => unknown)} [replacer]
 * @returns {string}
 */
function stringify(data, replacer = undefined) {
    if (noNeedsStringify(data)) return data;

    return JSON.stringify(data, replacer, INDENT);
};

/**
 * Write a file synchronously
 * @param {string} path
 * @param {string} data
 * @param {boolean} [p]
 * @returns {void}
 */
function writeSync(path, data, p = false) {
    if (path.endsWith(".json") && !p) return writeJsonSync(path, data);

    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    };

    if (typeof data !== "string") logger.warn(`[writeSync] gave a ${typeof data} instead of string. Called from\n${getCallerModuleName(null)}`);

    fs.writeFileSync(path, data);
};

/**
 * Read a json file synchronously
 * @param {string} path
 * @returns {object}
 */
function readJsonSync(path) {
    return safeJSONParse(readFileSync(path));
};

/**
 * Write a json file synchronously
 * @param {string} path
 * @param {string | object} data
 * @param {((this: unknown, key: string, value: unknown) => unknown)} [replacer]
 * @returns {void}
 */
function writeJsonSync(path, data, replacer) {
    data = stringify(data, replacer);

    writeSync(path, data, true);
};

/**
 * Write a file asynchronously
 * @param {string} path
 * @param {string} data
 * @param {boolean} [p]
 * @returns {Promise<void>}
 */
async function writeFile(path, data, p = false) {
    if (path.endsWith(".json") && !p) return await writeJson(path, data);

    const dir = dirname(path);
    if (!(await exists(dir))) {
        await mkdir(dir, { recursive: true });
    };

    await fsp.writeFile(path, data);
};

/**
 * Read a json file asynchronously
 * @param {string} path // eslint-disable-next-line jsdoc/reject-any-type
 * @returns {Promise<any>}
 */
async function readJson(path) {
    return safeJSONParse(await readFile(path));
};

/**
 * Write a json file asynchronously
 * @param {string} path
 * @param {string | object} data
 * @param {((this: unknown, key: string, value: unknown) => unknown)} [replacer]
 * @returns {Promise<void>}
 */
async function writeJson(path, data, replacer) {
    data = stringify(data, replacer);

    await writeFile(path, data, true);
};

/**
 * Read schedule files from the schedule directory.
 * @returns {Promise<[string[], string[], string[]]>}
 */
async function readSchedule() {
    const everysec = await exists(scheduleEverysec) ? (await readdir(scheduleEverysec, {
        recursive: true,
        encoding: "utf-8",
    }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEverysec}/${file}`) : [];

    const everymin = await exists(scheduleEverymin) ? (await readdir(scheduleEverymin, {
        recursive: true,
        encoding: "utf-8",
    }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEverymin}/${file}`) : [];

    const every5min = await exists(scheduleEvery5min) ? (await readdir(scheduleEvery5min, {
        recursive: true,
        encoding: "utf-8",
    }))
        .filter(file => file.endsWith(".js"))
        .map(file => `${scheduleEvery5min}/${file}`) : [];

    return [
        everysec,
        everymin,
        every5min,
    ];
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
 * @template T
 * @param {string} filename
 * @param {T} [default_return]
 * @returns {Record<string, unknown> | unknown[] | T | undefined}
 */
function find_default_value(filename, default_return = undefined) {
    const basename = path.basename(filename);

    for (const categoryData of
        /** @type {{ [k: string]: Record<string, unknown> | unknown[] }[]} */
        (Object.values(DEFAULT_VALUES))
    ) {
        if (Object.hasOwn(categoryData, basename)) return categoryData[basename];
    };

    return default_return;
};

/**
 * @template T
 * @param {import("./rpg").ItemKey} item
 * @param {T} [default_return]
 * @returns {[number, number, number] | T | undefined}
 */
function get_probability_of_id(item, default_return = undefined) {
    for (const categoryData of Object.values(probabilities)) {
        if (Object.hasOwn(categoryData, item)) return categoryData[item];
    };

    return default_return;
};

/**
 * @template {object} T
 * @template {object} U
 * @typedef {{ [K in keyof U]: K extends keyof T ? T[K] | U[K] : U[K] }} OrderDataResult
 */

/**
 * @template {object} T
 * @template {object} U
 * @param {T} data
 * @param {U} follow
 * @returns {OrderDataResult<T, U>}
 */
function order_data(data, follow) {
    /** @type {Record<string, unknown>} */
    const orderedData = {};
    for (const key of Object.keys(follow)) {
        orderedData[key] =
            /** @type {Record<string, unknown>} */ (data)[key] ??
            /** @type {Record<string, unknown>} */ (follow)[key];
    };

    return /** @type {OrderDataResult<T, U>} */ (orderedData);
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
 * @overload
 * @param {null} [guildID] - 伺服器ID
 * @param {0 | 1} [mode] - 0: 取得伺服器資料, 1: 取得所有資料
 * @returns {Promise<{ [k: string]: import("./config").GuildDatabase }>}
 * @throws {TypeError} - 如果mode不是0或1
 */
/**
 * @overload
 * @param {string} guildID - 伺服器ID
 * @param {0 | 1} [mode] - 0: 取得伺服器資料, 1: 取得所有資料
 * @returns {Promise<import("./config").GuildDatabase>}
 * @throws {TypeError} - 如果mode不是0或1
 */
/**
 * 讀取伺服器資料庫
 * @param {string | null} [guildID] - 伺服器ID
 * @param {0 | 1} [mode] - 0: 取得伺服器資料, 1: 取得所有資料
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

    if (mode === 0 && guildID) {
        // 從緩存中獲取
        const cacheManager = getCacheManager();

        const cached = cacheManager.get(CacheTypes.GUILD, guildID);
        if (cached) {
            return cached;
        };
    };

    const data = await readJson(database_file);

    if (mode === 0 && guildID) {
        const cacheManager = getCacheManager();

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
    const database_emptyeg = /** @type {import("./config").GuildDatabase} */ (find_default_value("database.json", {}));

    /** @type {{ [k: string]: import("./config").GuildDatabase }} */
    let data = {};

    if (await exists(database_file)) {
        data = /** @type {{ [k: string]: import("./config").GuildDatabase }} */(await readJson(database_file));
    };

    if (!(guildID in data)) {
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

    const cacheManager = getCacheManager();

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
 * @returns {Promise<string | null>} null if the prefix is already exists
 */
async function addPrefix(guildID, prefix) {
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
 * Load shop data of a user
 * @param {string} userid
 * @returns {Promise<import("./config").RpgShop>}
 */
async function load_shop_data(userid) {
    const shop_emptyeg = /** @type {import("./config").RpgShop} */ (find_default_value("rpg_shop.json", {}));

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

/**
 * Save shop data of a user
 * @param {string} userid
 * @param {import("./config").RpgShop} shop_data
 */
async function save_shop_data(userid, shop_data) {
    const shop_emptyeg = /** @type {import("./config").RpgShop} */ (find_default_value("rpg_shop.json", {}));

    /** @type {{ [k: string]: import("./config").RpgShop}} */
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
                delete data[userid].items[/** @type {import("./rpg").ItemKey} */ (item)];
            };
        };
    };

    data[userid] = order_data(data[userid], shop_emptyeg);

    await writeJson(rpg_shop_file, data);
};

/**
 *
 * @param {string} userid
 * @returns {Promise<import("./config").RpgFarm>}
 */
async function load_farm_data(userid) {
    const farm_emptyeg = /** @type {import("./config").RpgFarm} */ (find_default_value("rpg_farm.json", {}));

    const data = await readJson(rpg_farm_file);

    if (!data[userid]) {
        await save_farm_data(userid, farm_emptyeg);
        return farm_emptyeg;
    };

    return data[userid];
};

/**
 *
 * @param {string} userid
 * @param {import("./config").RpgFarm} farm_data
 */
async function save_farm_data(userid, farm_data) {
    const farm_emptyeg = /** @type {import("./config").RpgFarm} */ (find_default_value("rpg_farm.json", {}));

    /** @type {{ [k: string]: import("./config").RpgFarm }} */
    let data = {};
    if (await exists(rpg_farm_file)) {
        data = await readJson(rpg_farm_file);
    };

    if (!data[userid]) {
        data[userid] = farm_emptyeg;
    };

    data[userid] = { ...data[userid], ...farm_data };

    await writeJson(rpg_farm_file, data);
};

/**
 * Get the bake data from Json
 * @param {string} userId
 * @returns {Promise<import("../slashcmd/game/rpg/bake.js").BakeItemData[]>}
 */
async function load_bake_data(userId) {
    /** @type {{ [k: string]: import("../slashcmd/game/rpg/bake.js").BakeItemData[] }} */
    const whole_json_data = await readJson(bake_data_file);

    return whole_json_data?.[userId] || [];
};

/**
 * Save the bake data to Json
 * @param {string} userId - The ID of user
 * @param {import("../slashcmd/game/rpg/bake.js").BakeItemData[]} bake_data - The bake data
 */
async function save_bake_data(userId, bake_data) {
    /** @type {{ [k: string]: import("../slashcmd/game/rpg/bake.js").BakeItemData[] }} */
    const currentData = await readJson(bake_data_file);

    currentData[userId] = bake_data;

    await writeJson(bake_data_file, currentData);
};

/**
 * Load smelt data of a user
 * @param {string} userId
 * @returns {Promise<import("../slashcmd/game/rpg/smelt.js").SmeltData[]>}
 */
async function load_smelt_data(userId) {
    const data = await readJson(smelt_data_file);

    return data[userId] || [];
};

/**
 * Save smelt data of a user
 * @param {string} userId
 * @param {import("../slashcmd/game/rpg/smelt.js").SmeltData[]} data
 * @returns {Promise<void>}
 */
async function save_smelt_data(userId, data) {
    const currentData = await readJson(smelt_data_file);

    currentData[userId] = data;

    await writeJson(smelt_data_file, currentData);
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
 * @returns {Promise<[string, import("./config").DvoiceData][]>}
 */
async function loadDvoiceData() {
    return await readJson(dvoice_data_file);
};

/**
 * Save dynamic voice data
 * @param {[string, import("./config").DvoiceData][]} data - The data to save
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
 * @param {VoiceChannel | null} [channel] - The voice channel to set as dynamic voice channel
 * @returns {Promise<void>}
 */
async function setDynamicVoice(guildID, channel = null) {
    const data = await loadData(guildID);
    data["dynamicVoice"] = channel?.id || null;

    await saveData(guildID, data);
};


/**
 * Get the dynamic voice channel of a guild
 * @param {string} guildID - The ID of the guild
 * @returns {Promise<string | null>}
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
 * @returns {Promise<string>}
 */
async function join_temp_folder(filename) {
    const temp_folder = await get_temp_folder();

    const basename = path.basename(filename);
    return join_folder(temp_folder, basename);
};

/**
 * @returns {Promise<string>}
 */
async function get_temp_folder() {
    if (!(await exists(temp_folder))) {
        await mkdir(temp_folder, { recursive: true });
    };

    return temp_folder;
};

export {
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
    join_folder,
    join_db_folder,
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
