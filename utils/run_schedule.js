const schedule = require("node-schedule");
const path = require("path");
const { wait_until_ready } = require("./wait_until_ready.js");

let run_lock = {};

function setup_schedule(spec, execute, client = null, ...args) {
    if (!client) {
        client = wait_until_ready();
    };

    schedule.scheduleJob(spec, async function () {
        await execute(client, ...args);
    });
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

function run_schedule(client) {
    const { readScheduleSync } = require("./file.js");

    const [everysec, everymin] = readScheduleSync();

    for (const file of everysec) {
        setup_schedule("* * * * * *", scheduleFunc, client, file, "秒");
    };

    for (const file of everymin) {
        setup_schedule("0 * * * * *", scheduleFunc, client, file, "分鐘");
    };

    return everysec.length + everymin.length;
};

module.exports = {
    run_schedule,
};