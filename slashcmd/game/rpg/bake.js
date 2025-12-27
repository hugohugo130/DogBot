const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChatInputCommandInteraction, Collection } = require("discord.js");
const { bake, oven_slots } = require("../../../utils/rpg.js");
const { generateSessionId } = require("../../../utils/random.js");
const EmbedBuilder = require("../../../utils/customs/embedBuilder.js");

function divide(amount, by) {
    // 檢查 amount 和 by 是否為整數（沒有小數點）
    if (!Number.isInteger(amount) || !Number.isInteger(by)) {
        throw new Error("amount 和 by 必須是整數");
    };

    // 檢查 by 是否為 0
    if (by === 0) {
        throw new Error("by 不能為 0");
    };

    // 如果 amount 可以被 by 整除
    if (amount % by === 0) {
        const value = amount / by;
        return Array(by).fill(value);
    };

    // 如果不能整除
    const baseValue = Math.floor(amount / by);
    const remainder = amount % by;

    // 創建結果陣列，先全部填充基礎值
    const result = Array(by).fill(baseValue);

    // 將餘數分配到最後幾個元素（每個加 1）
    for (let i = result.length - 1; i >= result.length - remainder; i--) {
        result[i]++;
    }

    return result;
};

/**
 * 
 * @param {ChatInputCommandInteraction} interaction
 * @param {string} userId
 * @param {string} item_id
 * @param {number} amount
 * @param {number} mode 1 = interaction.editReply, 2 = interaction.followUp
 * @returns {Promise<number>}
 */
