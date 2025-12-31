const { exec } = require('child_process');
const util = require('util');

const { get_logger } = require('../../utils/logger.js');

const execPromise = util.promisify(exec);

const logger = get_logger();

async function execFFmpegCommand(cmdData) {
    const { cmd, input, output } = cmdData;
    if (!cmd || !input || !output) return;

    logger.debug(`執行 FFmpeg 指令: ${cmd}`);

    await execPromise(cmd);
};

module.exports = {
    execute: async function () {
        if (!global.convertToOggQueue) global.convertToOggQueue = [];
        if (global.convertToOggQueue.length === 0) return;

        const queue = [...new Set(global.convertToOggQueue)];

        // 使用 Promise.all 並行執行 ffmpeg 轉換指令
        const promises = queue.map(ffmpegCommandData => execFFmpegCommand(ffmpegCommandData));
        await Promise.all(promises);

        // 清空轉換佇列
        global.convertToOggQueue = [];
    },
};