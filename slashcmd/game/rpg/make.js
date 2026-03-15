const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require("discord.js");

const { get_name_of_id, get_emojis, recipes, tags, get_id_of_name, get_emoji, subtract_item, add_item } = require("../../../utils/rpg.js");
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
                .setAutocomplete(true)
                .setRequired(true),
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

        let [_, rpg_data, [emoji_toolbox, emoji_cross]] = await Promise.all([
            interaction.deferReply(),
            load_rpg_data(userid),
            get_emojis(["toolbox", "crosS"], client),
        ]);

        const original_item_id = interaction.options.getString("物品", true);
        const amount = interaction.options.getInteger("數量") ?? 1;

        const item_id = get_id_of_name(
            original_item_id
                .split("(")[0]
                .trim()
        );

        if (!get_name_of_id(item_id)) {
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
                    if (rpg_data.inventory[item]) {
                        item_id = item;
                        break;
                    };
                };
            };

            if (!item_need[item_id]) item_need[item_id] = 0;
            item_need[item_id] += count * amount;
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

        if (item_missing.length) {
            const embed = new EmbedBuilder()
                .setTitle(`${emoji_cross} | 你沒有足夠的材料`)
                .setColor(embed_error_color)
                .setDescription(`你缺少了 ${item_missing.map(missing => `${missing.name} \`x${missing.amount}\`個`).join("、")}`)
                .setEmbedFooter(interaction);

            return await interaction.editReply({ embeds: [embed] });
        };

        for (const need_item in item_need) {
            rpg_data = subtract_item(rpg_data, need_item, item_need[need_item]);
        };

        const output_amount = recipes[item_id].amount * amount;

        rpg_data = add_item(rpg_data, item_id, output_amount);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_toolbox} | 製作物品`)
            .setDescription(`你製作出了 \`${output_amount}\` 個 ${get_name_of_id(item_id)}`)
            .setEmbedFooter(interaction);

        await Promise.all([
            save_rpg_data(userid, rpg_data),
            interaction.editReply({ embeds: [embed] }),
        ]);
    },
};
