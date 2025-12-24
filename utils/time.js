module.exports = {
    time(str = "[{t}]") {
        // YYYY-MM-DD HH:MM:SS
        const currentTime =  new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "); // 取得當前時間
        if (str) {
            return str.replace("{t}", currentTime);
        } else return currentTime;
    },
    time2(str = "[{t}]") {
        // YYYY-MM-DD HH:MM:SS.ms
        const currentTime =  new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 23).replace("T", " "); // 取得當前時間
        if (str) {
            return str.replace("{t}", currentTime);
        } else return currentTime;
    },
};