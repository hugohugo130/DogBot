const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, MessageFlags } = require("discord.js");

const {
    divide,
} = require("./bake.js");
const {
    get_logger,
} = require("../../../utils/logger.js");
const {
    load_rpg_data,
    load_smelt_data,
    save_smelt_data,
    save_rpg_data,
} = require("../../../utils/file.js");
const {
    get_name_of_id,
    get_emojis,
    wrong_job_embed,
    get_loophole_embed,
    get_id_of_name,
    userHaveEnoughItems,
    notEnoughItemEmbed,
    name,
    smelter_slots,
    smeltable_recipe,
} = require("../../../utils/rpg.js");
const {
    embed_error_color,
    embed_default_color,
} = require("../../../utils/config.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");

const logger = get_logger();

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @param {string} item_id
 * @param {number} amount
 * @param {number} mode 1 = interaction.editReply, 2 = interaction.followUp
 * @returns {Promise<any>}
 */
async function smelt_smelt(interaction, item_id, amount, mode = 1) {
    const userId = interaction.user.id;

    const [rpg_data, smelt_data, [emoji_cross, emoji_furnace]] = await Promise.all([
        load_rpg_data(userId),
        load_smelt_data()[userId],
        get_emojis(["crosS", "furnace"], interaction.client)
    ]);

    if (smelt_data && smelt_data.length >= smelter_slots) {
        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`)
            .setEmbedFooter(interaction);

        return await interaction.followUp({ embeds: [embed] });
    };

    const allMats = interaction.options.getBoolean("全部") ?? false;

    // 透過需要的物品id 尋找熔鍊的配方
    const smelt_recipe = smeltable_recipe.find(item => item.input.item === item_id);
    if (!smelt_recipe) {
        logger.warn(`找不到物品id ${item_id} 的熔鍊配方`);
        const embeds = await get_loophole_embed("找不到熔鍊配方", interaction, interaction.client);

        return await interaction.editReply({ embeds });
    };

    if (allMats) {
        amount = Math.floor((rpg_data.inventory[item_id] || amount) / smelt_recipe.input.amount);
    };

    const input_amount = smelt_recipe.input.amount * amount;
    const output_amount = smelt_recipe.amount * amount;
    const duration = 5 * 60 * amount;
    const coal_used = Math.ceil(amount / 2);

    let item_need = [
        {
            item: item_id,
            amount: input_amount,
        },
        {
            item: get_id_of_name("煤炭", "coal"),
            amount: coal_used,
        },
    ];

    let item_missing = [];

    for (const need_item of item_need) {
        const current_item_id = need_item.item;
        const need_amount = need_item.amount;

        const not_enough_item = userHaveEnoughItems(rpg_data, current_item_id, need_amount)
        if (not_enough_item) item_missing.push(not_enough_item);
    };

    if (item_missing.length > 0) {
        const embed = await notEnoughItemEmbed(item_missing, interaction, interaction.client);

        if (mode == 1) await interaction.editReply({ embeds: [embed] });
        else await interaction.followUp({ embeds: [embed] });
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji_furnace} | 熔鍊確認`)
        .setDescription(
            `將要熔鍊 \`${input_amount}\` 組 \`${get_name_of_id(item_id)}\`
花費 \`${coal_used}\` 個煤炭
預估時間：\`${Math.floor(duration / 60)}\` 分鐘`)
        .setEmbedFooter(interaction);

    // 生成一個簡短的識別碼
    const session_id = `${userId}_${Date.now()}`;

    // 將 item_need 資料儲存在全域變數或快取中
    interaction.client.smelter_sessions.set(session_id, item_need);

    const confirm_button = new ButtonBuilder()
        // const [_, userId, item_id, amount, coal_amount, duration, output_amount, session_id] = interaction.customId.split("|");
        .setCustomId(`smelter_smelt|${userId}|${item_id}|${input_amount}|${coal_used}|${duration}|${output_amount}|${session_id}`)
        .setLabel("確認")
        .setStyle(ButtonStyle.Success);

    const cancel_button = new ButtonBuilder()
        .setCustomId(`cancel|${userId}`)
        .setLabel("取消")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder()
        .addComponents(confirm_button, cancel_button);

    const replyOption = { embeds: [embed], components: [row] };

    if (mode == 1) await interaction.editReply(replyOption);
    else await interaction.followUp(replyOption);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("smelt")
        .setDescription("煉金爐相關指令")
        .setNameLocalizations({
            "zh-TW": "煉金爐",
            "zh-CN": "炼金炉",
            "en-US": "smelt",
        })
        .setDescriptionLocalizations({
            "zh-TW": "煉金爐相關指令",
            "zh-CN": "炼金炉相关指令",
            "en-US": "Smelter related commands",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // smelt
            .setName("smelt")
            .setNameLocalizations({
                "zh-TW": "熔鍊",
                "zh-CN": "熔鍊",
            })
            .setDescription("Smelt ores")
            .setDescriptionLocalizations({
                "zh-TW": "熔鍊礦物",
                "zh-CN": "熔炼矿物",
            })
            .addStringOption(option =>
                option.setName("recipe")
                    .setNameLocalizations({
                        "zh-TW": "配方",
                        "zh-CN": "配方",
                    })
                    .setDescription("the recipe to smelt")
                    .setDescriptionLocalizations({
                        "zh-TW": "熔鍊的配方",
                        "zh-CN": "熔炼的配方",
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
                    .setDescription("the amount of ores to smelt")
                    .setDescriptionLocalizations({
                        "zh-TW": "熔鍊數量",
                        "zh-CN": "熔炼数量",
                    })
                    .setMinValue(1)
                    .setRequired(false),
            )
            .addBooleanOption(option =>
                option.setName("all")
                    .setNameLocalizations({
                        "zh-TW": "全部",
                        "zh-CN": "全部",
                    })
                    .setDescription("smelt all selected ores")
                    .setDescriptionLocalizations({
                        "zh-TW": "熔鍊全部選擇的礦物",
                        "zh-CN": "熔炼全部选择的矿物",
                    })
                    .setRequired(false),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-TW": "資訊",
                "zh-CN": "资讯",
                "en-US": "info",
            })
            .setDescription("查看目前煉金爐狀態")
            .setDescriptionLocalizations({
                "zh-TW": "查看目前煉金爐狀態",
                "zh-CN": "查看目前炼金炉状态",
                "en-US": "View current smelter status",
            })
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // get
            .setName("get")
            .setNameLocalizations({
                "zh-TW": "取出",
                "zh-CN": "取出",
                "en-US": "get",
            })
            .setDescription("從煉金爐取出物品")
            .setDescriptionLocalizations({
                "zh-TW": "從煉金爐取出物品",
                "zh-CN": "从炼金炉取出物品",
                "en-US": "Take items out from smelter",
            })
            .addIntegerOption(option =>
                option.setName("編號")
                    .setDescription("要取出的物品編號（1, 2, 3...）")
                    .setRequired(true)
                    .setMinValue(1),
            ),
        ),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     * @returns {Promise<any>}
     */
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

        const rpg_data = await load_rpg_data(userId);
        const [smelt_data_all, [wrongJobEmbed, row], [emoji_cross, emoji_furnace]] = await Promise.all([
            load_smelt_data(),
            wrong_job_embed(rpg_data, "/smelt", userId, interaction, interaction.client),
            get_emojis(["crosS", "furnace"], interaction.client),
        ]);

        if (wrongJobEmbed) return await interaction.editReply({ embeds: [wrongJobEmbed], components: row ? [row] : [] });

        const smelt_data = smelt_data_all[userId];

        switch (subcommand) {
            case "smelt": {
                const smelt_remain_slots = smelter_slots - (smelt_data?.length || 0);

                if (smelt_remain_slots < 1) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                const item_id = interaction.options.getString("recipe");

                if (item_id && !smeltable_recipe.find(e => e.input.item === item_id)) {
                    const error_embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 這不是個礦石`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
                };

                let items = item_id ? [item_id] : [];
                let choosedAmount = Boolean(interaction.options.getInteger("amount"));
                let amounts = [interaction.options.getInteger("amount") ?? 1];
                const allAmount = interaction.options.getBoolean("all") ?? false;
                const auto_amount = interaction.options.getString("auto_dispense_food") ?? false;

                if (!item_id && !choosedAmount && !allAmount && !auto_amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 蛤？ 🤔 你什麼也不選`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (!item_id && amounts[0] && !allAmount && !auto_amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 蛤？ 🤔 你選了數量然後?`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (item_id && auto_amount === "foods") {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 什麼拉🤣 你選了礦物又選了自動選擇礦物 那我要選什麼阿`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (allAmount && auto_amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 什麼拉🤣 你選了全部礦物又選了自動選擇礦物 那我要選什麼阿`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (!item_id && auto_amount === "amount") {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你選了自動選擇數量但沒選礦物 蛤？`)
                        .setEmbedFooter(interaction);

                    return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };

                if (allAmount && !auto_amount) {
                    amounts = [rpg_data.inventory[item_id] || 1];
                } else if (auto_amount) {
                    if (auto_amount === "amount") {
                        amounts = divide(rpg_data.inventory[item_id], smelt_remain_slots);
                    } else { // auto_amount === "foods"
                        const entries = Object.entries(rpg_data.inventory)
                            .filter(([key]) => key in bake) // 過濾掉不可熔鍊的物品
                            .sort(([, valueA], [, valueB]) => valueB - valueA) // 按數量降序排序
                            .slice(0, smelt_remain_slots); // 取前 {smelt_remain_slots} 個物品

                        items = entries.map(([key]) => key);
                        amounts = entries.map(([, value]) => value);
                    };
                };

                const total_need_coal = Math.ceil(amounts.reduce((sum, amount) => sum + amount, 0) / 2);

                const not_enough_items = userHaveEnoughItems(rpg_data, "coal", total_need_coal);
                if (not_enough_items) return await interaction.reply({ embeds: [await notEnoughItemEmbed(not_enough_items, interaction, client)], flags: MessageFlags.Ephemeral });

                for (const [index, item] of items.entries()) {
                    const amount = amounts[index];
                    if (!amount) continue;

                    await smelt_smelt(interaction, item, amount, index === 0 ? 1 : 2);
                };
                break;
            };

            case "info": {
                const used_slots = smelt_data ? smelt_data.length : 0;
                const current_time = Math.floor(Date.now() / 1000);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_furnace} | 你的煉金爐使用狀況`)
                    .setDescription(`使用率 \`[${used_slots} / ${smelter_slots}]\``)
                    .setEmbedFooter(interaction);

                if (!smelt_data || smelt_data.length === 0) {
                    embed.setDescription(`使用率 \`[${used_slots} / ${smelter_slots}]\`\n\n你的煉金爐目前是空的`);
                } else {
                    for (let i = 0; i < Math.min(25, smelt_data.length); i++) {
                        const item = smelt_data[i];
                        const input_name = name[item.item_id] || item.item_id;
                        const output_name = name[item.output_item_id] || item.output_item_id;

                        const total_duration = item.amount * 60;
                        const start_time = item.end_time - total_duration;
                        const elapsed_time = current_time - start_time;
                        const progress = Math.min(100, Math.max(0, (elapsed_time / total_duration) * 100));

                        const time_ago = `<t:${item.end_time}:R>`;

                        embed.addFields({
                            name: `${i + 1}. ${input_name} x${item.amount}`,
                            value: `=> ${output_name}x${item.output_amount} (完成度：${Math.round(progress)}% ${time_ago})`,
                            inline: false
                        });
                    };
                };

                await interaction.editReply({ embeds: [embed] });
                break;
            };

            case "get": {
                if (!smelt_data || smelt_data.length === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的煉金爐是空的`)
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ embeds: [embed] });
                };

                const index = interaction.options.getInteger("編號") - 1;
                if (index < 0 || index >= smelt_data.length) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 錯誤的物品編號`)
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ embeds: [embed] });
                };

                const item = smelt_data[index];
                const current_time = Math.floor(Date.now() / 1000);
                if (current_time < item.end_time) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 熔鍊還沒完成`)
                        .setFooter({ text: `等待至 <t:${item.end_time}:R>` })
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ embeds: [embed] });
                };

                // 將熔鍊完成的物品加入背包
                rpg_data.inventory[item.output_item_id] = (rpg_data.inventory[item.output_item_id] || 0) + item.output_amount;
                // 從煉金爐移除該物品
                smelt_data.splice(index, 1);
                // 儲存資料
                await save_smelt_data(smelt_data_all);
                await save_rpg_data(userId, rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_furnace} | 成功從煉金爐取出了 ${name[item.output_item_id] || item.output_item_id}x${item.output_amount}`)
                    .setEmbedFooter(interaction);

                return await interaction.editReply({ embeds: [embed] });
            };
        };
    },
};
