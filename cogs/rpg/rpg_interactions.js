const { Events, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ActionRow, User, CommandInteraction, ButtonStyle, ButtonBuilder } = require("discord.js");
const EmbedBuilder = require('../../utils/customs/embedBuilder.js');
const { embed_default_color, embed_error_color, embed_job_color, reserved_prefixes } = require("../../utils/config.js");
const { get_logger } = require("../../utils/logger.js");
const util = require('node:util');
const DogClient = require("../../utils/customs/client.js");

const logger = get_logger();

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
            `- <t:${timestamp}:R> ${originalUser} \`>\` ${targetUser} \`${amount?.toLocaleString()}$\` (${type})`
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
    const { get_emoji } = require("../../utils/rpg.js");

    const emoji = await get_emoji(client, "crosS");

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji} | 沒事戳這顆按鈕幹嘛?`)
        .setEmbedFooter();

    return embed;
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
        },
        music: {

        },
        rpg: {
            "brew": {
                emoji: "💊💧",
                desc: "藥劑師研發藥水使用",
                usage: [],
                format: `{cmd}`,
            },
            "buy": {
                emoji: "",
                desc: "購買商店裡的商品",
                usage: [
                    {
                        name: "向{author}購買 `2` 個麵包",
                        value: "&buy @{author} bread 2"
                    }
                ],
                format: "{cmd} @使用者 商品ID 數量",
            },
            "eat": {
                emoji: "",
                desc: "吃東西回復飽食度",
                usage: [
                    {
                        name: "顯示所有可以食用的食物",
                        value: "&eat"
                    },
                    {
                        name: "吃一個麵包",
                        value: "&eat bread"
                    },
                    {
                        name: "吃三個牛肉",
                        value: "&eat beef 3"
                    },
                    {
                        name: "[不建議] 停用爆體保護下吃掉所有麵包",
                        value: "&eat bread all force"
                    }
                ],
                format: "{cmd} [食物ID] [數量]",
            },
            // "feed": {

            // },
            "fell": {
                emoji: "",
                desc: "伐木工砍伐木頭使用",
                usage: [],
                format: "{cmd}",
            },
            // "fightjob": {

            // },
            "fish": {
                emoji: "",
                desc: "漁夫捕魚使用",
                usage: [],
                format: "{cmd}",
            },
            "herd": {
                emoji: "",
                desc: "牧農放牧指令",
                usage: [],
                format: "{cmd}",
            },
            "items": {
                emoji: "",
                desc: "取得你的背包裡有多少東西",
                usage: [
                    {
                        name: "取得你的背包清單",
                        value: "&items"
                    }
                ],
                format: "{cmd}",
            },
            // "job": {

            // },
            "last": {
                emoji: "",
                desc: '"倒數"金錢排行榜',
                usage: [
                    {
                        name: "顯示倒數金錢排行榜",
                        value: "&last"
                    }
                ],
                format: "{cmd}",
            },
            // "make": {

            // },
            // "marry": {

            // },
            "mine": {
                emoji: "",
                desc: "礦工挖礦使用指令",
                usage: [],
                format: "{cmd}",
            },
            // "partner": {

            // },
            "money": {
                emoji: "",
                desc: "查看金錢及使用方法",
                usage: [
                    {
                        name: "查看金錢",
                        value: "&money"
                    },
                    {
                        name: "付給{author} 1000$",
                        value: "&pay @{author} 1000"
                    }
                ],
                format: "{cmd}",
            },
            "pay": {
                emoji: "",
                desc: "付款給其他使用者",
                usage: [
                    {
                        name: "付1000塊給{author}",
                        value: "&pay @{author} 1000"
                    }
                ],
                format: "{cmd} <使用者> <數量>",
            },
            "privacy": {
                emoji: "",
                desc: "切換隱私權控制開關",
                usage: [],
                format: "{cmd}",
            },
            "sell": {
                emoji: "",
                desc: "出售東西並換取金錢",
                usage: [
                    {
                        name: "出售2個小麥",
                        value: "&sell 小麥 2"
                    },
                    {
                        name: "出售所有小麥",
                        value: "&sell 小麥 all"
                    },
                    {
                        name: "出售所有麵包(英文)",
                        value: "&sell bread all"
                    }
                ],
                format: "{cmd} <物品ID> [數量]",
            },
            "shop": {
                emoji: "",
                desc: "商店系統 - 透過購買來活絡經濟",
                usage: [
                    {
                        name: "列出{author}有販賣的物品",
                        value: "&shop @{author}"
                    },
                    {
                        name: "上架麵包 10個，每個價格150$",
                        value: "&shop add 麵包 10 150"
                    },
                    {
                        name: "下架5個鐵礦",
                        value: "&shop remove 鐵礦 5"
                    },
                    {
                        name: "下架所有煤炭",
                        value: "&shop remove 煤炭"
                    },
                    {
                        name: "將你的店舖狀態設為營業中",
                        value: "&shop open"
                    },
                    {
                        name: "關閉店鋪，其他人將無法查看或是購買物品",
                        value: "&shop close"
                    }
                ],
                format: "&shop <list|add|remove|open|close|on|off>",
            },
            "id": {
                emoji: "",
                desc: "獲取物品的ID(英文)",
                usage: [
                    {
                        name: "獲取小麥的ID(wheat)",
                        value: "&id 小麥"
                    },
                ],
                format: "{cmd} <物品名稱>",
            },
            "name": {
                emoji: "",
                desc: "獲取物品的名稱(中文)",
                usage: [
                    {
                        name: "獲取wheat的中文(小麥)",
                        value: "&name wheat"
                    },
                ],
                format: "{cmd} <物品ID>",
            },
            "marry": {
                emoji: "",
                desc: "結婚指令",
                usage: [
                    {
                        name: "查詢感情狀態",
                        value: "&marry"
                    },
                    {
                        name: "和{author}結婚",
                        value: "&marry @{author}"
                    },
                    {
                        name: "離婚 :((",
                        value: "&divorce"
                    }
                ],
                format: "{cmd} [使用者]",
            },
            "divorce": {
                emoji: "",
                desc: "離婚指令",
                usage: [],
                format: "{cmd}",
            },
        },
        special: {

        },
        dev: {

        },
    },
};

const special_cancel = {
    marry: {
        title: "{crosS} 求婚被拒絕了",
    },
};

/**
 * 
 * @param {string} category 
 * @param {User} user 
 * @param {DogClient} client 
 * @returns {[EmbedBuilder, ActionRowBuilder]}
 */
function get_help_embed(category, user) {
    const options = Object.entries(help.group[category])
        .flatMap(([name, data]) => {
            return [{
                label: name,
                description: data.desc,
                value: name,
            }];
        });

    let row;

    if (options.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`help|${user.id}|${category}`)
            .setPlaceholder(`指令教學`)
            .addOptions(...options);

        row = new ActionRowBuilder()
            .addComponents(selectMenu);
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(help.name[category])
        .setEmbedFooter()
        .setEmbedAuthor();

    return [embed, row];
};

/**
 * 
 * @param {string} command_name 
 * @param {DogClient} client 
 * @param {string} guildID
 * @returns {EmbedBuilder}
 */
function get_help_command(category, command_name, guildID, client = global._client) {
    const { find_redirect_targets_from_id } = require("./msg_handler.js");
    const { firstPrefix } = require("../../utils/rpg.js");

    const command_data = help.group[category][command_name];
    if (!command_data) return new EmbedBuilder().setTitle("指令不存在");

    const prefix = firstPrefix(guildID);

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
        ? command_data.usage.map((info, i) => {
            const value = info.value.replace(/{author}/g, client.author);
            const name = info.name.replace(/{author}/g, client.author);
            return `${i + 1}. ${name}\n\`\`\`${value}\`\`\``;
        }).join("\n")
        : `\`${client.author}很懶 他沒有留下任何使用方法owo\``;

    /*
    Field name: 格式
    Field value:
    `<>`是一定要填的參數 `[]`是選填的參數
    ```
    ${format}
    ```
    */
    const format = command_data.format ? command_data.format.replace("{cmd}", `${prefix}${command_name}`) : `${client.author}很懶 他沒有留下任何格式owo`;

    const alias = find_redirect_targets_from_id(command_name).map(name => `\`${name}\``).join("、");

    let emoji = "";
    if (command_data.emoji) {
        emoji = get_emoji(command_data.emoji) ?? command_data.emoji;
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji} | ${command_name} 指令`)
        .setDescription(command_data.desc || null)
        .setEmbedFooter()
        .addFields(
            { name: "使用方式", value: usage },
            { name: "格式", value: `\`<>\`是一定要填的參數 \`[]\`是選填的參數\n\`\`\`${format}\`\`\`` },
        );

    if (alias?.length) embed.addFields({ name: "別名", value: alias });

    return embed;
};

