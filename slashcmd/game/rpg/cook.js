const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChatInputCommandInteraction, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require("discord.js");

const { notEnoughItemEmbed, wrong_job_embed, userHaveNotEnoughItems, get_name_of_id, get_emojis, get_emoji, cook, food_data } = require("../../../utils/rpg.js");
const { load_rpg_data, save_rpg_data } = require("../../../utils/file.js");
const { generateSessionId } = require("../../../utils/random.js");
const { container_default_color, embed_error_color, cookClickAmount } = require("../../../utils/config.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");
const DogClient = require("../../../utils/customs/client.js");
const { wait_for_client } = require("../../../utils/wait_until_ready.js");

/**
 * Get Cooking Container
 * @param {{ item: string, amount: number }[]} inputed_foods - inputed foods data
 * @param {{ item: string, amount: number }[]} item_needed - item needed data
 * @param {string} userId - User ID
 * @param {string} sessionId - Cooking session ID
 * @param {number} [progress=0] progress
 * @param {DogClient | null} [client] - Discord Client
 * @returns {Promise<ContainerBuilder>}
 */
async function getCookingContainer(inputed_foods, item_needed, userId, sessionId, progress = 0, client = global._client) {
    if (!client) client = await wait_for_client();

    const [emoji_cooking, emoji_drumstick] = await get_emojis(["cooking", "drumstick"], client);

    const item_input_string = inputed_foods
        .map(item => `${item.amount} 個 ${get_name_of_id(item.item)}`)
        .join("、") // 使用、作為分隔符
        .replace(/、 ([^、]*)$/, " 和 $1"); // 將最後一個、替換為 和

    const gbmi_session_id = generateSessionId(100 - 5 - `gbmi|${userId}|`.length);
    client.gbmi_sessions.set(gbmi_session_id, {
        userId,
        item_needed,
    });

    const cookButton = new ButtonBuilder()
        .setCustomId(`cook|${userId}|${sessionId}`)
        .setEmoji(emoji_cooking)
        .setLabel("炒菜")
        .setStyle(ButtonStyle.Primary);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`gbmi|${userId}|${gbmi_session_id}`)
        .setLabel("取消")
        .setStyle(ButtonStyle.Danger);

    const ButtonRow =
        /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
            .addComponents(cookButton, cancelButton));

    const container = new ContainerBuilder()
        .setAccentColor(container_default_color)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**${emoji_drumstick} | 成功放進平底鍋炒 ${item_input_string}**`),
            new TextDisplayBuilder().setContent(`快透過狂按按鈕來炒菜吧！${progress ? `進度: ${progress} / ${cookClickAmount}` : ""}`),
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
        .addActionRowComponents(ButtonRow);

    return container;
};

/**
 * Get Cooking Result Container
 * @param {string} output_food - Output food ID
 * @param {number} amount - Amount produced
 * @param {DogClient | null} [client] - Discord Client
 * @returns {Promise<ContainerBuilder>}
 */
async function getCookingResultContainer(output_food, amount, client = global._client) {
    const [emoji_check, emoji_drumstick, emoji_food] = await get_emojis(["check", "drumstick", "food"], client);

    const food_name = get_name_of_id(output_food);

    // 创建显示内容
    const fill_hunger = food_data[output_food];

    const container = new ContainerBuilder()
        .setAccentColor(container_default_color)
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`${emoji_check} **| 烹飪成功！**`),
            new TextDisplayBuilder()
                .setContent(`${emoji_food} **獲得物品:** \`${amount}\` 個 ${food_name} (回復 \`${fill_hunger}\` ${emoji_drumstick})`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Small)
        );

    return container;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cook")
        .setNameLocalizations({
            "zh-TW": "烹飪",
            "zh-CN": "烹饪",
        })
        .setDescription("Cook delicious food :D")
        .setDescriptionLocalizations({
            "zh-TW": "烹飪美味的食物",
            "zh-CN": "烹饪美味的食物",
        })
        .addStringOption(option => // food
            option.setName("food")
                .setNameLocalizations({
                    "zh-TW": "食物",
                    "zh-CN": "食物",
                    "en-US": "food",
                })
                .setDescription("Food that needs to be cooked.")
                .setDescriptionLocalizations({
                    "zh-TW": "需要烹飪的食物",
                    "zh-CN": "需要烹饪的食物",
                })
                .setRequired(true)
                .setAutocomplete(true),
        )
        .addIntegerOption(option => // amount
            option.setName("amount")
                .setNameLocalizations({
                    "zh-TW": "數量",
                    "zh-CN": "数量",
                })
                .setDescription("Cooking quantity")
                .setDescriptionLocalizations({
                    "zh-TW": "烹飪數量",
                    "zh-CN": "烹饪数量",
                })
                .setMinValue(1)
                .setRequired(false),
        )
        .addBooleanOption(option => // all
            option.setName("all")
                .setNameLocalizations({
                    "zh-TW": "全部",
                    "zh-CN": "全部",
                })
                .setDescription("Cook all selected foods")
                .setDescriptionLocalizations({
                    "zh-TW": "烹飪全部選擇的食材",
                    "zh-CN": "烹饪全部选择的食材",
                })
                .setRequired(false),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     * @returns {Promise<any>}
     */
    async execute(interaction, client) {
        const userId = interaction.user.id;

        const rpg_data = await load_rpg_data(userId);
        const [emoji_cross, [wrongJobEmbed, row]] = await Promise.all([
            get_emoji("crosS", client),
            wrong_job_embed(rpg_data, "/cook", userId, interaction, client),
        ]);

        if (wrongJobEmbed) return await interaction.reply({ embeds: [wrongJobEmbed], components: row ? [row] : [], flags: MessageFlags.Ephemeral });

        const output_food = interaction.options.getString("food");
        let amount = interaction.options.getInteger("amount") ?? 1;
        const allFoods = interaction.options.getBoolean("all") ?? false;

        const recipe = cook.find(e => e.output === output_food);

        if (!recipe) {
            const error_embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 找不到這個烹飪配方`)
                .setEmbedFooter(interaction);

            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
        };

        const input_foods = recipe.input;

        if (allFoods) {
            // 透過玩家的背包，計算可以製作多少份
            const max_amount = Math.min(...input_foods.map(e => Math.floor((rpg_data.inventory[e.name] ?? 0) / e.amount)));

            if (max_amount) amount = max_amount;
        };

        const need_coal = Math.ceil(amount / 2);
        const inputed_foods = input_foods.map(item => ({
            item: item.name,
            amount: item.amount * amount,
        }));

        const item_needed = [
            ...inputed_foods,
            {
                item: "coal",
                amount: need_coal,
            },
        ];

        const not_enough_items = item_needed
            .map(item => userHaveNotEnoughItems(rpg_data, item.item, item.amount))
            .filter(e => e !== null);

        if (not_enough_items.length) return await interaction.reply({ embeds: [await notEnoughItemEmbed(not_enough_items, interaction, client)], flags: MessageFlags.Ephemeral });

        for (const item of item_needed) {
            if (!rpg_data.inventory[item.item]) rpg_data.inventory[item.item] = 0;
            rpg_data.inventory[item.item] -= item.amount;
        };

        const buttonCustomIdLengthLimit = 100;
        const reservedLength = 5;
        const sessionId = generateSessionId(buttonCustomIdLengthLimit - `cook|${userId}|`.length - reservedLength);

        const [container, _, __] = await Promise.all([
            getCookingContainer(inputed_foods, item_needed, userId, sessionId, 0, client),
            save_rpg_data(userId, rpg_data),
            interaction.deferReply(),
        ]);

        client.cook_sessions.set(sessionId, {
            userId,
            recipe,
            inputed_foods,
            item_needed,
            amount,
            cooked: 0,
            last_cook_time: Date.now(),
        });

        await interaction.editReply({
            content: null,
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
    getCookingContainer,
    getCookingResultContainer,
};
