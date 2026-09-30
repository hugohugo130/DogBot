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
} from "./config.ts";

const extensions = [".ts", ".js"];
const DEBUG = false;

/**
 * Get SHA256 of a string array
 * @param {string[]} file_datas
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
        .filter(file => extensions.some((ext) => file.endsWith(ext)))
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
 * 計算所有指令相關檔案的 SHA256
 * 包含 slashcmd 與 context_menus 下的 .ts/.js
 * @returns {Promise<string>}
 */
async function compute_hash() {
    const file_datas = [
        ...await read_all_files_in_dir("slashcmd"),
        ...await read_all_files_in_dir("context_menus"),
    ];

    return get_hash_of_datas(file_datas);
};

/**
 * 檢查是否需要註冊命令
 * @returns {Promise<boolean>}
 */
export async function should_register_cmd() {
    if (!enable_auto_register_cmd) return false;

    if (await (exists(auto_register_cmd_file))) {
        const old_hash = String(await readFile(auto_register_cmd_file)).trim();
        const new_hash = await compute_hash();

        if (DEBUG) console.debug(`old_hash(${old_hash}) !== new_hash(${new_hash}): ${old_hash !== new_hash}`);

        return old_hash !== new_hash;
    } else {
        // 文件不存在時，需要註冊
        return true;
    };
};

/**
 * 更新 hash 文件（應在成功註冊命令後調用）
 * @returns {Promise<void>}
 */
export async function update_cmd_hash() {
    const hash = await compute_hash();
    await writeFile(auto_register_cmd_file, hash);

    if (DEBUG) console.debug(`已更新 hash 文件: ${hash}`);
};
