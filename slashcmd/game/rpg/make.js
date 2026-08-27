import {
    SlashCommandBuilder,
    MessageFlags,
} from "discord.js";

import {
    get_name_of_id,
    get_emojis,
    recipes,
    tags,
    get_id_of_name,
} from "../../../utils/rpg.js";
import {
    load_inventory,
    load_rpg_data,
    save_inventory,
    save_rpg_data,
} from "../../../utils/db/rpg.js";
import {
    embed_error_color,
    embed_default_color,
} from "../../../utils/config.js";
import EmbedBuilder from "../../../utils/customs/embedBuilder.js";

/** @type {import("../../../utils/types").Slash} */
export const makeSlash = {
    builder: new SlashCommandBuilder()
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
            option.setName("item")
                .setNameLocalizations({
                    "zh-TW": "物品",
                    "zh-CN": "物品",
                })
                .setDescription("The item to be crafted")
                .setDescriptionLocalizations({
                    "zh-TW": "要合成的物品",
                    "zh-CN": "要合成的物品",
                })
                .setAutocomplete(true)
                .setRequired(true),
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setNameLocalizations({
                    "zh-TW": "數量",
                    "zh-CN": "数量",
                })
                .setDescription("The amount to be crafted")
                .setDescriptionLocalizations({
                    "zh-TW": "要合成的數量",
                    "zh-CN": "要合成的数量",
                })
                .setMinValue(1)
                .setRequired(false),
        ),
    allowedContext: ["dm", "guild"],
    stage: "beta",

    async execute(interaction, client) {
        const userid = interaction.user.id;

        const [inventory, [emoji_toolbox, emoji_cross]] = await Promise.all([
            load_inventory(userid),
            get_emojis(["toolbox", "crosS"], client),
        ]);

        const original_item_id = interaction.options.getString("item", true);
        const amount = interaction.options.getInteger("amount") ?? 1;

        const item_id = get_id_of_name(
            original_item_id
                .split("(")[0]
                .trim()
        );

        if (!get_id_of_name(get_name_of_id(item_id), null)) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 我不知道 ${original_item_id} 是什麼`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        } else if (!(item_id in recipes)) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 這種物品不能被製作`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        /** @type {{ item: string, amount: number }[]} */
        const item_required = recipes[item_id].input;

        /** @type {{ [k: string]: number }} */
        const item_need = {};

        /** @type {{ name: string, amount: number }[]} */
        const item_missing = [];

        for (const { item: need_item, amount: count } of item_required) {
            let item_id = need_item;

            if (need_item.startsWith("#")) {
                const tag = need_item.slice(1);

                for (const item of tags[tag]) {
                    if (inventory.get(item)) {
                        item_id = item;
                        break;
                    };
                };
            };

            if (!item_need[item_id]) item_need[item_id] = 0;
            item_need[item_id] += count * amount;
        };

        for (const need_item in item_need) {
            const have_amount = (inventory.get(need_item) ?? 0);
            if (have_amount < item_need[need_item]) {
                item_missing.push({
                    name: get_name_of_id(need_item),
                    amount: item_need[need_item] - have_amount,
                });
            };
        };

        if (item_missing.length) {
            const embed = new EmbedBuilder()
                .setTitle(`${emoji_cross} | 你沒有足夠的材料`)
                .setColor(embed_error_color)
                .setDescription(`你缺少了 ${item_missing.map(missing => `${missing.name} \`x${missing.amount}\`個`).join("、")}`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        };

        await interaction.deferReply();

        for (const need_item in item_need) {
            inventory.subtract_item(need_item, item_need[need_item]);
        };

        const output_amount = recipes[item_id].amount * amount;

        inventory.add_item(item_id, output_amount);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_toolbox} | 製作物品`)
            .setDescription(`你製作出了 \`${output_amount}\` 個 ${get_name_of_id(item_id)}`)
            .setEmbedFooter(interaction);

        await Promise.all([
            save_inventory(userid, inventory),
            interaction.editReply({ embeds: [embed] }),
        ]);
    },
};
