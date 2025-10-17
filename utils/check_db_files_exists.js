const { writeJson, existsSync } = require("./file.js");
const { database_folder, DATABASE_FILES } = require("./config.js");

async function checkDBFilesExists() {
    for (const [file, defaultValue] of Object.entries(DATABASE_FILES)) {
        const filePath = `${database_folder}/${file}`;
        if (!existsSync(filePath)) {
            const default_value = await writeJson(filePath, defaultValue);
            console.warn(`資料庫檔案 ${file} 不存在，已建立 (預設值為: ${default_value})`);
        };
    };
};

module.exports = {
    checkDBFilesExists,
};