async function bake_bake(interaction, userId, item_id, amount, mode = 1) {
    const { load_rpg_data, load_bake_data } = require("../../../utils/file.js");
    const { notEnoughItemEmbed, get_name_of_id, name, oven_slots } = require("../../../utils/rpg.js");
    const { get_emoji } = require("../../../utils/rpg.js");
    const { embed_error_color, embed_default_color } = require("../../../utils/config.js");

    if (![1, 2].includes(mode)) throw new Error("mode must be 1 or 2");

    const emoji_cross = await get_emoji("crosS", interaction.client);
    const emoji_drumstick = await get_emoji("drumstick", interaction.client);

    let rpg_data = load_rpg_data(userId);
    const bake_data = load_bake_data()[userId];

    const oven_remain_slots = oven_slots - (bake_data?.length || 0);

    if (oven_remain_slots <= 0) {
        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | 你的烤箱已經滿了`)
            .setEmbedFooter();

        return await interaction.followUp({ embeds: [embed] });
    };

    const allFoods = interaction.options.getBoolean("all") ?? false;

    // if (allFoods && !auto_amount) amount = rpg_data.inventory[first_food] || 0;
    if (allFoods) amount = rpg_data.inventory[item_id] || 0;

    const duration = 60 * amount;

    const coal_amount = Math.ceil(amount / 2);

    let item_need = [
        {
            item: item_id,
            amount,
        },
        {
            item: "coal",
            amount: coal_amount,
        },
    ];
    let item_missing = [];

    for (const need_item of item_need) {
        const current_item_id = need_item.item;
        const need_amount = need_item.amount;
        const have_amount = (rpg_data.inventory[current_item_id] || 0);

        if (have_amount < need_amount) {
            item_missing.push({
                name: get_name_of_id(current_item_id),
                amount: need_amount - have_amount,
            });
        };
    };

    if (item_missing.length > 0) {
        const embed = await notEnoughItemEmbed(item_missing);

        if (mode === 0) {
            await interaction.editReply({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.followUp({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
        };

        return 1;
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji_drumstick} | 烘烤確認`)
        .setDescription(
            `將要烘烤 \`${amount}\` 個 \`${name[item_id]}\`
花費 \`${coal_amount}\` 個煤炭
預估時間：\`${duration / 60}\` 分鐘`)
        .setEmbedFooter();

    // 生成一個簡短的識別碼來代替完整的 item_need JSON
    const session_id = `${userId}_${generateSessionId(16)}`;

    // 將 item_need 資料儲存在全域變數或快取中
    if (!interaction.client.oven_sessions) interaction.client.oven_sessions = new Collection();

    interaction.client.oven_sessions.set(session_id, {
        item_id,
        amount,
        coal_amount,
        duration,
        item_need,
    });

    const confirm_button = new ButtonBuilder()
        .setCustomId(`oven_bake|${userId}|${session_id}`)
        .setLabel("確認")
        .setStyle(ButtonStyle.Success);

    const cancel_button = new ButtonBuilder()
        .setCustomId(`cancel|${userId}`)
        .setLabel("取消")
        .setStyle(ButtonStyle.Danger);

    const help_buy_coal_button = new ButtonBuilder()
        .setCustomId(`help|${userId}|rpg|buy`)
        .setLabel("購買煤炭？")
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
        .addComponents(confirm_button, cancel_button, help_buy_coal_button);

    const replyOption = { embeds: [embed], components: [row] }

    if (mode == 1) {
        await interaction.editReply(replyOption);
    } else {
        await interaction.followUp(replyOption);
    };

    return 0;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bake")
        .setDescription("烤箱相關指令")
        .setNameLocalizations({
            "zh-TW": "烤箱",
            "zh-CN": "烤箱",
            "en-US": "oven",
        })
        .setDescriptionLocalizations({
            "zh-TW": "烤箱相關指令",
            "zh-CN": "烤箱相关指令",
            "en-US": "Oven related commands",
        })
        .addSubcommand(new SlashCommandSubcommandBuilder() // bake
            .setName("bake")
            .setNameLocalizations({
                "zh-TW": "烘烤",
                "zh-CN": "烘烤",
                "en-US": "bake",
            })
            .setDescription("烘烤食物")
            .setDescriptionLocalizations({
                "zh-TW": "烘烤食物",
                "zh-CN": "烘烤食物",
                "en-US": "bake delicious food",
            })
            .addStringOption(option =>
                option.setName("food")
                    .setNameLocalizations({
                        "zh-TW": "食物",
                        "zh-CN": "食物",
                        "en-US": "food",
                    })
                    .setDescription("Food that needs to be baked.")
                    .setDescriptionLocalizations({
                        "zh-TW": "需要烘烤的食物",
                        "zh-CN": "需要烘烤的食物",
                        "en-US": "Food that needs to be baked.",
                    })
                    .setRequired(false)
                    .setAutocomplete(true),
            )
            .addIntegerOption(option =>
                option.setName("amount")
                    .setNameLocalizations({
                        "zh-TW": "數量",
                        "zh-CN": "数量",
                        "en-US": "amount",
                    })
                    .setDescription("Baking quantity")
                    .setDescriptionLocalizations({
                        "zh-TW": "烘烤數量",
                        "zh-CN": "烘烤数量",
                        "en-US": "Baking quantity",
                    })
                    .setMinValue(1)
                    .setRequired(false),
            )
            .addBooleanOption(option =>
                option.setName("all")
                    .setNameLocalizations({
                        "zh-TW": "全部",
                        "zh-CN": "全部",
                        "en-US": "all",
                    })
                    .setDescription("Bake all selected foods")
                    .setDescriptionLocalizations({
                        "zh-TW": "烘焙全部選擇的食材",
                        "zh-CN": "烘焙全部选择的食材",
                        "en-US": "Bake all selected foods",
                    })
                    .setRequired(false),
            )
            .addStringOption(option => option
                .setName("auto_dispense_food")
                .setNameLocalizations({
                    "zh-TW": "自動分配食物",
                    "zh-CN": "自动分配食物",
                    "en-US": "auto_dispense_food",
                })
                .setDescription("Smartly distribute food or amount of food to the oven")
                .setDescriptionLocalizations({
                    "zh-TW": "智能分配食物或食物的數量到烤箱中",
                    "zh-CN": "智能分配食物或食物的数量到烤箱中",
                    "en-US": "Smartly distribute food or amount of food to the oven",
                })
                .setRequired(false)
                .addChoices(
                    {
                        name: `物品數量`,
                        value: `amount`,
                    },
                    {
                        name: `食物`,
                        value: `foods`,
                    },
                ),
            ),
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // info
            .setName("info")
            .setNameLocalizations({
                "zh-TW": "資訊",
                "zh-CN": "资讯",
                "en-US": "info",
            })
            .setDescription("查看目前烤箱狀態")
            .setDescriptionLocalizations({
                "zh-TW": "查看目前烤箱狀態",
                "zh-CN": "查看目前烤箱状态",
                "en-US": "View current oven status",
            })
        )
        .addSubcommand(new SlashCommandSubcommandBuilder() // get
            .setName("get")
            .setNameLocalizations({
                "zh-TW": "取出",
                "zh-CN": "取出",
                "en-US": "get",
            })
            .setDescription("從烤箱取出食物")
            .setDescriptionLocalizations({
                "zh-TW": "從烤箱取出食物",
                "zh-CN": "从烤箱取出食物",
                "en-US": "Take food out from oven",
            })
            .addIntegerOption(option =>
                option.setName("id")
                    .setNameLocalizations({
                        "zh-TW": "編號",
                        "zh-CN": "编号",
                        "en-US": "id",
                    })
                    .setDescription("The item id to be retrieved (1, 2, 3...)")
                    .setDescriptionLocalizations({
                        "zh-TW": "要取出的物品編號 (1, 2, 3...)",
                        "zh-CN": "要取出的物品编号 (1, 2, 3...)",
                        "en-US": "The item id to be retrieved (1, 2, 3...)",
                    })
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(oven_slots),
            )
            .addBooleanOption(option =>
                option.setName("all")
                    .setNameLocalizations({
                        "zh-TW": "全部",
                        "zh-CN": "全部",
                        "en-US": "all",
                    })
                    .setDescription("Bake all selected foods")
                    .setDescriptionLocalizations({
                        "zh-TW": "烘焙全部選擇的食材",
                        "zh-CN": "烘焙全部选择的食材",
                        "en-US": "Bake all selected foods",
                    })
                    .setRequired(false),
            ),
        ),
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();
        const { load_rpg_data, save_rpg_data, load_bake_data, save_bake_data } = require("../../../utils/file.js");
        const { name, oven_slots, notEnoughItemEmbed, wrong_job_embed } = require("../../../utils/rpg.js");
        const { get_emoji } = require("../../../utils/rpg.js");
        const { embed_error_color, embed_default_color } = require("../../../utils/config.js");

        const bake_data_all = load_bake_data();
        const bake_data = bake_data_all[userId];
        const rpg_data = load_rpg_data(userId);

        const [wrongJobEmbed, row] = await wrong_job_embed(rpg_data, "/bake", userId, interaction.client);
        if (wrongJobEmbed) return await interaction.editReply({ embeds: [wrongJobEmbed], components: row ? [row] : [], flags: MessageFlags.Ephemeral });

        if (subcommand === "bake") {
            const emoji_cross = await get_emoji("crosS", interaction.client);

            const oven_remain_slots = oven_slots - (bake_data?.length || 0);
            const auto_amount = interaction.options.getString("auto_dispense_food") ?? false;

            if (oven_remain_slots < 1) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的烤箱已經滿了`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            const first_food = interaction.options.getString("food");
            let items = first_food ? [first_food] : [];
            let amounts = [interaction.options.getInteger("amount") ?? 1];
            const allFoods = interaction.options.getBoolean("all") ?? false;

            if (!first_food && !allFoods && !auto_amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 蛤？ 🤔 你什麼也不選`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            if (!first_food && amounts[0] && !allFoods && !auto_amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 蛤？ 🤔 你選了數量但沒選食物`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            if (first_food && auto_amount === "foods") {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 什麼拉🤣 你選了食物又選了自動選擇食物 那我要選什麼阿`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            if (allFoods && auto_amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 什麼拉🤣 你選了全部食物又選了自動選擇食物 那我要選什麼阿`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            if (!first_food && auto_amount === "amount") {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你選了自動選擇數量但沒選食物 蛤？`)
                    .setEmbedFooter();

                return await interaction.followUp({ embeds: [embed] });
            };

            if (allFoods && !auto_amount) {
                amounts = [rpg_data.inventory[first_food] || 1];
            } else if (auto_amount) {
                if (auto_amount === "amount") {
                    amounts = divide(rpg_data.inventory[first_food], oven_remain_slots);
                } else { // auto_amount === "foods"
                    const entries = Object.entries(rpg_data.inventory)
                        .filter(([key]) => key in bake) // 過濾掉不可烘烤的物品
                        .sort(([, valueA], [, valueB]) => valueB - valueA) // 按數量降序排序
                        .slice(0, oven_remain_slots); // 取前 {oven_remain_slots} 個物品

                    items = entries.map(([key]) => key);
                    amounts = entries.map(([, value]) => value);
                };
            };

            const total_need_coal = Math.ceil(amounts.reduce((sum, amount) => sum + amount, 0) / 2);
            const coal_amount = rpg_data.inventory["coal"] || 0;

            if (coal_amount < total_need_coal) {
                const item_list = [{
                    name: "coal",
                    amount: total_need_coal - coal_amount,
                }];

                return await interaction.followUp({ embeds: [await notEnoughItemEmbed(item_list)] });
            };

            for (const [index, item] of items.entries()) {
                const amount = amounts[index];
                if (!amount) continue;

                await bake_bake(interaction, userId, item, amount, index === 0 ? 1 : 2);
            };
        } else if (subcommand === "info") {
            const emoji_drumstick = await get_emoji("drumstick", interaction.client);

            const used_slots = bake_data ? bake_data.length : 0;
            const current_time = Math.floor(Date.now() / 1000);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_drumstick} | 你的烤箱使用狀況`)
                .setDescription(`使用率 \`[${used_slots} / ${oven_slots}]\``)
                .setEmbedFooter();

            if (!bake_data || bake_data.length === 0) {
                embed.setDescription(`使用率 \`[${used_slots} / ${oven_slots}]\`\n\n你的烤箱目前是空的`);
            } else {
                for (let i = 0; i < bake_data.length; i++) {
                    const item = bake_data[i];
                    const input_name = name[item.item_id] || item.item_id;
                    const output_name = name[item.output_item_id] || item.output_item_id;

                    const total_duration = item.amount * 60;
                    const start_time = item.end_time - total_duration;
                    const elapsed_time = current_time - start_time;
                    const progress = Math.min(100, Math.max(0, (elapsed_time / total_duration) * 100));

                    const time_ago = `<t:${item.end_time}:R>`;

                    embed.addFields({
                        name: `${i + 1}. ${input_name} x${item.amount}`,
                        value: `=> ${output_name}x${item.amount} (完成度：${Math.round(progress)}% ${time_ago})`,
                        inline: false
                    });
                };
            };

            await interaction.editReply({ embeds: [embed] });
        } else if (subcommand === "get") {
            const emoji_cross = await get_emoji("crosS", interaction.client);
            const emoji_drumstick = await get_emoji("drumstick", interaction.client);

            if (!bake_data || bake_data.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的烤箱是空的`)
                    .setEmbedFooter();

                return await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            };

            const loop_times = interaction.options.getBoolean("all") ? bake_data.length : 1;
            const embeds = [];

            for (let i = 0; i < loop_times; i++) {
                const index = (interaction.options.getInteger("id") ?? 1) - 1;

                if (index < 0 || index >= bake_data.length) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 錯誤的物品編號`)
                        .setEmbedFooter();

                    embeds.push(embed);
                };

                const item = bake_data[index];
                const current_time = Math.floor(Date.now() / 1000);
                if (current_time < item.end_time) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 烘烤還沒完成`)
                        .setEmbedFooter();

                    embeds.push(embed);
                };

                // 將烘烤完成的物品加入背包
                rpg_data.inventory[item.output_item_id] = (rpg_data.inventory[item.output_item_id] || 0) + item.amount;

                // 從烤箱移除該物品
                bake_data.splice(index, 1);

                // 儲存資料
                save_bake_data(bake_data_all);
                save_rpg_data(userId, rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_drumstick} | 成功從烤箱取出了 ${name[item.output_item_id] || item.output_item_id}x${item.amount}`)
                    .setEmbedFooter();

                embeds.push(embed);

            };

            return interaction.editReply({ embeds });
        };
    },
    divide,
};
