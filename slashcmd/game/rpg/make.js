const { SlashCommandBuilder, ChatInputCommandInteraction } = require("discord.js");

const { get_name_of_id, get_emojis, recipes, tags } = require("../../../utils/rpg.js");
const { load_rpg_data, save_rpg_data } = require("../../../utils/file.js");
const { embed_error_color, embed_default_color } = require("../../../utils/config.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");
const DogClient = require("../../../utils/customs/client.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("make")
        .setDescription("Craft items and weapons")
        .setNameLocalizations({
            "zh-TW": "製作",
            "zh-CN": "制作",
        })
        .setDescriptionLocalizations({
            "zh-TW": "合成製作武器和物品",
            "zh-CN": "合成制造武器和物品",
        })
        .addStringOption(option =>
            option.setName("物品")
                .setDescription("要合成的物品")
                .setRequired(true)
                .addChoices(
                    ...Object.entries(recipes).map(([item_id, recipe]) => {
                        const recipe_str = recipe.input.map(input =>
                            `${get_name_of_id(input.item) || input.item}x${input.amount}`
                        ).join("、");

                        return {
                            name: `${get_name_of_id(item_id)}x${recipe.amount} (${recipe_str})`,
                            value: `${item_id}|${recipe.input.map(input =>
                                `${input.item}*${input.amount}`
                            ).join(",")}`
                        };
                    })
                ),
        )
        .addIntegerOption(option =>
            option.setName("數量")
                .setDescription("要合成的數量")
                .setMinValue(1)
                .setRequired(false),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     * @returns {Promise<any>}
     */
    async execute(interaction, client) {
        const userid = interaction.user.id;

        const [_, rpg_data, [emoji_toolbox, emoji_cross]] = await Promise.all([
            interaction.deferReply(),
            load_rpg_data(userid),
            get_emojis(["toolbox", "crosS"], client),
        ]);

        const item_str = interaction.options.getString("物品", true);
        const amount = interaction.options.getInteger("數量") ?? 1;

        const item = item_str.split("|");
        const item_id = item[0];

        /** @type {{ [k: string]: amount}} */
        let item_need = {};

        /** @type {{ name: string, amount: number }[]} */
        let item_missing = [];

        for (const need of item[1].split(",")) {
            const need_item = need.split("*");
            const count = parseInt(need_item[1]) || 1;
            let id = need_item[0];
            let real_id = id;

            if (id.startsWith("#")) {
                const tag = id.replace("#", "");
                for (const item of tags[tag]) {
                    if (rpg_data.inventory[item]) {
                        id = item;
                        break;
                    };
                };

                if (!id.startsWith("#")) {
                    real_id = id;
                } else {
                    real_id = need_item[0];
                };
            };

            item_need[real_id] = (item_need[real_id] || 0) + count * amount;
        };

        for (const need_item in item_need) {
            const have_amount = (rpg_data.inventory[need_item] || 0);
            if (have_amount < item_need[need_item]) {
                item_missing.push({
                    name: get_name_of_id(need_item),
                    amount: item_need[need_item] - have_amount,
                });
            };
        };

        if (item_missing.length > 0) {
            const items = [];
            for (const missing of item_missing) {
                items.push(`${missing.name} \`x${missing.amount}\`個`);
            };

            const embed = new EmbedBuilder()
                .setTitle(`${emoji_cross} | 你沒有足夠的材料`)
                .setColor(embed_error_color)
                .setDescription(`你缺少了 ${items.join("、")}`)
                .setEmbedFooter(interaction);

            return await interaction.editReply({ embeds: [embed] });
        };

        for (const need_item in item_need) {
            if (!rpg_data.inventory[need_item]) rpg_data.inventory[need_item] = 0;
            rpg_data.inventory[need_item] -= item_need[need_item];
        };

        const output_amount = recipes[item_id].amount * amount;

        if (!rpg_data.inventory[item_id]) rpg_data.inventory[item_id] = 0;
        rpg_data.inventory[item_id] += output_amount;
        await save_rpg_data(userid, rpg_data);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_toolbox} | 製作物品`)
            .setDescription(`你製作出了 \`${output_amount}\` 個 ${get_name_of_id(item_id)}`)
            .setEmbedFooter(interaction);

        await interaction.editReply({ embeds: [embed] });
    },
};
