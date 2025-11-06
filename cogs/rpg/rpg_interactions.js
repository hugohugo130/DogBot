const { Events, EmbedBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ActionRow, User, Client } = require("discord.js");
const { prefix, embed_default_color, embed_error_color } = require("../../utils/config.js");
const { get_logger } = require("../../utils/logger.js");

function show_transactions(userid) {
    const { load_rpg_data } = require("../../utils/file.js");
    const { transactions = [] } = load_rpg_data(userid);

    /* transactions 列表中的每個字典應該包含:
    timestamp: 時間戳記 (Unix timestamp) 單位: 秒
    detail: 交易詳情 (字串)
    amount: 金額 (數字)
    type: 交易類型 (字串，例如: "出售物品所得"、"購買物品付款" 等)
    */
    return transactions
        .slice(-10)
        .map(({ timestamp, originalUser, targetUser, amount, type }) =>
            `- <t:${timestamp}:R> ${originalUser} \`>\` ${targetUser} \`${amount.toLocaleString()}$\` (${type})`
        ).join('\n');
};

function get_transaction_embed(interaction) {
    const userid = interaction.user.id;
    const username = interaction.user.username;
    const transactions = show_transactions(userid);
    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setAuthor({
            name: `${username} 的交易紀錄`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setDescription(transactions || "- 沒有交易紀錄")
        .setTimestamp();
    return embed;
};

async function get_failed_embed(client = global._client) {
    const { setEmbedFooter, get_emoji } = require("./msg_handler.js");
    const emoji = await get_emoji(client, "crosS");
    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji} | 沒事戳這顆按鈕幹嘛?`);
    return setEmbedFooter(client, embed);
};

const help = {
    name: {
        general: "一般",
        music: "音樂",
        rpg: "RPG遊戲",
        special: "特殊",
        dev: "開發者使用",
    },
    group: {
        general: {
            "brew|藥劑師研發藥水使用": {
                usage: [],
                format: `${prefix}brew`,
            },
        },
        music: {},
        rpg: {},
        special: {},
        dev: {},
    },
};

/**
 * 
 * @param {string} category 
 * @param {User} user 
 * @param {Client} client 
 * @returns {[EmbedBuilder, ActionRowBuilder]}
 */
function get_help_embed(category, user, client = global._client) {
    const { setEmbedFooter, setEmbedAuthor } = require("./msg_handler.js");

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`help#group|${user.id}`)
        .setPlaceholder(`指令教學`)
        .addOptions(...entries.flatMap(([name, _]) => {
            const info = name.split("|");
            return [{
                label: info[0],
                description: info[1],
                value: info[0],
            }];
        }));

    const row = new ActionRowBuilder()
        .addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(help.name[category]);

    setEmbedAuthor(client, embed);

    return [setEmbedFooter(client, embed), row];
};

/**
 * 
 * @param {string} command_name 
 * @param {Client} client 
 * @returns {EmbedBuilder}
 */
function get_help_command(command_name, client = global._client) {
    const { setEmbedFooter, setEmbedAuthor, find_redirect_targets_from_id } = require("./msg_handler.js");

    const command_data = help.group[command_name];
    if (!command_data) return new EmbedBuilder().setTitle("指令不存在");

    /*
    Field name: 使用方法
    Field value:
    如果 data.usage?.length > 0
        for (const info of data.usage) {
            value += `${i+1}. ${info.name}\n\`\`\`${info.value}\`\`\`\n`;
        };
    否則
        value = `${client.author}很懶 他沒有留下任何使用方法owo`;
    value.trim()
    */
    const usage = command_data.usage?.length > 0
        ? command_data.usage.map((info, i) => `${i + 1}. ${info.name}\n\`\`\`${info.value}\`\`\``).join("\n")
        : `${client.author}很懶 他沒有留下任何使用方法owo`;

    /*
    Field name: 格式
    Field value:
    `<>`是一定要填的參數 `[]`是選填的參數
    ```
    ${format}
    ```
    */
    const format = command_data.format ?? `${client.author}很懶 他沒有留下任何格式owo`;

    const alias = find_redirect_targets_from_id(command_name).map(name => `\`${name}\``).join("、");

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(command_data.name)
        .setDescription(command_data.description)
        .addFields(
            { name: "使用方式", value: usage },
            { name: "格式", value: `\`<>\`是一定要填的參數 \`[]\`是選填的參數\n\`\`\`${format}\`\`\`` },
            { name: "別名", value: alias }
        );

    setEmbedAuthor(client, embed);

    return setEmbedFooter(client, embed);
};

module.exports = {
    name: Events.InteractionCreate,
    execute: async function (client, interaction) {
        const { get_emoji } = require("./msg_handler.js");
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
        if (interaction.customId.startsWith("vote_")) return;
        const logger = get_logger();

        const message = interaction.message;
        const user = interaction.user;

        if (message.author.id !== client.user.id) return;

        // 從 customId 提取 UserID
        const customIdParts = interaction.customId.split('|');
        const originalUserId = customIdParts[1];

        // 驗證使用者身份
        if (user.id !== originalUserId) {
            try {
                await interaction.followUp({ embeds: [await get_failed_embed(client)], flags: MessageFlags.Ephemeral });
            } catch (error) { };
            return;
        };

        logger.info(`${user.username}${user.globalName ? `(${user.globalName})` : ""} 正在觸發互動(rpg_interactions): ${interaction.customId}，訊息ID: ${interaction.message?.id}`);

        if (interaction.customId.startsWith('rpg_transaction')) {
            await interaction.deferUpdate();
            const embed = get_transaction_embed(interaction);
            await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (interaction.customId.startsWith('help') || interaction.customId.startsWith('help#group')) {
            const iscommandhelp = interaction.customId.startsWith('help#group');

            await interaction.deferUpdate();

            const category = interaction.values[0];
            let embed;
            let row;

            if (iscommandhelp) {
                embed = get_help_command(client, interaction, category);
            } else {
                [embed, row] = get_help_embed(category, user, client);
            };

            await interaction.followUp({
                embeds: embed ? [embed] : [],
                components: row ? [row] : [],
                flags: MessageFlags.Ephemeral,
            });
        } else if (interaction.customId.startsWith('pay')) {
            await interaction.deferUpdate();
            const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            const { get_emoji, setEmbedFooter, add_money, remove_money } = require("./msg_handler.js");

            const emoji_cross = await get_emoji(interaction.client, "crosS");
            if (interaction.customId.startsWith('pay_confirm')) {
                const emoji_top = await get_emoji(interaction.client, "top");
                const [_, userId, targetUserId, amount, timestamp] = interaction.customId.split('|');
                const rpg_data = load_rpg_data(userId);
                const target_user_rpg_data = load_rpg_data(targetUserId);

                if (Date.now() - parseInt(timestamp) > 30000) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_cross} | 付款失敗`)
                        .setDescription(`付款確認已過期`);

                    await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
                    return;
                };

                rpg_data.money = remove_money({
                    rpg_data,
                    amount: parseInt(amount),
                    originalUser: `<@${userId}>`,
                    targetUser: `<@${targetUserId}>`,
                    type: `付款給`,
                });
                target_user_rpg_data.money = add_money({
                    rpg_data: target_user_rpg_data,
                    amount: parseInt(amount),
                    originalUser: `<@${userId}>`,
                    targetUser: `<@${targetUserId}>`,
                    type: `付款給`,
                });
                save_rpg_data(userId, rpg_data);
                save_rpg_data(targetUserId, target_user_rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_top} | 付款成功`)
                    .setDescription(`你已成功付款 \`${parseInt(amount).toLocaleString()}$\` 給 <@${targetUserId}>`);

                await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            } else if (interaction.customId.startsWith('pay_cancel')) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 操作取消`);

                await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            };
        } else if (interaction.customId.startsWith('setLang')) {
            // const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            // const { get_emoji, setEmbedFooter } = require("./msg_handler.js");

            // await interaction.deferUpdate();
            // const emoji_tick = get_emoji(interaction.client, "Tick");
            // const emoji_cross = get_emoji(interaction.client, "crosS");
            // const embed = new EmbedBuilder()
            //     .setColor(embed_default_color)
            //     .setTitle(`${emoji_tick} | 語言設定成功`)
            //     .setDescription(`你已成功設定語言為 ${client.available_languages[language]}`);

            // const language = customIdParts[2];
            // const rpg_data = load_rpg_data(interaction.user.id);
            // if (rpg_data.language != language) {
            //     rpg_data.language = language;
            //     save_rpg_data(interaction.user.id, rpg_data);
            // } else {
            //     embed.setColor(embed_error_color);
            //     embed.setTitle(`${emoji_cross} | 語言一樣`);
            //     embed.setDescription(`你選擇的語言和現在的語言一樣 :|`);
            // };

            // await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        } else if (interaction.customId.startsWith('rpg_privacy_menu')) {
            await interaction.deferUpdate();
            const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            const { get_emoji, setEmbedFooter } = require("./msg_handler.js");

            const [_, userId] = interaction.customId.split('|');

            const rpg_data = load_rpg_data(userId);

            const [emoji_shield, emoji_backpack, emoji_partner] = await Promise.all(
                ["shield", "bag", "partner"].map(async (name) => {
                    return await get_emoji(interaction.client, name);
                }),
            );

            const privacy = interaction.values;
            rpg_data.privacy = privacy;
            rpg_data.privacy.sort((a, b) => {
                const order = { "money": 0, "backpack": 1, "partner": 2 };
                return order[a] - order[b];
            });
            save_rpg_data(userId, rpg_data);

            let text = "無";
            if (rpg_data.privacy.length > 0) {
                text = rpg_data.privacy.join('、');
                text = text.replace("money", "金錢").replace("backpack", "背包").replace("partner", "夥伴");
            };

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_shield} | 隱私權設定`)
                .setDescription(`
為保護每個人的隱私，可以透過下拉選單來設定 **允許被公開的** 資訊

目前的設定為：\`${text}\``);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`rpg_privacy_menu|${userId}`)
                .setPlaceholder('選擇要允許的項目')
                .setMinValues(0)
                .setMaxValues(3)
                .addOptions([
                    {
                        label: '金錢',
                        description: '擁有的金錢數量、交易記錄',
                        value: 'money',
                        emoji: '💰',
                        default: rpg_data.privacy.includes("money"),
                    },
                    {
                        label: '背包',
                        description: '背包內的物品',
                        value: 'backpack',
                        emoji: emoji_backpack,
                        default: rpg_data.privacy.includes("backpack"),
                    },
                    {
                        label: '夥伴',
                        description: '夥伴的清單',
                        value: 'partner',
                        emoji: emoji_partner,
                        default: rpg_data.privacy.includes("partner"),
                    }
                ]);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
        } else if (interaction.customId.startsWith('choose_command')) {
            await interaction.deferUpdate();
            const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            const { get_emoji, setEmbedFooter, rpg_handler, MockMessage } = require("./msg_handler.js");

            const [_, __, command] = interaction.customId.split('|');

            const message = new MockMessage(`${prefix}${command}`, interaction.channel, interaction.user, interaction.guild);
            let response = await rpg_handler({ client: interaction.client, message, d: true, mode: 1 });

            response.components ??= [];

            await interaction.editReply(response);
        } else if (interaction.customId.startsWith('ls')) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral })
            const { ls_function, MockMessage } = require("./msg_handler.js");
            const { load_rpg_data } = require("../../utils/file.js");
            const [_, userId] = interaction.customId.split("|");
            const message = new MockMessage(`${prefix}ls`, interaction.message.channel, interaction.user, interaction.guild);
            const res = await ls_function({ client: interaction.client, message, rpg_data: load_rpg_data(userId), mode: 1, PASS: true });
            await interaction.followUp(res);
        } else if (interaction.customId.startsWith("sell")) {
            const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            const { add_money, get_emoji, setEmbedFooter } = require("./msg_handler.js");
            const { name, get_name_of_id } = require("../../utils/rpg.js");
            await interaction.deferUpdate();

            let [_, userId, item_id, price, amount] = customIdParts;

            price = parseInt(price);
            amount = parseInt(amount);

            const rpg_data = load_rpg_data(userId);

            rpg_data.inventory[item_id] -= amount;
            rpg_data.money = add_money({
                rpg_data,
                amount: price * amount,
                originalUser: "系統",
                targetUser: `<@${userId}>`,
                type: "出售物品所得",
            })

            save_rpg_data(userId, rpg_data);

            const emoji_trade = await get_emoji(interaction.client, "trade");
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_trade} | 成功售出了 ${amount} 個 ${name[item_id]}`);

            await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        } else if (interaction.customId.startsWith("cancel")) {
            const { get_emoji, setEmbedFooter } = require("./msg_handler.js");
            await interaction.deferUpdate();

            const emoji_cross = await get_emoji(interaction.client, "crosS");

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 操作取消`);

            await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        } else if (interaction.customId.startsWith('buy') || interaction.customId.startsWith('buyc')) {
            const { get_emoji, remove_money, add_money, setEmbedFooter } = require("./msg_handler.js");
            const { load_shop_data, save_shop_data, load_rpg_data, save_rpg_data } = require("../../utils/file.js");
            const { get_name_of_id } = require("../../utils/rpg.js");

            const [_, buyerUserId, targetUserId, amount, price, item] = interaction.customId.split('|');

            await interaction.deferUpdate();

            const isConfirm = interaction.customId.startsWith('buyc');

            const emoji_cross = await get_emoji(interaction.client, "crosS");
            const emoji_store = await get_emoji(interaction.client, "store");

            const buyerRPGData = load_rpg_data(buyerUserId);
            const targetUserRPGData = load_rpg_data(targetUserId);
            const targetUserShopData = load_shop_data(targetUserId);

            const item_data = targetUserShopData.items[item];

            if (!item_data) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 沒有販賣這個物品`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            };

            if (item_data.amount < amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 沒有販賣這麼多物品`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            };

            const item_name = get_name_of_id(item);
            const total_price = price * amount;

            buyerRPGData.money = remove_money({
                rpg_data: buyerRPGData,
                amount: total_price,
                originalUser: `<@${buyerUserId}>`,
                targetUser: `<@${targetUserId}>`,
                type: `購買物品付款`,
            });
            buyerRPGData.inventory[item] += amount;
            targetUserRPGData.money = add_money({
                rpg_data: targetUserRPGData,
                amount: total_price,
                originalUser: `<@${buyerUserId}>`,
                targetUser: `<@${targetUserId}>`,
                type: `購買物品付款`,
            });
            targetUserShopData.items[item].amount -= amount;
            save_rpg_data(buyerUserId, buyerRPGData);
            save_rpg_data(targetUserId, targetUserRPGData);
            save_shop_data(targetUserId, targetUserShopData);

            if (isConfirm) await interaction.followUp({
                content: `${emoji_store} | 你同意了 <@${buyerUserId}> 以 \`${total_price}$\` 購買 ${item_name} \`x${amount}\` 的交易`,
                flags: MessageFlags.Ephemeral
            });

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_store} | 購買成功`)
                .setDescription(`你購買了 ${item_name} \`x${amount.toLocaleString()}\`，花費 \`${(total_price).toLocaleString()}$\`${isConfirm ? "，\n經店家同意" : ""}`);

            return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        } else if (interaction.customId.startsWith('oven_bake')) {
            const {
                load_bake_data,
                save_bake_data,
                load_rpg_data,
                save_rpg_data
            } = require("../../utils/file.js");
            const { bake, name, oven_slots } = require("../../utils/rpg.js");
            const { get_emoji, setEmbedFooter } = require("./msg_handler.js");

            await interaction.deferUpdate();

            // oven_bake|${userId}|${item_id}|${amount}|${coal_amount}|${duration}|${session_id}
            const [_, userId, item_id, amount, coal_amount, duration, session_id] = interaction.customId.split("|");

            // 確保所有數值都被正確解析為整數
            const parsedAmount = parseInt(amount);
            const parsedCoalAmount = parseInt(coal_amount);
            const parsedDuration = parseInt(duration);

            // 從全域變數中取得 item_need 資料
            const item_need = global.oven_sessions?.[session_id];
            if (!item_need) {
                const { get_emoji, setEmbedFooter } = require("./msg_handler.js");
                const emoji_cross = await get_emoji(interaction.client, "crosS");
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 烘烤會話已過期`)
                    .setDescription(`請重新執行烘烤指令`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            };

            let rpg_data = load_rpg_data(userId)
            let bake_data = load_bake_data();

            if (bake_data[userId] && bake_data[userId].length >= oven_slots) {
                const emoji_cross = get_emoji(client, "crosS");

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的烤箱已經滿了`);

                return await interaction.followUp({ embeds: [setEmbedFooter(interaction.client, embed)] });
            };

            // ==================檢查物品==================
            let item_missing = [];

            for (const need_item of item_need) {
                const current_item_id = need_item.item;
                const need_amount = need_item.amount;
                const have_amount = (rpg_data.inventory[current_item_id] || 0);

                if (have_amount < need_amount) {
                    item_missing.push({
                        name: name[current_item_id] || need_item,
                        amount: need_amount - have_amount,
                    });
                };
            };

            if (item_missing.length > 0) {
                const items = [];
                for (const missing of item_missing) {
                    items.push(`${missing.name} \`x${missing.amount}\`個`);
                };

                const emoji_cross = await get_emoji(interaction.client, "crosS");
                const embed = new EmbedBuilder()
                    .setTitle(`${emoji_cross} | 你沒有那麼多的物品`)
                    .setColor(embed_error_color)
                    .setDescription(`你缺少了 ${items.join("、")}`);

                const TopLevelComponent = interaction.message.components;
                if (TopLevelComponent instanceof ActionRow) {
                    const components = TopLevelComponent.components;
                    if (components.length === 2) components[0].setLabel("重試");
                };

                return await interaction.editReply({ embeds: [setEmbedFooter(interaction.client, embed)], components: TopLevelComponent });
            };
            // ============================================

            for (const need_item of item_need) {
                rpg_data.inventory[need_item.item] -= need_item.amount;
            };

            save_rpg_data(userId, rpg_data)

            if (!bake_data[userId]) {
                bake_data[userId] = [];
            };

            const output_item_id = bake[item_id];
            const end_time = Math.floor(Date.now() / 1000) + parsedDuration;

            bake_data[userId].push({
                userId,
                item_id,
                amount: parsedAmount,
                coal_amount: parsedCoalAmount,
                end_time,
                output_item_id,
            });

            save_bake_data(bake_data);

            // 清理 session 資料
            delete global.oven_sessions[session_id];

            const emoji_drumstick = await get_emoji(interaction.client, "drumstick");

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_drumstick} | 成功放進烤箱烘烤 ${parsedAmount} 個 ${name[item_id]}`)
                .setDescription(`等待至 <t:${end_time}:R>`);

            await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        } else if (interaction.customId.startsWith("smelter_smelt")) {
            const {
                load_smelt_data,
                save_smelt_data,
                load_rpg_data,
                save_rpg_data
            } = require("../../utils/file.js");
            const { smeltable_items, name, smelter_slots } = require("../../utils/rpg.js");

            await interaction.deferUpdate();

            const [_, userId, item_id, amount, coal_amount, duration, output_amount, session_id] = interaction.customId.split("|");

            // 確保所有數值都被正確解析為整數
            const parsedAmount = parseInt(amount);
            const parsedCoalAmount = parseInt(coal_amount);
            const parsedDuration = parseInt(duration);

            // 從全域變數中取得 item_need 資料
            const item_need = global.smelter_sessions?.[session_id];
            if (!item_need) {
                const { get_emoji, setEmbedFooter } = require("./msg_handler.js");
                const emoji_cross = await get_emoji(interaction.client, "crosS");
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 熔鍊會話已過期`)
                    .setDescription(`請重新執行熔鍊指令`);

                return await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
            };

            let rpg_data = load_rpg_data(userId)

            // ==================檢查物品==================
            let item_missing = [];

            for (const need_item of item_need) {
                const current_item_id = need_item.item;
                const need_amount = need_item.amount;
                const have_amount = (rpg_data.inventory[current_item_id] || 0);

                if (have_amount < need_amount) {
                    item_missing.push({
                        name: name[current_item_id] || need_item,
                        amount: need_amount - have_amount,
                    });
                };
            };

            if (item_missing.length > 0) {
                const items = [];
                for (const missing of item_missing) {
                    items.push(`${missing.name} \`x${missing.amount}\`個`);
                };

                const emoji_cross = await get_emoji(interaction.client, "crosS");
                const embed = new EmbedBuilder()
                    .setTitle(`${emoji_cross} | 你沒有那麼多的物品`)
                    .setColor(embed_error_color)
                    .setDescription(`你缺少了 ${items.join("、")}`);

                return await interaction.editReply({ embeds: [setEmbedFooter(interaction.client, embed)], flags: MessageFlags.Ephemeral });
            };
            // ==================檢查物品==================


            for (const need_item of item_need) {
                rpg_data.inventory[need_item.item] -= need_item.amount;
            };

            save_rpg_data(userId, rpg_data)

            const output_item_id = smeltable_items.find(a => a.input[0].item === item_id).output;
            const end_time = Math.floor(Date.now() / 1000) + parsedDuration;

            let smelt_data = load_smelt_data();

            if (!smelt_data[userId]) {
                smelt_data[userId] = [];
            };

            if (smelt_data[userId].length >= smelter_slots) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`);

                return await interaction.followUp({ embeds: [setEmbedFooter(interaction.client, embed)] });
            };

            smelt_data[userId].push({
                userId,
                item_id,
                amount: parsedAmount,
                coal_amount: parsedCoalAmount,
                end_time,
                output_item_id,
                output_amount: parseInt(output_amount),
            });

            save_smelt_data(smelt_data);

            // 清理 session 資料
            delete global.smelter_sessions[session_id];

            const { get_emoji, setEmbedFooter } = require("./msg_handler.js");
            const emoji_furnace = await get_emoji(interaction.client, "furnace");
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_furnace} | 成功放進煉金爐內`)
                .setDescription(`等待至 <t:${end_time}:R>`);

            await interaction.editReply({ embeds: [setEmbedFooter(client, embed)], components: [] });
        };
    },
};