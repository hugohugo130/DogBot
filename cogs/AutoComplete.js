const { Events, AutocompleteInteraction } = require("discord.js");

const { wrong_job_embed, get_name_of_id, bake, smeltable_recipe } = require("../utils/rpg.js");
const { load_rpg_data } = require("../utils/file.js");
const DogClient = require("../utils/customs/client.js");

const smeltable_items = smeltable_recipe.reduce((acc, item) => {
    const key = item.input.item;

    acc[key] = {
        I_amount: item.input.amount,
        O_item_id: item.output,
        O_amount: item.amount
    };
    return acc;
}, {});

module.exports = {
    name: Events.InteractionCreate,
    /**
     * 
     * @param {DogClient} client 
     * @param {AutocompleteInteraction} interaction 
     * @returns 
     */
    execute: async function (client, interaction) {
        if (!interaction.isAutocomplete()) return;

        const userid = interaction.user.id;

        switch (interaction.commandName) {
            case "play": {
                // const focusedValue = interaction.options.getFocused();
                // const choices = await searchVideos(focusedValue);
                // try {
                //     await interaction.respond(choices);
                // } catch (err) {
                //     if (err.toString().toLowerCase().includes("unknown interaction")) return;
                //     logger.error(err);
                // };
            };

            case "bake": {
                const rpg_data = await load_rpg_data(userid);

                const [wrong_job, _] = await wrong_job_embed(rpg_data, "/bake", userid, interaction, client);
                if (wrong_job) return await interaction.respond([
                    { name: wrong_job.data.title ?? "", value: "nothing" }
                ]);

                const focusedValue = interaction.options.getFocused();
                const choices = Object.keys(rpg_data.inventory)
                    .filter(item =>
                        Object.keys(bake).includes(item)
                        && (
                            item.startsWith(focusedValue)
                            || get_name_of_id(item).startsWith(focusedValue)
                        )
                    )
                    .slice(0, 25)
                    .map(item => ({ name: get_name_of_id(item), value: item }));

                await interaction.respond(choices);

                break;
            };

            case "smelt": {
                const rpg_data = await load_rpg_data(userid);

                const [wrong_job, _] = await wrong_job_embed(rpg_data, "/smelt", userid, interaction, client);
                if (wrong_job) return await interaction.respond([
                    { name: wrong_job.data.title ?? "", value: "nothing" }
                ]);

                const focusedValue = interaction.options.getFocused();
                const choices = Object.keys(rpg_data.inventory)
                    .filter(item =>
                        Object.keys(smeltable_items).includes(item)
                        && (
                            item.startsWith(focusedValue)
                            || get_name_of_id(item).startsWith(focusedValue)
                        )
                    )
                    .slice(0, 25)
                    .map(item => {
                        const smelt_data = smeltable_items[item];

                        const I_item_id = item;
                        const { I_amount, O_item_id, O_amount } = smelt_data;

                        return {
                            name: `${get_name_of_id(I_item_id)} x${I_amount} => ${get_name_of_id(O_item_id)} x${O_amount}`,
                            value: item,
                        };
                    });

                await interaction.respond(choices);

                break;
            };
        };
    },
};