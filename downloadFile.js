const { downloadAllFiles } = require("./utils/onlineDB.js");

(async () => {
    await downloadAllFiles();

    process.exit(0);
})();