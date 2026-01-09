const { Events } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");

const { get_logger } = require("../utils/logger.js");
const DogClient = require("../utils/customs/client.js");

const logger = get_logger();

module.exports = {
    name: Events.ClientReady,
    once: true,
    /**
     * 
     * @param {DogClient} client
     */
    execute: async function (client) {
        const guild = client.guilds.cache.get("1422545977226690683");
        if (!guild) return;

        const voiceChannel = guild.channels.cache.get("1456132424042807427");
        if (!voiceChannel) return;

        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            selfDeaf: true,
            selfMute: false,
            adapterCreator: guild.voiceAdapterCreator,
        });
        logger.info(`✅ Joined voice channel ${voiceChannel.name}`);
    },
}