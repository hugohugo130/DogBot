const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const { INDENT, DATABASE_FILES, DEFAULT_VALUES } = require("./config.js");
const { get_logger } = require("./logger.js");

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const readdir = fsp.readdir;
const join = path.join;
const logger = get_logger();

/**
 * 
 * @param {fs.PathOrFileDescriptor} file_path 
 * @param {{encoding?: null | undefined, flag?: string | undefined} | null} options 
 * @returns {NonSharedBuffer}
 */
function readFileSync(file_path, options = null) {
    const filename = path.basename(file_path)
    if (DATABASE_FILES.includes(filename) && !existsSync(filename)) {
        const default_value = Object.values(DEFAULT_VALUES).reduce((acc, category) => {
            return acc || category[filename];
        }, undefined);

        if (!default_value) {
            logger.warn(`警告：資料庫檔案 ${filename} 缺失預設值，請及時補充。`);
            return {};
        };

        writeJsonSync(file_path, default_value);
        return default_value;
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
    fs.writeFileSync(path, data);
};

async function read(path) {
    return await fsp.readFile(path, {
        encoding: "utf-8",
    });
};

async function write(path, data) {
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
};