module.exports = {
    name: Events.InteractionCreate,
    /**
     * 
     * @param {DogClient} client 
     * @param {CommandInteraction} interaction 
     * @returns {Promise<void>}
     */
    execute: async function (client, interaction) {
        try {
            const { load_shop_data, save_shop_data, load_rpg_data, save_rpg_data, load_bake_data, save_bake_data, load_smelt_data, save_smelt_data, loadData, find_default_value } = require("../../utils/file.js");
            const { job_delay_embed, choose_job_row, get_name_of_id, get_emoji, add_money, remove_money, userHaveEnoughItems, notEnoughItemEmbed, firstPrefix, bake, smeltable_recipe, name, jobs, smelter_slots, oven_slots } = require("../../utils/rpg.js");
            const { ls_function, rpg_handler, MockMessage } = require("./msg_handler.js");
            const { get_farm_info_embed } = require("../../slashcmd/game/rpg/farm.js");

            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (interaction.customId.startsWith("vote_")) return;

            const message = interaction.message;
            const user = interaction.user;

            const prefix = firstPrefix(interaction.guild.id);

            if (message.author.id !== client.user.id) return;

            // 從 customId 提取 UserID
            const customIdParts = interaction.customId.split('|');
            const originalUserId = customIdParts[1];

            // 驗證使用者身份
            if (user.id !== originalUserId) {
                try {
                    if (interaction.deferred) {
                        await interaction.followUp({ embeds: [await get_failed_embed(client)], flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.reply({ embeds: [await get_failed_embed(client)], flags: MessageFlags.Ephemeral });
                    };
                } catch (error) {
                    const errorStack = util.inspect(error, { depth: null });
                    logger.error(`對${user.globalName || user.username}顯示拒絕嵌入時發生錯誤：\n${errorStack}`)
                };
                return;
            };

            logger.info(`${user.username}${user.globalName ? `(${user.globalName})` : ""} 正在觸發互動(rpg_interactions): ${interaction.customId}，訊息ID: ${interaction.message?.id}`);

            if (interaction.customId.startsWith('rpg_transaction')) {
                await interaction.deferUpdate();
                const embed = get_transaction_embed(interaction);

                await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else if (interaction.customId.startsWith('help')) {
                const [_, __, category, cmd = null] = interaction.customId.split('|');

                await interaction.deferUpdate();
                let embed;
                let row;

                if (category) {
                    embed = get_help_command(category, interaction?.values?.[0] || cmd || "buy", client);
                } else {
                    [embed, row] = get_help_embed(interaction.values[0], user);
                };

                await interaction.followUp({
                    embeds: embed ? [embed] : [],
                    components: row ? [row] : [],
                    flags: MessageFlags.Ephemeral,
                });
            } else if (interaction.customId.startsWith('pay_confirm')) {
                await interaction.deferUpdate();
                const emoji_cross = await get_emoji(client, "crosS");
                const emoji_top = await get_emoji(client, "top");
                const [_, userId, targetUserId, amount] = interaction.customId.split('|');
                const rpg_data = load_rpg_data(userId);
                const target_user_rpg_data = load_rpg_data(targetUserId);

                if (rpg_data.money < amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 歐不!`)
                        .setDescription(`你還差 \`${(amount - rpg_data.money).toLocaleString()}$\``)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
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
                    .setDescription(`你已成功付款 \`${parseInt(amount).toLocaleString()}$\` 給 <@${targetUserId}>`)
                    .setEmbedFooter();

                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith('setLang')) {
                // const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
                // const { get_emoji } = require("./msg_handler.js");

                // await interaction.deferUpdate();
                // const emoji_tick = get_emoji(client, "Tick");
                // const emoji_cross = get_emoji(client, "crosS");
                // const embed = new EmbedBuilder()
                //     .setColor(embed_default_color)
                //     .setTitle(`${emoji_tick} | 語言設定成功`)
                //     .setDescription(`你已成功設定語言為 ${client.available_languages[language]}`)
                //     .setEmbedFooter();

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

                // await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith('rpg_privacy_menu')) {
                await interaction.deferUpdate();

                const [_, userId] = interaction.customId.split('|');

                const rpg_data = load_rpg_data(userId);

                const [emoji_shield, emoji_backpack, emoji_partner] = await Promise.all(
                    ["shield", "bag", "partner"].map(async (name) => {
                        return await get_emoji(client, name);
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

目前的設定為：\`${text}\``)
                    .setEmbedFooter();

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

                return await interaction.editReply({ embeds: [embed], components: [row] });
            } else if (interaction.customId.startsWith('choose_command')) {
                await interaction.deferUpdate();

                const [_, __, command] = interaction.customId.split('|');

                const message = new MockMessage(`${prefix}${command}`, interaction.channel, interaction.user, interaction.guild);
                let response = await rpg_handler({ client: client, message, d: true, mode: 1 });

                response.components ??= [];

                await interaction.editReply(response);
            } else if (interaction.customId.startsWith('ls')) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                const [_, userId] = interaction.customId.split("|");
                const message = new MockMessage(`${prefix}ls`, interaction.message.channel, interaction.user, interaction.guild);
                const res = await ls_function({ client: client, message, rpg_data: load_rpg_data(userId), mode: 1, PASS: true });
                await interaction.followUp(res);
            } else if (interaction.customId.startsWith("sell")) {
                await interaction.deferUpdate();

                let [_, userId, item_id, price, amount, total_price] = customIdParts;

                price = parseFloat(price);
                amount = parseInt(amount);
                total_price = Math.round(parseFloat(total_price));

                const rpg_data = load_rpg_data(userId);

                rpg_data.inventory[item_id] -= amount;
                rpg_data.money = add_money({
                    rpg_data,
                    amount: total_price,
                    originalUser: "系統",
                    targetUser: `<@${userId}>`,
                    type: "出售物品所得",
                })

                save_rpg_data(userId, rpg_data);

                const emoji_trade = await get_emoji(client, "trade");
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_trade} | 成功售出了 ${amount} 個 ${get_name_of_id(item_id)}`)
                    .setEmbedFooter();

                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith("cancel")) {
                await interaction.deferUpdate();

                const emoji_cross = await get_emoji(client, "crosS");

                const [_, __, special = null] = interaction.customId.split("|");

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 操作取消`)
                    .setEmbedFooter();

                if (special) {
                    const data = special_cancel[special];
                    if (data) {
                        const title = data.title ?? null;
                        const description = data.description ?? null;

                        // 把title和description中的{xxx}改成await get_emoji(client, xxx)
                        const regex = /\{([^}]+)\}/g;
                        const replaceAsync = async (str, regex, replacer) => {
                            const promises = [];
                            str.replace(regex, (match, p1) => {
                                promises.push(replacer(match, p1));
                                return match;
                            });
                            const replacements = await Promise.all(promises);
                            return str.replace(regex, () => replacements.shift());
                        };

                        title = await replaceAsync(title, regex, async (match, p1) => await get_emoji(client, p1));
                        description = await replaceAsync(description, regex, async (match, p1) => await get_emoji(client, p1));

                        embed.setTitle(title);
                        embed.setDescription(description);
                    };
                };

                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith('buy') || interaction.customId.startsWith('buyc')) {
                const [_, buyerUserId, targetUserId, amount, price, item] = interaction.customId.split('|');

                await interaction.deferUpdate();

                const isConfirm = interaction.customId.startsWith('buyc');

                const emoji_cross = await get_emoji(client, "crosS");
                const emoji_store = await get_emoji(client, "store");

                const buyerRPGData = load_rpg_data(buyerUserId);
                const targetUserRPGData = load_rpg_data(targetUserId);
                const targetUserShopData = load_shop_data(targetUserId);

                const item_data = targetUserShopData.items[item];

                if (!item_data) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 沒有販賣這個物品`)
                        .setEmbedFooter();

                    return await interaction.editReply({ embeds: [embed], components: [] });
                };

                if (item_data.amount < amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 沒有販賣這麼多物品`)
                        .setEmbedFooter();

                    return await interaction.editReply({ embeds: [embed], components: [] });
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
                    .setDescription(`你購買了 ${item_name} \`x${amount.toLocaleString()}\`，花費 \`${(total_price).toLocaleString()}$\`${isConfirm ? "，\n經店家同意" : ""}`)
                    .setEmbedFooter();

                return await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith('oven_bake')) {
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

                    const emoji_cross = await get_emoji(client, "crosS");
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 烘烤會話已過期`)
                        .setDescription(`請重新執行烘烤指令`)
                        .setEmbedFooter();

                    return await interaction.editReply({ embeds: [embed], components: [] });
                };

                let rpg_data = load_rpg_data(userId)
                let bake_data = load_bake_data();

                if (bake_data[userId] && bake_data[userId].length >= oven_slots) {
                    const emoji_cross = get_emoji(client, "crosS");

                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的烤箱已經滿了`)
                        .setEmbedFooter();

                    return await interaction.followUp({ embeds: [embed] });
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

                    const embed = await notEnoughItemEmbed(items);

                    const TopLevelComponent = interaction.message.components;
                    if (TopLevelComponent instanceof ActionRow) {
                        const components = TopLevelComponent.components;
                        if (components.length === 2) components[0].setLabel("重試");
                    };

                    return await interaction.editReply({ embeds: [embed], components: TopLevelComponent });
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

                const emoji_drumstick = await get_emoji(client, "drumstick");

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_drumstick} | 成功放進烤箱烘烤 ${parsedAmount} 個 ${name[item_id]}`)
                    .setDescription(`等待至 <t:${end_time}:R>`)
                    .setEmbedFooter();

                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith("smelter_smelt")) {
                await interaction.deferUpdate();

                const [_, userId, item_id, amount, coal_amount, duration, output_amount, session_id] = interaction.customId.split("|");
                const emoji_cross = await get_emoji(client, "crosS");

                // 確保所有數值都被正確解析為整數
                const parsedAmount = parseInt(amount);
                const parsedCoalAmount = parseInt(coal_amount);
                const parsedDuration = parseInt(duration);

                // 從全域變數中取得 item_need 資料
                const item_need = global.smelter_sessions?.[session_id];
                if (!item_need) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 熔鍊會話已過期`)
                        .setDescription(`請重新執行熔鍊指令`)
                        .setEmbedFooter();

                    return await interaction.editReply({ embeds: [embed], components: [] });
                };

                let rpg_data = load_rpg_data(userId)

                // ==================檢查物品==================
                let item_missing = [];

                for (const need_item of item_need) {
                    const current_item_id = need_item.item;
                    const need_amount = need_item.amount;
                    const have_amount = (rpg_data.inventory[current_item_id] || 0);

                    if (!userHaveEnoughItems(userId, current_item_id, need_amount)) {
                        item_missing.push({
                            name: get_name_of_id(current_item_id),
                            amount: need_amount - have_amount,
                        });
                    };
                };

                if (item_missing.length > 0) {
                    const embed = await notEnoughItemEmbed(item_missing);

                    return await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                };
                // ==================檢查物品==================

                for (const need_item of item_need) {
                    rpg_data.inventory[need_item.item] -= need_item.amount;
                };

                save_rpg_data(userId, rpg_data)

                const output_item_id = smeltable_recipe.find(a => a.input[0].item === item_id).output;
                const end_time = Math.floor(Date.now() / 1000) + parsedDuration;

                let smelt_data = load_smelt_data();

                if (!smelt_data[userId]) {
                    smelt_data[userId] = [];
                };

                if (smelt_data[userId].length >= smelter_slots) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`)
                        .setEmbedFooter();

                    return await interaction.followUp({ embeds: [embed] });
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

                const emoji_furnace = await get_emoji(client, "furnace");
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_furnace} | 成功放進煉金爐內`)
                    .setDescription(`等待至 <t:${end_time}:R>`)
                    .setEmbedFooter();

                await interaction.editReply({ embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith("farm")) {
                const [embed, row] = await get_farm_info_embed(user, client);

                await interaction.update({ embeds: [embed], components: [row] });
            } else if (interaction.customId.startsWith("marry_accept")) {
                await interaction.deferUpdate();

                const emoji_cross = await get_emoji(client, "crosS");
                const emoji_check = await get_emoji(client, "check");

                const [_, targetUserId, userId] = interaction.customId.split("|");

                const rpg_data = load_rpg_data(userId);
                const t_rpg_data = load_rpg_data(targetUserId);
                const marry_data = rpg_data.marry ?? {};
                const marry_with = marry_data.with ?? null;
                const married = marry_data.married ?? false;

                if (married) {
                    if (marry_with === targetUserId) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你那麼健忘哦? 他都跟你結過婚了!`)
                            .setEmbedFooter();

                        return await interaction.editReply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 還敢偷找小三!`)
                            .setEmbedFooter();

                        return await interaction.editReply({ embeds: [embed] });
                    };
                };

                t_rpg_data.marry = rpg_data.marry = {
                    status: true,
                    with: targetUserId,
                    time: Date.now(),
                };

                save_rpg_data(userId, rpg_data);
                save_rpg_data(targetUserId, t_rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_check} | 求婚成功`)
                    .setDescription(`<@${userId}> 和 <@${targetUserId}> 現在是夫妻拉`)
                    .setEmbedFooter();

                return await interaction.editReply({ content: "", embeds: [embed], components: [] });
            } else if (interaction.customId.startsWith("divorce")) {
                const [_, userId, with_UserId] = interaction.customId.split("|");

                const marry_default_value = find_default_value("rpg_database.json")?.["marry"] ?? {};

                await interaction.deferReply();

                const emoji_cross = await get_emoji(client, "cross");

                const rpg_data = load_rpg_data(userId);
                const with_User_rpg_data = load_rpg_data(with_UserId);

                const marry_data = rpg_data.marry ?? {};
                const married = marry_data.married ?? false;

                if (!married) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你還沒有結過婚ㄝ`)
                        .setEmbedFooter();

                    return await interaction.editReply({ embeds: [embed] });
                };

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_cross} | 歐不`)
                    .setDescription(`<@${userId}> 和 <@${with_UserId}> 的婚姻關係已經結束了 :((`)
                    .setEmbedFooter();

                rpg_data.marry = marry_default_value;
                with_User_rpg_data.marry = marry_default_value;

                save_rpg_data(userId, rpg_data);
                save_rpg_data(with_UserId, with_User_rpg_data);

                if (mode === 1) return { embeds: [embed] };
                return await interaction.editReply({ embeds: [embed] });
            } else if (interaction.customId.startsWith("job_transfer")) {
                const emoji_job = await get_emoji(client, "job");

                const delay_embed = await job_delay_embed(user.id);
                if (delay_embed) {
                    if (!interaction.deferred) await interaction.deferReply();

                    return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(embed_job_color)
                        .setTitle(`${emoji_job} | 請選擇你要轉職的職業`)
                        .setDescription("轉職後一個禮拜不能更動職業!")
                        .setEmbedFooter();

                    const row = await choose_job_row(user.id);

                    return await interaction.update({ embeds: [embed], components: [row] });
                };
            } else if (interaction.customId.startsWith("job_choose")) {
                if (!interaction.isStringSelectMenu()) return;

                const emoji_job = await get_emoji(client, "job");

                const job = interaction.values[0];
                const job_name = jobs?.[job]?.name;

                const delay_embed = await job_delay_embed(user.id);
                if (delay_embed) {
                    return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });
                };

                const embed = new EmbedBuilder()
                    .setColor(embed_job_color)
                    .setTitle(`${emoji_job} | 確認轉職通知`)
                    .setDescription(`請確認將轉職為 ${job_name}，轉職後七天內不可更動！`)
                    .setEmbedFooter();

                const confirm_button = new ButtonBuilder()
                    .setCustomId(`job_confirm|${user.id}|${job}`)
                    .setLabel("我確定")
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder()
                    .addComponents(confirm_button);

                return await interaction.update({ embeds: [embed], components: [row] });
            } else if (interaction.customId.startsWith("job_confirm")) {

                const [_, __, job] = interaction.customId.split("|");
                const job_name = jobs?.[job]?.name;

                const emoji_job = await get_emoji(client, "job");

                const delay_embed = await job_delay_embed(user.id);
                if (delay_embed) {
                    return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });
                };

                const rpg_data = load_rpg_data(user.id);

                rpg_data.job = job;
                if (job === "farmer") {
                    if (!rpg_data.inventory) rpg_data.inventory = {};
                    if (!rpg_data.inventory.wooden_hoe) rpg_data.inventory.wooden_hoe = 0;
                    rpg_data.inventory.wooden_hoe += 4;
                };

                if (!rpg_data.lastRunTimestamp) rpg_data.lastRunTimestamp = {};
                rpg_data.lastRunTimestamp.job = Date.now();

                save_rpg_data(user.id, rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_job_color)
                    .setTitle(`${emoji_job} | 成功轉職為 ${job_name}!`)
                    .setEmbedFooter();

                return await interaction.update({ embeds: [embed], components: [] });
            };
        } catch (err) {
            const { get_loophole_embed } = require("../../utils/rpg.js");

            const errorStack = util.inspect(err, { depth: null });

            logger.error(errorStack);

            const loophole_embeds = await get_loophole_embed(client, errorStack);

            if (interaction.deferred) {
                await interaction.followUp({ embeds: loophole_embeds, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: loophole_embeds, flags: MessageFlags.Ephemeral });
            };
        };
    },
    get_help_embed,
    get_help_command,
};