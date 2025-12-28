const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    execute: async function () {
        const queue = global.convertToOggQueue;

        // 使用 Promise.all 並行執行 ffmpeg 轉換指令
        const promises = queue.map(ffmpegCommand => execPromise(ffmpegCommand));
        await Promise.all(promises);
    },
};