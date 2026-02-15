const { getCacheManager } = require("./utils/cache.js");
const { downloadAllFiles } = require("./utils/onlineDB.js");

(async () => {
    try {
        await downloadAllFiles();
    } finally {
        getCacheManager(false)?.destroy?.();
    };

    process.exit(0);
})();