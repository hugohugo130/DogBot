const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require('form-data');
const util = require('node:util');

const { getServerIPSync } = require("./getSeverIPSync.js");
const { onlineDB_Files, DATABASE_FILES } = require("./config.js");
const { get_logger } = require("./logger.js");
const { existsSync, compareLocalRemote, join_db_folder } = require("./file.js");
const { get_areadline } = require("./readline.js");

const { IP: serverIP, PORT } = getServerIPSync();
const SERVER_URL = `http://${serverIP}:${PORT}`;

const logger = get_logger();

// 列出所有檔案
async function onlineDB_listFiles() {
    try {
        const res = await axios.get(`${SERVER_URL}/files`);
        return res.data.files;
    } catch (err) {
        const errorStack = util.inspect(err, { depth: null });

        logger.error(`列出檔案時遇到錯誤: ${errorStack}`);
    };
};

// 下載檔案
async function onlineDB_downloadFile(filename, savePath = null) {
    try {
        const res = await axios.get(`${SERVER_URL}/files/${filename}`, { responseType: 'stream' });

        if (savePath === null) savePath = join_db_folder(filename);
        const writer = fs.createWriteStream(savePath);
        res.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return savePath;
    } catch (err) {
        if (err.response.status === 404) {
            logger.error(`下載檔案時遇到錯誤: 檔案 ${filename} 不存在`);
            return [err, `下載檔案時遇到錯誤: 檔案 ${filename} 不存在`];
        } else {
            const errorStack = util.inspect(err, { depth: null });

            logger.error(`下載檔案時遇到未知錯誤: ${errorStack}`);
            return [err, `下載檔案時遇到未知錯誤: ${errorStack}`];
        };
    };
};

