const { Events } = require("discord.js");
// const { searchVideos } = require("../utils/youtubeSearch.js");
const { get_logger } = require("../utils/logger.js");

const logger = get_logger();

module.exports = {
    name: Events.InteractionCreate,
    execute: async function (client, interaction) {
        const { load_rpg_data } = require("../utils/file.js");
        const { get_name_of_id, bake } = require("../utils/rpg.js");
        if (!interaction.isAutocomplete()) return;

        if (interaction.commandName === "play") {
            // const focusedValue = interaction.options.getFocused();
            // const choices = await searchVideos(focusedValue);
            // try {
            //     await interaction.respond(choices);
            // } catch (err) {
            //     if (err.toString().toLowerCase().includes("unknown interaction")) return;
            //     logger.error(err);
            // };
        } else if (interaction.commandName === "bake") {
            const userid = interaction.user.id;
            const rpg_data = await load_rpg_data(userid);
            const focusedValue = interaction.options.getFocused();
            const choices = Object.keys(rpg_data.inventory).filter(choice =>
                Object.keys(bake).includes(choice)
                && choice.startsWith(focusedValue)
                || get_name_of_id(choice).startsWith(focusedValue)
            );

            await interaction.respond(
                choices.map(choice => ({ name: get_name_of_id(choice), value: choice })),
            );
        };
    },
};