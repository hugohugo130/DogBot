const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, User, BaseInteraction, ChatInputCommandInteraction, MessageFlags } = require("discord.js");

const { get_name_of_id, get_id_of_name, get_emojis, is_cooldown_finished, userHaveNotEnoughItems, wrong_job_embed, farm_slots } = require("../../../utils/rpg.js");
const { load_rpg_data, save_rpg_data, load_farm_data, save_farm_data } = require("../../../utils/file.js");
const { convertToSecondTimestamp, DateNow, DateNowSecond } = require("../../../utils/timestamp.js");
const { randint } = require("../../../utils/random.js");
const { embed_default_color, embed_error_color, rpg_lvlUp_per, probabilities } = require("../../../utils/config.js");
const DogClient = require("../../../utils/customs/client.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");

/**
 * @typedef FarmData
 * @property {number} amount
 * @property {string} hoe - Item ID of the hoe
 * @property {number} start
 * @property {number} endsAt
 */

/**
 *
 * @param {User} user
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<[EmbedBuilder, ActionRowBuilder<ButtonBuilder>]>}
 */
async function get_farm_info_embed(user, interaction = null, client = global._client) {
    const [farm_data, [emoji_farmer, emoji_hoe, emoji_update]] = await Promise.all([
        load_farm_data(user.id),
        get_emojis(["farmer", "hoe", "update"], client),
    ]);

    let waterAt = farm_data.waterAt;

    // 判斷water at是秒還是毫秒，毫秒轉換成秒
    waterAt = convertToSecondTimestamp(waterAt);

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji_farmer} | ${user.username} 的農田`)
        .setDescription(`農田等級：${farm_data.lvl} | 上次澆水：${waterAt > 0 ? `<t:${waterAt}:R>` : "無"}`)
        .setEmbedFooter(interaction);

    for (const data of (farm_data.farms || [])) {
        const index = farm_data.farms.indexOf(data);
        const amount = data.amount;
        const hoe = data.hoe;
        const start = data.start;
        const endsAt = data.endsAt;

        const elapsed_time = DateNowSecond() - start;
        const total_duration = endsAt - start;
        const progress = Math.min(100, Math.max(0, (elapsed_time / total_duration) * 100))

        embed.addFields({
            name: `${index + 1}. ${get_name_of_id(hoe)}x${amount}`,
            value: `${emoji_hoe} 完成度: ${Math.round(progress)}% (<t:${endsAt}:R>)`
        });
    };

    const updateButton = new ButtonBuilder()
        .setCustomId(`refresh|${user.id}|/farm info`)
        .setEmoji(emoji_update)
        .setLabel("更新")
        .setStyle(ButtonStyle.Primary);

    const row =
        /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
            .addComponents(updateButton));

    return [embed, row];
};

/**
 * 獲取農作物採收物品
 * @param {number} amount - 需要獲得的物品總數
 * @returns {Object} - 物品ID到數量的映射字典
 * @throws {Error} - 如果amount不是正整數 或 amount不是整數
 */
function get_harvest_items(amount) {
    const farm_probability = probabilities.farm;

    // 驗證 amount 參數
    if (typeof amount !== 'number' || amount <= 0) {
        throw new Error('amount must be a positive number');
    };

    // 驗證 amount 是整數
    if (!Number.isInteger(amount)) {
        throw new Error('amount must be an integer');
    };

    /** @type {{ [k: string]: number }} */
    const result = {};

    // 預先計算加權選擇的數據
    const items = Object.keys(farm_probability);
    const weights = items.map(item => farm_probability[item][0]);

    // 計算總權重
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // 如果所有物品權重都是0或沒有物品，直接返回空結果
    if (totalWeight <= 0 || items.length === 0) {
        return {};
    };

    // 進行 amount 次抽取
    for (let i = 0; i < amount; i++) {
        // 加權隨機選擇
        let randomValue = Math.random() * totalWeight;
        let weightSum = 0;

        // 根據權重選擇物品
        for (let j = 0; j < items.length; j++) {
            weightSum += weights[j];

            if (randomValue < weightSum) {
                const selectedItem = items[j];

                // 獲取該物品的數量範圍
                const [_, minAmount, maxAmount] = farm_probability[selectedItem];

                // 產生隨機數量
                const quantity = randint(minAmount, maxAmount);

                // 累加到結果中
                result[selectedItem] = (result[selectedItem] || 0) + quantity;
                break;
            };
        };
    };

    return result;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("farm")
        .setDescription("farm related commands")
        .setNameLocalizations({
            "zh-TW": "種田",
            "zh-CN": "種田",
            "en-US": "farm",
        })
        .setDescriptionLocalizations({
            "zh-TW": "農田相關指令",
            "zh-CN": "农田相关指令",
            "en-US": "farm related commands",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // plant
            .setName("plant")
            .setNameLocalizations({
                "zh-TW": "種植",
                "zh-CN": "种植",
                "en-US": "plant",
            })
            .setDescription("Use a hoe to plant crops")
            .setDescriptionLocalizations({
                "zh-TW": "使用鋤頭種植農作物",
                "zh-CN": "使用锄头种植农作物",
                "en-US": "Use a hoe to plant crops",
            })
            .addStringOption(option =>
                option.setName("hoe")
                    .setNameLocalizations({
                        "zh-TW": "鋤頭",
                        "zh-CN": "锄头",
                        "en-US": "hoe",
                    })
                    .setDescription("The hoe to be used")
                    .setDescriptionLocalizations({
                        "zh-TW": "要使用的锄头",
                        "zh-CN": "要使用的鋤頭",
                        "en-US": "The hoe to be used",
                    })
                    .setRequired(true)
                    .addChoices([
                        { name: "木鋤", value: get_id_of_name("木鋤", "wooden_hoe") },
                        { name: "鐵鋤", value: get_id_of_name("鐵鋤", "iron_hoe") },
                    ]),
            )
            .addIntegerOption(option =>
                option.setName("amount")
                    .setNameLocalizations({
                        "zh-TW": "數量",
                        "zh-CN": "数量",
                    })
                    .setDescription("The amount of hoe to be used")
                    .setDescriptionLocalizations({
                        "zh-TW": "要使用的鋤頭數量",
                        "zh-CN": "要使用的锄头数量",
                    })
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(farm_slots),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-TW": "資訊",
                "zh-CN": "資訊",
                "en-US": "info",
            })
            .setDescription("View current farming status")
            .setDescriptionLocalizations({
                "zh-TW": "檢視目前農田狀態",
                "zh-CN": "查看目前农田状态",
                "en-US": "View current farming status",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // get
            .setName("get")
            .setNameLocalizations({
                "zh-TW": "採收",
                "zh-CN": "采集",
                "en-US": "get",
            })
            .setDescription("Harvest crops")
            .setDescriptionLocalizations({
                "zh-TW": "採收農作物",
                "zh-CN": "采集农作物",
                "en-US": "Harvest crops",
            }),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // water
            .setName("water")
            .setNameLocalizations({
                "zh-TW": "澆水",
                "zh-CN": "浇水",
                "en-US": "water",
            })
            .setDescription("Water the farmland")
            .setDescriptionLocalizations({
                "zh-TW": "幫農田澆水",
                "zh-CN": "帮农田浇水",
                "en-US": "Water the farmland",
            })
        ),

    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @param {DogClient} client
     * @returns {Promise<any>}
     */
    async execute(interaction, client) {
        const user = interaction.user;
        const userId = user.id;
        const subcommand = interaction.options.getSubcommand();

        const cooldown_key = `farm_water`;

        const rpg_data = await load_rpg_data(userId);
        const [farm_data, [wrongJobEmbed, row]] = await Promise.all([
            load_farm_data(userId),
            wrong_job_embed(rpg_data, "/farm", userId, interaction, client),
        ]);

        if (wrongJobEmbed) return await interaction.reply({ embeds: [wrongJobEmbed], components: row ? [row] : [], flags: MessageFlags.Ephemeral });

        const [
            emoji_farmer,
            emoji_cross,
            emoji_check,
        ] = await get_emojis([
            "farmer",
            "crosS",
            "check",
        ], client);

        switch (subcommand) {
            case "plant": {
                const amount = interaction.options.getInteger("amount") ?? 1;
                const hoe = interaction.options.getString("hoe", true);

                const iron_hoe = hoe === get_id_of_name("鐵鋤", "iron_hoe");
                const need_hunger = iron_hoe ? 5 * amount : 0;
                const insert_amount = amount;
                const hoe_amount = iron_hoe ? 10 : 4;

                const duration_deduction = farm_data.lvl * 10;
                const duration = 20 * 60 - duration_deduction;
                const least_duration = 2 * 60
                const endsAt = DateNowSecond() + Math.max(least_duration, duration);

                if ((farm_data.farms.length + insert_amount) > farm_slots) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 最多只能同時使用四把鋤頭`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (rpg_data.hunger < need_hunger) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的體力不足了`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (userHaveNotEnoughItems(rpg_data, hoe, amount)) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有足夠的鋤頭`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                await interaction.deferReply();

                if (!farm_data.farms) farm_data.farms = [];

                // loop {insert_amount} times
                for (let i = 0; i < insert_amount; i++) {
                    const farm = {
                        amount: hoe_amount,
                        hoe,
                        start: DateNowSecond(),
                        endsAt,
                    };

                    farm_data.farms.push(farm);
                };

                if (need_hunger) rpg_data.hunger -= need_hunger;

                if (!rpg_data.inventory[hoe]) rpg_data.inventory[hoe] = 0;
                rpg_data.inventory[hoe] -= amount;

                await Promise.all([
                    save_rpg_data(userId, rpg_data),
                    save_farm_data(userId, farm_data),
                ]);

                const success_embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_check} | 成功使用了 ${amount} 個鐵鋤`)
                    .setDescription(`消耗 ${need_hunger} 點體力`)
                    .setEmbedFooter(interaction, { text: "", rpg_data });

                return await interaction.editReply({ embeds: [success_embed] });
            };

            case "info": {
                await interaction.deferReply();
                const [embed, row] = await get_farm_info_embed(user, interaction, client);

                return await interaction.editReply({ embeds: [embed], components: [row] });
            };

            case "get": {
                if (farm_data.farms.length === 0) {
                    if (farm_data.waterAt) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你還沒有農田`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你的農田沒有正在種植的田地`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    };
                };

                const completed_farms = farm_data.farms.filter(farm => DateNowSecond() >= farm.endsAt);
                if (completed_farms.length === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的農田沒有正在種植的田地`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                await interaction.deferReply();

                const farmlands = completed_farms.map(farm => {
                    return farm.amount;
                }).reduce((pre, cur) => pre + cur, 0);

                const items = get_harvest_items(farmlands);
                const items_str = Object.entries(items).map(([item, amount]) => `${amount} 個${get_name_of_id(item)}`).join("、");
                for (const [item, amount] of Object.entries(items)) {
                    if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
                    rpg_data.inventory[item] += amount;
                };

                farm_data.farms = farm_data.farms.filter(farm => !completed_farms.includes(farm));

                await save_rpg_data(userId, rpg_data);
                await save_farm_data(userId, farm_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_farmer} | 成功採收了 ${farmlands} 格田地`)
                    .setDescription(`你獲得了 ${items_str}`)
                    .setEmbedFooter(interaction);

                return await interaction.editReply({ embeds: [embed] });
            };

            case "water": {
                const { is_finished, endsAts } = is_cooldown_finished(cooldown_key, rpg_data);

                if (!is_finished) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你已經澆過水了`)
                        .setDescription(`請在 <t:${endsAts}:R> 再繼續澆水`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (!farm_data.waterAt && farm_data.farms.length === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的農田還沒有任何作物`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                await interaction.deferReply();

                const get_exp = randint(50, 74);
                farm_data.exp += get_exp;
                if (farm_data.exp >= rpg_lvlUp_per) {
                    const lvlUp = Math.floor(farm_data.exp / rpg_lvlUp_per);
                    farm_data.lvl += lvlUp;
                    farm_data.exp -= rpg_lvlUp_per * lvlUp;
                };

                rpg_data.lastRunTimestamp[cooldown_key] = DateNow();
                farm_data.waterAt = DateNowSecond();

                await save_rpg_data(userId, rpg_data);
                await save_farm_data(userId, farm_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_farmer} | 成功幫你的農田澆水`)
                    .setDescription(`你獲得了 \`${get_exp}\` 點經驗值`)
                    .setEmbedFooter(interaction);

                return await interaction.editReply({ embeds: [embed] });
                break;
            };
        };
    },
    get_farm_info_embed,
};