// 上載檔案
async function onlineDB_uploadFile(filepath) {
    try {
        // === 備份遠端檔案 ===
        filepath = join_db_folder(filepath);
        const filename = path.basename(filepath);
        const filenameWithoutExt = filename.replace(/\.(json|db)$/, "");
        const fileExt = path.extname(filename);
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const year = now.getFullYear();
        const month = pad(now.getMonth() + 1);
        const backupDir = `backup/${year}-${month}/${filenameWithoutExt}`;
        const timestamp = `${year}-${month}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const backupFile = `${backupDir}/${filename}-${timestamp}${fileExt}`;

        // 建立 backupDir
        await axios.post(`${SERVER_URL}/mkdir`, { dir: backupDir });
        // 複製檔案
        try {
            await axios.post(`${SERVER_URL}/copy`, { src: filename, dst: backupFile });
        } catch (err) {
            if (err.response?.status === 404) {
                logger.warn(`[警告] 備份遠端檔案時: 來源文件 ${filename} 不存在`);
            } else {
                throw err;
            };
        };

        const form = new FormData();
        form.append('file', fs.createReadStream(filepath));

        const stats = fs.statSync(filepath);
        form.append('mtime', stats.mtime.getTime());
        const res = await axios.post(`${SERVER_URL}/files`, form, { headers: form.getHeaders() });
        return res.data;
    } catch (err) {
        const errorStack = util.inspect(err, { depth: null });

        if (err) logger.error(`上載檔案時遇到錯誤: ${errorStack}`);
    };
};

// 刪除檔案
async function onlineDB_deleteFile(filename) {
    try {
        const res = await axios.delete(`${SERVER_URL}/files/${filename}`);
        return res.data;
    } catch (err) {
        if (err.response.status === 404) {
            logger.error(`刪除檔案時遇到錯誤: 檔案 ${filename} 不存在`);
            return [err, `刪除檔案時遇到錯誤: 檔案 ${filename} 不存在`];
        } else {
            const errorStack = util.inspect(err, { depth: null });

            logger.error(`刪除檔案時遇到未知錯誤: ${errorStack}`);
            return [err, `刪除檔案時遇到未知錯誤: ${errorStack}`];
        };
    }
};

async function onlineDB_checkFileContent(filename, maxRetries = 3) {
    const { stringify } = require("./file.js");

    const isSqlFile = filename.endsWith('.db');

    const [same, localContent, remoteContent] = await compareLocalRemote(filename, logger, maxRetries);
    const rl = get_areadline();

    if (!same && localContent && remoteContent) {
        let answer;

        do {
            console.log("=".repeat(30));
            console.log(`檔案 ${filename} 內容不同:`);
            console.log('1. 上載本地檔案到遠端');
            console.log('2. 下載遠端檔案到本地');
            console.log('3. 不做任何事');
            if (!isSqlFile) {
                console.log('4. 查看本地檔案內容')
                console.log('5. 查看遠端檔案內容')
            }

            answer = await rl.question(isSqlFile ? '請選擇操作 (1/2/3): ' : '請選擇操作 (1/2/3/4/5): ');

            if (!isSqlFile) {
                switch (answer.trim()) {
                    case '4':
                        console.log(JSON.parse(stringify(localContent)));
                        break;
                    case '5':
                        console.log(JSON.parse(stringify(remoteContent)));
                        break;
                    default:
                        break;
                };
            }

            const validOptions = isSqlFile ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];
            if (!validOptions.includes(answer.trim())) {
                console.log(`請輸入有效的選項 (${validOptions.join('/')})`);
            };
        } while (!['1', '2', '3'].includes(answer.trim()));

        console.log(`已選擇: ${answer.trim()}`);
        switch (answer.trim()) {
            case '1':
                await onlineDB_uploadFile(filename);
                return 1;
            case '2':
                await onlineDB_downloadFile(filename);
                return 2;
            case '3':
                console.log('未進行任何操作');
                return false;
        };
    } else if (localContent && !remoteContent) {
        logger.info(`遠端無 ${filename} 檔案，準備上載本地檔案`);
        await onlineDB_uploadFile(filename);
        return 1;
    } else if (!localContent && remoteContent) {
        logger.info(`本地無 ${filename} 檔案，準備下載遠端檔案`);
        await onlineDB_downloadFile(filename);
        return 2;
    };

    return !same;
};

// === 批量檢查所有資料庫檔案 ===
async function checkAllDatabaseFilesContent() {
    let executed = false;

    for (const file of DATABASE_FILES.filter(e => existsSync(join_db_folder(e)) && onlineDB_Files.includes(e))) {
        const res = await onlineDB_checkFileContent(file);
        // logger.debug(`正在檢查資料庫檔案內容 - ${file} - ${res}`);
        if (!executed && res) executed = true;
    };

    if (executed) console.log("=".repeat(30));
};

// === 批量上載所有資料庫檔案 ===
async function uploadAllDatabaseFiles() {
    for (const file of DATABASE_FILES.filter(e => existsSync(join_db_folder(e)) && onlineDB_Files.includes(e))) {
        await onlineDB_uploadFile(file);
    };

    return true;
};

// === 下載單一檔案到指定路徑 ===
async function downloadDatabaseFile(src, dst = null) {
    // 預設下載到 download/ 資料夾
    if (!dst) {
        const downloadDir = path.join(process.cwd(), 'download');
        if (!existsSync(downloadDir)) fs.mkdirSync(downloadDir);
        dst = path.join(downloadDir, path.basename(src));
    } else {
        // 若dst資料夾不存在則自動建立
        const dstDir = path.dirname(dst);
        if (!existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
    };

    await onlineDB_downloadFile(src, dst);
};

async function downloadAllFiles() {
    for (const filename of DATABASE_FILES.filter(e => existsSync(join_db_folder(e)) && onlineDB_Files.includes(e))) {
        const res = await onlineDB_downloadFile(filename);
        logger.debug(`downloaded ${filename}, saved to ${res}`);
    };
};

async function uploadChangedDatabaseFiles() {
    for (const file of onlineDB_Files.filter(e => existsSync(join_db_folder(e)))) {
        const localPath = join_db_folder(file);

        if (fs.existsSync(localPath)) {
            const isSqlFile = file.endsWith('.db');
            let localContent;

            try {
                if (isSqlFile) {
                    // SQL 檔案：讀取為 buffer 並計算 hash
                    localContent = fs.readFileSync(localPath);
                } else {
                    // JSON 檔案：讀取並格式化
                    localContent = fs.readFileSync(localPath, 'utf8');
                    localContent = JSON.stringify(JSON.parse(localContent));
                }
            } catch (err) {
                const errorStack = util.inspect(err, { depth: null });

                logger.error(`讀取本地檔案內容時遇到錯誤: ${errorStack}`);
                continue;
            };

            let remoteContent;
            try {
                if (isSqlFile) {
                    // SQL 檔案：下載為 buffer
                    const response = await axios.get(`${SERVER_URL}/files/${file}`, { responseType: 'arraybuffer' });
                    remoteContent = Buffer.from(response.data);
                } else {
                    // JSON 檔案
                    const response = await axios.get(`${SERVER_URL}/files/${file}`);
                    remoteContent = JSON.stringify(response.data);
                };
            } catch (err) {
                if (err.response?.status === 404) {
                    logger.info(`遠端無 ${file} 檔案，準備上傳本地檔案`);
                    await onlineDB_uploadFile(file);
                } else {
                    const errorStack = util.inspect(err, { depth: null });

                    logger.error(`獲取遠端檔案內容時遇到錯誤: ${errorStack}`);
                };

                continue;
            };

            // 比對內容
            let isDifferent = false;
            if (isSqlFile) {
                isDifferent = !localContent.equals(remoteContent);
            } else {
                isDifferent = localContent !== remoteContent;
            }

            if (isDifferent) {
                logger.info(`資料庫檔案 ${file} 內容不同，上傳本地版本`);
                await onlineDB_uploadFile(file);
            };
        }
    }
};

module.exports = {
    onlineDB_checkFileContent,
    onlineDB_deleteFile,
    onlineDB_downloadFile,
    onlineDB_listFiles,
    onlineDB_uploadFile,
    checkAllDatabaseFilesContent,
    uploadAllDatabaseFiles,
    downloadAllFiles,
    downloadDatabaseFile,
    uploadChangedDatabaseFiles,
}
