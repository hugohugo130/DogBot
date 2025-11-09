const { Events } = require("discord.js");
const { searchVideos } = require("../utils/youtubeSearch.js");

module.exports = {
    name: Events.InteractionCreate,
    execute: async function (client, interaction) {
        if (!interaction.isAutocomplete()) return;

        if (interaction.commandName === '播放音樂') {
            const focusedValue = interaction.options.getFocused();
            const choices = await searchVideos(focusedValue);
            await interaction.respond(choices);
        };
    },
};