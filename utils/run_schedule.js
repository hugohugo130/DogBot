// const schedule = require("node-schedule");
const path = require("path");
const { wait_until_ready } = require("./wait_until_ready.js");
const { asleep } = require("./sleep.js");

let run_lock = {};

async function interval(per_sec, execute, ...args) {
    while (true) {
        const start = Date.now();
        await execute(...args);
        const elapsed = Date.now() - start;
        const delay = per_sec * 1000 - elapsed;
        if (delay > 0) {
            await asleep(delay);
        };
    };
};

// function setup_schedule(spec, execute, client = null, ...args) {
async function setup_schedule(per_sec, execute, client = null, ...args) {
    if (!client) {
        client = wait_until_ready();
    };

    setTimeout(async () => {
        await interval(per_sec, execute, client, ...args)
    }, 0);

    // const workerScript = `
    //     parentPort.once('message', async ({ per_sec, args }) => {
    //         await interval(per_sec, require('${__filename}').scheduleFunc, ...args);
    //     });
    // `;

    // const worker = new Worker(workerScript, { eval: true });
    // worker.postMessage({ per_sec, args: [client, ...args] });



    // schedule.scheduleJob(spec, async function () {
    //     await execute(client, ...args);
    // });
};

function wait_for_lock(basename, timeout = 5, start = 0, check_per = 500) {
    if (timeout && start >= timeout) return false;
    if (run_lock[basename]) return true;
    if (timeout) start += check_per;
    setTimeout(() => {
        wait_for_lock(basename, timeout, start, check_per);
    }, check_per);
};

async function scheduleFunc(client, file, per) {
    const basename = path.basename(file, '.js');
    wait_for_lock(basename, 20);
    run_lock[basename] = true;
    try {
        const schedule = require(file);

        if (schedule.execute) {
            await schedule.execute(client);
        };
    } catch (error) {
        require("./senderr.js").senderr({ client: client, msg: `處理每${per}排程 ${basename} 時出錯：${error.stack}`, clientready: true });
    } finally {
        run_lock[basename] = false;
    };
};

async function run_schedule(client) {
    const { readScheduleSync } = require("./file.js");

    const [everysec, everymin, every5min] = readScheduleSync();

    for (const file of everysec) {
        await setup_schedule(1, scheduleFunc, client, file, "秒");
    };

    for (const file of everymin) {
        await setup_schedule(60, scheduleFunc, client, file, "分鐘");
    };

    for (const file of every5min) {
        await setup_schedule(300, scheduleFunc, client, file, "5分鐘");
    };

    return everysec.length + everymin.length + every5min.length;
};

module.exports = {
    run_schedule,
};