import {
    Events,
} from "discord.js";
import {
    joinVoiceChannel,
    getVoiceConnection,
} from "@discordjs/voice";

import {
    get_logger,
} from "../utils/logger.js";
import {
    getQueue,
} from "../utils/music/music.js";
import DogClient from "../utils/customs/client.js";

const logger = get_logger();

const channels = [
    ["1422545977226690683", "1456132424042807427"], // 過夜
    ["1479354643476779131", "1479354647259910148"], // 呆鵝の語音聊天室1
    ["953638043846320158", "1365629151188484176"], // 瑪西亞の語音聊天頻道
];

const name = Events.ClientReady;
const once = true;

/**
 *
 * @param {DogClient} client
 */
const execute = async function (client) {
    for (const [guildID, channelID] of channels) {
        try {
            const guild = await client.guilds.fetch(guildID);
            if (!guild) return;

            const voiceChannel = await guild.channels.fetch(channelID);
            if (!voiceChannel?.isVoiceBased()) return;

            const queue = getQueue(guildID, true);

            const connection = getVoiceConnection(guildID) ?? joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                selfDeaf: true,
                selfMute: false,
                adapterCreator: guild.voiceAdapterCreator,
            });

            queue.setVoiceChannel(voiceChannel);
            queue.setConnection(connection);

            logger.info(`✅ Joined voice channel ${voiceChannel.name}`);
        } catch { };
    };
};

export { name, once, execute };