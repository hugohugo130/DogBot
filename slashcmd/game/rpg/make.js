const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { recipes, get_name_of_id } = require("../../../utils/rpg.js");

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
    async execute(interaction) {
        const { load_rpg_data, save_rpg_data } = require("../../../utils/file.js");
        const { get_name_of_id, tags } = require("../../../utils/rpg.js");
        const { setEmbedFooter } = require("../../../cogs/rpg/msg_handler.js");
        const { get_emoji } = require("../../../utils/rpg.js");
        const { embed_error_color } = require("../../../utils/config.js");

        await interaction.deferReply();

        const userid = interaction.user.id;
        let rpg_data = load_rpg_data(userid);

        let item = interaction.options.getString("物品");
        const amount = interaction.options.getInteger("數量") ?? 1;

        item = item.split("|");
        const item_id = item[0];

        let item_need = {};
        let item_missing = [];

        for (const need of item[1].split(",")) {
            const need_item = need.split("*");
            const count = need_item[1] || 1;
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
                }
            }
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
                .setTitle("你沒有足夠的材料")
                .setColor(embed_error_color)
                .setDescription(`你缺少了 ${items.join("、")}`);

            return await interaction.editReply({ embeds: [setEmbedFooter(interaction.client, embed)], flags: MessageFlags.Ephemeral });
        };

        for (const need_item in item_need) {
            if (!rpg_data.inventory[need_item]) rpg_data.inventory[need_item] = 0;
            rpg_data.inventory[need_item] -= item_need[need_item];
        };

        const output_amount = recipes[item_id].amount * amount;

        if (!rpg_data.inventory[item_id]) rpg_data.inventory[item_id] = 0;
        rpg_data.inventory[item_id] += output_amount;
        save_rpg_data(userid, rpg_data);

        const emoji = await get_emoji(interaction.client, "toolbox");
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`${emoji} | 製作物品`)
            .setDescription(`你製作出了 \`${output_amount}\` 個 ${get_name_of_id(item_id)}`);

        await interaction.editReply({ embeds: [setEmbedFooter(interaction.client, embed)] });
    },
};
