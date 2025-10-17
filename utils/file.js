const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const { INDENT, onlineDB_Files, DATABASE_FILES } = require("./config.js");
const { getServerIPSync } = require("./getSeverIPSync.js");

const existsSync = fs.existsSync;
const readdirSync = fs.readdirSync;
const readdir = fsp.readdir;
const join = path.join;

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

// ====================================== 線 上 資 料 庫 ======================================

const { serverIP, PORT } = getServerIPSync();
const SERVER_URL = `http://${serverIP}:${PORT}`;

// 列出所有檔案
async function onlineDB_listFiles() {
    try {
        const res = await axios.get(`${SERVER_URL}/files`);
        return res.data.files;
    } catch (err) {
        console.error(`列出檔案時遇到錯誤: ${err.stack}`);
    };
};

// 下載檔案
async function onlineDB_downloadFile(filename, savePath = null) {
    try {
        const res = await axios.get(`${SERVER_URL}/files/${filename}`, { responseType: 'stream' });
        if (savePath === null) savePath = filename;
        const writer = fs.createWriteStream(savePath);
        res.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        return savePath;
    } catch (err) {
        if (err.response.status === 404) {
            console.error(`下載檔案時遇到錯誤: 檔案 ${filename} 不存在`);
            return [err, `下載檔案時遇到錯誤: 檔案 ${filename} 不存在`];
        } else {
            console.error(`下載檔案時遇到未知錯誤: ${err.stack}`);
            return [err, `下載檔案時遇到未知錯誤: ${err.stack}`];
        };
    };
};

// 上傳檔案
async function onlineDB_uploadFile(filepath) {
    try {
        // === 備份遠端檔案 ===
        const filename = path.basename(filepath);
        const filenameWithoutExt = filename.replace(/\.json$/, "");
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const backupDir = `backup/${year}-${month}/${filenameWithoutExt}`;
        const timestamp = `${year}-${month}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const backupFile = `${backupDir}/${filename}-${timestamp}.json`;

        // 建立 backupDir
        await axios.post(`${SERVER_URL}/mkdir`, { dir: backupDir });
        // 複製檔案
        try {
            await axios.post(`${SERVER_URL}/copy`, { src: filename, dst: backupFile });
        } catch (err) {
            if (err.response?.status === 404) {
                console.warn(`[警告] 備份遠端檔案時: 來源文件 ${filename} 不存在`);
            } else {
                throw err;
            };
        };
        // === 上傳新檔案 ===
        const form = new FormData();
        form.append('file', fs.createReadStream(filepath));
        // 取得本地檔案的 mtime
        const stats = fs.statSync(filepath);
        form.append('mtime', stats.mtime.getTime());
        const res = await axios.post(`${SERVER_URL}/files`, form, { headers: form.getHeaders() });
        return res.data;
    } catch (err) {
        if (err)
            console.error(`上傳檔案時遇到錯誤: ${err.stack}`);
    };
};

// 刪除檔案
async function onlineDB_deleteFile(filename) {
    try {
        const res = await axios.delete(`${SERVER_URL}/files/${filename}`);
        return res.data;
    } catch (err) {
        if (err.response.status === 404) {
            console.error(`刪除檔案時遇到錯誤: 檔案 ${filename} 不存在`);
            return [err, `刪除檔案時遇到錯誤: 檔案 ${filename} 不存在`];
        } else {
            console.error(`刪除檔案時遇到未知錯誤: ${err.stack}`);
            return [err, `刪除檔案時遇到未知錯誤: ${err.stack}`];
        };
    }
};

async function onlineDB_checkFileContent(filename) {
    // 讀取本地檔案內容
    let localContent;
    try {
        localContent = fs.readFileSync(filename, 'utf8');
    } catch (err) {
        console.error(`讀取本地檔案內容時遇到錯誤: ${err.stack}`);
        localContent = null;
    };

    // 從遠端獲取檔案內容
    let remoteContent;
    try {
        const response = await axios.get(`${SERVER_URL}/files/${filename}`);
        remoteContent = JSON.stringify(response.data);
        localContent = JSON.stringify(JSON.parse(localContent)); // 格式化本地內容以進行比較
    } catch (err) {
        if (err.response?.status === 404) {
            console.error(`遠端檔案不存在: ${filename}`);
        } else {
            console.error(`獲取遠端檔案內容時遇到錯誤: ${err.stack}`);
        };

        remoteContent = null;
    };

    if (localContent && remoteContent) {
        if (localContent !== remoteContent) {
            const rl = require("readline/promises").createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log("=".repeat(30));
            console.log(`檔案 ${filename} 內容不同:`);
            console.log('1. 上傳本地檔案到遠端');
            console.log('2. 下載遠端檔案到本地');
            console.log('3. 不做任何事');

            const answer = await rl.question('請選擇操作 (1/2/3): ');
            rl.close();
            result = true;
            switch (answer.trim()) {
                case '1':
                    await onlineDB_uploadFile(filename);
                    break;
                case '2':
                    await onlineDB_downloadFile(filename);
                    break;
                default:
                    console.log('未進行任何操作');
            };

            console.log("=".repeat(30));
            delete rl;
        };
    } else if (localContent && !remoteContent) {
        console.log(`遠端無 ${filename} 檔案，準備上傳本地檔案`);
        await onlineDB_uploadFile(filename);
    } else if (!localContent && remoteContent) {
        console.log(`本地無 ${filename} 檔案，準備下載遠端檔案`);
        await onlineDB_downloadFile(filename);
    };
};

// === 批量檢查所有資料庫檔案 ===
async function checkAllDatabaseFilesContent() {
    for (const file of DATABASE_FILES) {
        await onlineDB_checkFileContent(file);
    };
};

// === 批量上傳所有資料庫檔案 ===
async function uploadAllDatabaseFiles() {
    for (const file of DATABASE_FILES) {
        if (fs.existsSync(file) && onlineDB_Files.includes(file)) {
            await onlineDB_uploadFile(file);
        };
    };
};

// === 下載單一檔案到指定路徑 ===
async function downloadDatabaseFile(src, dst = null) {
    // 預設下載到 download/ 資料夾
    if (!dst) {
        const downloadDir = path.join(process.cwd(), 'download');
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);
        dst = path.join(downloadDir, path.basename(src));
    } else {
        // 若dst資料夾不存在則自動建立
        const dstDir = path.dirname(dst);
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    };

    await onlineDB_downloadFile(src, dst);
};

// ====================================== 線 上 資 料 庫 ======================================

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
    join,
    // 線上資料庫
    onlineDB_checkFileContent,
    onlineDB_deleteFile,
    onlineDB_downloadFile,
    onlineDB_listFiles,
    onlineDB_uploadFile,
    checkAllDatabaseFilesContent,
    uploadAllDatabaseFiles,
    downloadDatabaseFile,
    // END
};
