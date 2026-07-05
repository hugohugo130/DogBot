import {
    downloadAllFiles,
} from "./utils/onlineDB.js";

(async () => {
    await downloadAllFiles();

    process.exit(0);
})();