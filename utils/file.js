const fs = require("fs")
const fsp = fs.promises;

const { INDENT } = require("./config.js");

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const readdir = fsp.readdir;

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
    readdirSync,
    readdir,
    readScheduleSync,
    readSchedule,
};
