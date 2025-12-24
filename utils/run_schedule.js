// const schedule = require("node-schedule");
const path = require("path");
const { wait_until_ready } = require("./wait_until_ready.js");
const { asleep } = require("./sleep.js");
const { get_logger } = require("./logger.js");
const util = require("node:util");

const logger = get_logger({ nodc: true });
let run_lock = {};

async function interval(per_sec, execute, file, ...args) {
    while (true) {
        const start = Date.now();
        try {
            await execute(...args);
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            logger.error(`[interval] 每${per_sec}秒的排程，${file}執行錯誤: ${errorStack}`);

            await asleep(Math.max(per_sec * 1000, 1000));
        };

        const elapsed = Date.now() - start;
        const delay = per_sec * 1000 - elapsed;
        if (delay > 0) {
            await asleep(delay);
        } else {
            // 如果執行時間超過預定時間，至少等待100ms
            await asleep(100);
        };
    };
};

// function setup_schedule(spec, execute, client = null, ...args) {
async function setup_schedule(per_sec, execute, file, client = null, ...args) {
    if (!client) {
        client = wait_until_ready();
    };

    setTimeout(async () => {
        await interval(per_sec, execute, file, client, ...args)
    }, 0);

    // const workerScript = `
    //     parentPort.once("message", async ({ per_sec, args }) => {
    //         await interval(per_sec, require("${__filename}").scheduleFunc, ...args);
    //     });
    // `;

    // const worker = new Worker(workerScript, { eval: true });
    // worker.postMessage({ per_sec, args: [client, ...args] });



    // schedule.scheduleJob(spec, async function () {
    //     await execute(client, ...args);
    // });
};

async function wait_for_lock(basename, timeout = 5000, check_per = 100) {
    const start = Date.now();

    while (run_lock[basename]) {
        if (Date.now() - start >= timeout) {
            logger.warn(`等待鎖 ${basename} 超時`);
            return false;
        };
        await asleep(check_per);
    };

    return true;
};

async function scheduleFunc(client, file, per) {
    const basename = path.basename(file, ".js");

    // 等待鎖釋放
    const lockAcquired = await wait_for_lock(basename, 20000);
    if (!lockAcquired) {
        logger.warn(`無法獲取鎖 ${basename}，跳過此次執行`);
        return;
    };

    run_lock[basename] = true;
    try {
        const schedule = require(file);

        if (schedule.execute) {
            await schedule.execute(client);
        };
    } catch (error) {
        const errorStack = util.inspect(error, { depth: null });

        logger.error(`處理每${per}排程 ${basename} 時出錯：${errorStack}`);
    } finally {
        run_lock[basename] = false;
    };
};

async function run_schedule(client) {
    const { readScheduleSync } = require("./file.js");

    const [everysec, everymin, every5min] = readScheduleSync();

    for (const file of everysec) {
        await setup_schedule(1, scheduleFunc, file, client, file, "秒");
    };

    for (const file of everymin) {
        await setup_schedule(60, scheduleFunc, file, client, file, "分鐘");
    };

    for (const file of every5min) {
        await setup_schedule(300, scheduleFunc, file, client, file, "5分鐘");
    };

    return everysec.length + everymin.length + every5min.length;
};

module.exports = {
    run_schedule,
};
