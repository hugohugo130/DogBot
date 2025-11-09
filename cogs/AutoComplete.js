const { Events } = require("discord.js");
const { searchVideos } = require("../utils/youtubeSearch.js");
const { get_logger } = require("../utils/logger.js");

const logger = get_logger();

module.exports = {
    name: Events.InteractionCreate,
    execute: async function (client, interaction) {
        if (!interaction.isAutocomplete()) return;

        if (interaction.commandName === "play") {
            const focusedValue = interaction.options.getFocused();
            const choices = await searchVideos(focusedValue);
            try {
                await interaction.respond(choices);
            } catch (err) {
                if (err.toString().toLowerCase().includes("unknown interaction")) return;
                logger.error(err);
            };
        };
    },
};