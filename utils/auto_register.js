const path = require("path");
const crypto = require("crypto");

const { existsSync, readFile, readdir, writeFile } = require("./file.js");
const { enable_auto_register_cmd, auto_register_cmd_file } = require("./config.js");

const DEBUG = false;

/**
 * 
 * @param {Array<string>} file_datas 
 * @returns {[string, number]}
 */
function get_hash_of_datas(file_datas) {
    let length = 0;

    // 將所有 file_datas 合併
    let combined_data = file_datas.join("");
    for (const data of file_datas) {
        length += data.length;
    };

    // 計算 SHA256 哈希值
    const hash = crypto.createHash("sha256").update(combined_data).digest("hex");

    return [length, hash];
};

async function read_all_files_in_dir(dir) {
    const files = (await readdir(dir, {
        recursive: true,
    })).filter(file => file.endsWith(".js")).sort(); // 排序確保順序一致

    const file_datas = [];

    for (const file of files) {
        const file_path = path.join(dir, file);
        const file_data = await readFile(file_path);
        file_datas.push(file_data);
    };

    return file_datas;
};

/**
 * 檢查是否需要註冊命令（不會更新 hash 文件）
 * @returns {Promise<boolean>}
 */
async function should_register_cmd() {
    if (!enable_auto_register_cmd) return false;

    if (existsSync(auto_register_cmd_file)) {
        let [length, hash] = (await readFile(auto_register_cmd_file)).split("|");
        length = parseInt(length);

        const file_datas_new = await read_all_files_in_dir("slashcmd");
        const [length_new, hash_new] = get_hash_of_datas(file_datas_new);
        const res = length !== length_new || hash !== hash_new;
        if (DEBUG) console.debug(`length(${length}) !== length_new(${length_new}): ${length !== length_new}`)
        if (DEBUG) console.debug(`hash(${hash}) !== hash_new(${hash_new}): ${hash !== hash_new}`);
        if (DEBUG) console.debug(`res: ${res}`)
        return res;
    } else {
        // 文件不存在時，需要註冊
        return true;
    };
};

/**
 * 更新 hash 文件（應在成功註冊命令後調用）
 * @returns {Promise<void>}
 */
async function update_cmd_hash() {
    const file_datas = await read_all_files_in_dir("slashcmd");
    const [length, hash] = get_hash_of_datas(file_datas);
    await writeFile(auto_register_cmd_file, `${length}|${hash}`);

    if (DEBUG) console.debug(`已更新 hash 文件: ${length}|${hash}`);
};


module.exports = {
    should_register_cmd,
    update_cmd_hash,
}
