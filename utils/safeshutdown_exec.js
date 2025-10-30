const { safeshutdown } = require("./safeshutdown");

(async () => {
    await safeshutdown();
})();