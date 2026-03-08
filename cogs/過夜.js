const { Events } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");

const { get_logger } = require("../utils/logger.js");
const DogClient = require("../utils/customs/client.js");

const logger = get_logger();

const channels = [
    ["1422545977226690683", "1456132424042807427"], // 過夜
    ["1479354643476779131", "1479354647259910148"], // 呆鵝の語音聊天室1
    ["953638043846320158", "1365629151188484176"], // 瑪西亞の語音聊天頻道
];

module.exports = {
    name: Events.ClientReady,
    once: true,
    /**
     * 
     * @param {DogClient} client
     */
    execute: async function (client) {
        for (const [guildID, channelID] of channels) {
            const guild = await client.guilds.fetch(guildID);
            if (!guild) return;

            const voiceChannel = await guild.channels.fetch(channelID);
            if (!voiceChannel) return;

            if (!getVoiceConnection(guildID)) {
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guild.id,
                    selfDeaf: true,
                    selfMute: false,
                    adapterCreator: guild.voiceAdapterCreator,
                });
            };

            logger.info(`✅ Joined voice channel ${voiceChannel.name}`);
        };
    },
};