import path from "path";
import crypto from "crypto";

import {
    exists,
    readFile,
    readdir,
    writeFile,
} from "./file.js";
import {
    enable_auto_register_cmd,
    auto_register_cmd_file,
} from "./config.js";

const DEBUG = false;

/**
 * Get SHA256 of an array<string>
 * @param {Array<string>} file_datas
 * @returns {string}
 */
function get_hash_of_datas(file_datas) {
    // 將所有 file_datas 合併
    let combined_data = file_datas.join("");

    // 計算 SHA256 哈希值
    const hash = crypto.createHash("sha256").update(combined_data).digest("hex");

    return hash;
};

/**
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function read_all_files_in_dir(dir) {
    const files = (await readdir(dir, {
        recursive: true,
        encoding: "utf-8",
    }))
        .filter(file => file.endsWith(".js"))
        .sort(); // 排序確保順序一致

    const file_datas = [];

    for (const file of files) {
        const file_path = path.join(dir, file);
        const file_data = await readFile(file_path, {
            encoding: "utf-8",
        });

        file_datas.push(file_data);
    };

    return file_datas;
};

/**
 * 檢查是否需要註冊命令
 * @returns {Promise<boolean>}
 */
async function should_register_cmd() {
    if (!enable_auto_register_cmd) return false;

    if (await (exists(auto_register_cmd_file))) {
        const hash = await readFile(auto_register_cmd_file);

        const file_datas_new = await read_all_files_in_dir("slashcmd");
        const hash_new = get_hash_of_datas(file_datas_new);

        if (DEBUG) console.debug(`hash(${hash}) !== hash_new(${hash_new}): ${hash !== hash_new}`);

        return hash !== hash_new;
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
    const hash = get_hash_of_datas(file_datas);
    await writeFile(auto_register_cmd_file, `${hash}`);

    if (DEBUG) console.debug(`已更新 hash 文件: ${hash}`);
};


export {
    should_register_cmd,
    update_cmd_hash,
};
