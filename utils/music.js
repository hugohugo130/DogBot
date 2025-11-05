const { musicFileFolder } = require("./config.js");
const { existsSync, mkdirSync, createWriteStream } = require("./file.js");
const ytdl = require("ytdl-core");

if (!existsSync(musicFileFolder)) mkdirSync(musicFileFolder, { recursive: true });

/*
██████╗ ██╗   ██╗██╗██╗  ████████╗   ██╗███╗   ██╗
██╔══██╗██║   ██║██║██║  ╚══██╔══╝   ██║████╗  ██║
██████╔╝██║   ██║██║██║     ██║█████╗██║██╔██╗ ██║
██╔══██╗██║   ██║██║██║     ██║╚════╝██║██║╚██╗██║
██████╔╝╚██████╔╝██║███████╗██║      ██║██║ ╚████║
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝      ╚═╝╚═╝  ╚═══╝
*/

/**
 * 
 * @param {string} url 
 * @returns {ReadableStream}
 */
function downloadAudio(url) {
    const audio = ytdl(url, { quality: "highestaudio" });
    const savePath = `${musicFileFolder}/${url}.mp3`;
    audio.pipe(createWriteStream(savePath));
    return savePath;
};

