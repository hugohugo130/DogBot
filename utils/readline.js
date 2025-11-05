// const readline = require("readline");
const readlinep = require("readline/promises");

// function get_readline(createInterface = true) {
//     if (global._readline) return global._readline;
//     let rl;

//     if (createInterface) {
//         rl = readline.createInterface({
//             input: process.stdin,
//             output: process.stdout,
//         });
//     };

//     return rl;
// };

function get_areadline(createInterface = true) {
    if (global._areadline) return global._areadline;
    let rl;

    if (createInterface) {
        rl = readlinep.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
    };

    global._areadline = rl;

    return rl;
};

module.exports = {
    // get_readline,
    get_areadline,
}