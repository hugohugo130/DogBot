(async () => {
    const { downloadAllFiles } = require("./utils/onlineDB.js");

    await downloadAllFiles();
    global._cacheManager?.destroy?.();
})();