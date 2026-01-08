const { Events, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ActionRow, User, CommandInteraction, ButtonStyle, ButtonBuilder, ButtonInteraction, StringSelectMenuInteraction, BaseInteraction } = require("discord.js");
const { Soundcloud } = require("soundcloud.ts");
const { getVoiceConnection, joinVoiceChannel } = require("@discordjs/voice");
const util = require("node:util");

const { get_logger } = require("../../utils/logger.js");
const { embed_default_color, embed_error_color, embed_job_color, STATUS_PAGE, DOCS } = require("../../utils/config.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
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
        ).join("\n");
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

/**
 * 
 * @param {BaseInteraction} [interaction]
 * @param {DogClient} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function get_failed_embed(interaction = null, client = global._client) {
    const { get_emoji } = require("../../utils/rpg.js");

    const emoji = await get_emoji("crosS", client);

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji} | 沒事戳這顆按鈕幹嘛?`)
        .setEmbedFooter(interaction);

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
                emoji: "potion",
                desc: "藥劑師研發藥水使用",
                usage: [],
                format: `{cmd}`,
            },
            "buy": {
                emoji: "buy",
                desc: "購買商店裡的商品",
                usage: [
                    {
                        name: "向{author}購買 `2` 個麵包",
                        value: "&buy @{author} bread 2"
                    }
                ],
                format: "{cmd} @使用者 商品ID 數量",
            },
            "divorce": {
                emoji: "broken",
                desc: "離婚指令",
                usage: [],
                format: "{cmd}",
            },
            "eat": {
                emoji: "food",
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
                emoji: "wood",
                desc: "伐木工砍伐木頭使用",
                usage: [],
                format: "{cmd}",
            },
            // "fightjob": {

            // },
            "fish": {
                emoji: "fisher",
                desc: "漁夫捕魚使用",
                usage: [],
                format: "{cmd}",
            },
            "herd": {
                emoji: "cow",
                desc: "牧農放牧指令",
                usage: [],
                format: "{cmd}",
            },
            "items": {
                emoji: "bag",
                desc: "取得你的背包裡有多少東西",
                usage: [
                    {
                        name: "取得你的背包清單",
                        value: "&items"
                    }
                ],
                format: "{cmd}",
            },
            "job": {
                "emoji": "job",
                "desc": "選擇職業",
                "usage": [
                    {
                        "name": "在跳出的下拉選單選擇職業",
                        "value": "&job"
                    },
                    {
                        "name": "選擇冒險職業",
                        "value": "&job fight"
                    }
                ],
                "format": "{cmd}"
            },
            "last": {
                emoji: "decrease",
                desc: "「倒數」金錢排行榜",
                usage: [
                    {
                        name: "顯示倒數金錢排行榜",
                        value: "&last"
                    }
                ],
                format: "{cmd}",
            },
            "make": {
                "emoji": "toolbox",
                "desc": "合成或製作出物品",
                "usage": [
                    {
                        "name": "合成製作出石劍",
                        "value": "&make 石劍"
                    },
                    {
                        "name": "使用 2個木材 製作出木棒",
                        "value": "&make stick"
                    }
                ],
                "format": "{cmd} <目標物品ID> [數量]"
            },
            "marry": {
                emoji: "wedding",
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
            "mine": {
                emoji: "ore",
                desc: "礦工挖礦使用指令",
                usage: [],
                format: "{cmd}",
            },
            "money": {
                emoji: "saving",
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
            "partner": {
                emoji: "pet",
                desc: "夥伴系統",
                usage: [
                    {
                        name: "和{author}結為夥伴",
                        value: "&partner add @{author}"
                    },
                    {
                        name: "離開你的夥伴",
                        value: "&partner leave"
                    },
                    {
                        name: "顯示你的夥伴",
                        value: "&partner list"
                    },
                    {
                        name: "餵食夥伴",
                        value: "&feed @{author}"
                    }
                ],
                format: "{cmd} [成員]",
            },
            "pay": {
                emoji: "pay",
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
                emoji: "shield",
                desc: "切換隱私權控制開關",
                usage: [],
                format: "{cmd}",
            },
            "sell": {
                emoji: "trade",
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
                emoji: "store",
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
                emoji: "idCard",
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
                emoji: "idCard",
                desc: "獲取物品的名稱(中文)",
                usage: [
                    {
                        name: "獲取wheat的中文(小麥)",
                        value: "&name wheat"
                    },
                ],
                format: "{cmd} <物品ID>",
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
 * @param {BaseInteraction} [interaction]
 * @returns {[EmbedBuilder, ActionRowBuilder]}
 */
function get_help_embed(category, user, interaction = null) {
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
        .setEmbedFooter(interaction)
        .setEmbedAuthor();

    return [embed, row];
};

/**
 * 
 * @param {string} category
 * @param {string} command_name
 * @param {string} guildID
 * @param {BaseInteraction} [interaction]
 * @param {DogClient} [client]
 * @returns {Promise<EmbedBuilder | null>}
 */
async function get_help_command(category, command_name, guildID, interaction = null, client = global._client) {
    const { find_redirect_targets_from_id } = require("./msg_handler.js");
    const { firstPrefix, get_emoji } = require("../../utils/rpg.js");

    const command_data = help.group[category][command_name];
    if (!command_data) return null;

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
        emoji = await get_emoji(command_data.emoji, client) ?? command_data.emoji;
    };

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${emoji} | ${command_name} 指令`)
        .setDescription(command_data.desc || null)
        .setEmbedFooter(interaction)
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
     * @param {ButtonInteraction | StringSelectMenuInteraction} interaction 
     * @returns {Promise<void>}
     */
    execute: async function (client, interaction) {
        try {
            const { load_shop_data, save_shop_data, load_rpg_data, save_rpg_data, load_bake_data, save_bake_data, load_smelt_data, save_smelt_data, find_default_value } = require("../../utils/file.js");
            const { job_delay_embed, choose_job_row, get_name_of_id, get_emoji, get_emojis, add_money, remove_money, userHaveEnoughItems, notEnoughItemEmbed, firstPrefix, ls_function, bake, smeltable_recipe, name, jobs, smelter_slots, oven_slots, PrivacySettings } = require("../../utils/rpg.js");
            const { rpg_handler, MockMessage } = require("./msg_handler.js");
            const { get_farm_info_embed } = require("../../slashcmd/game/rpg/farm.js");
            const { getBotInfoEmbed } = require("../../slashcmd/info.js")
            const { getNowPlayingEmbed } = require("../../slashcmd/music/nowplaying.js");
            const { getQueue, saveQueue, loopStatus } = require("../../utils/music/music.js");

            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

            const message = interaction.message;
            const user = interaction.user;

            const prefix = firstPrefix(interaction.guild.id);

            if (message.author.id !== client.user.id) return;

            // 從 customId 提取 UserID
            const customIdParts = interaction.customId.split("|");
            const interactionCategory = customIdParts[0];
            const originalUserId = customIdParts[1];
            const otherCustomIDs = customIdParts.slice(1); // 移除 customId 的ID (類別)

            // 驗證使用者身份
            if (originalUserId !== "any" && user.id !== originalUserId) {
                try {
                    if (interaction.deferred) {
                        await interaction.followUp({ embeds: [await get_failed_embed(interaction, client)], flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.reply({ embeds: [await get_failed_embed(interaction, client)], flags: MessageFlags.Ephemeral });
                    };
                } catch (error) {
                    const errorStack = util.inspect(error, { depth: null });
                    logger.error(`對${user.globalName || user.username}顯示拒絕嵌入時發生錯誤：\n${errorStack}`)
                };
                return;
            };

            logger.info(`${user.username}${user.globalName ? `(${user.globalName})` : ""} 正在觸發互動(rpg_interactions): ${interaction.customId}，訊息ID: ${interaction.message?.id}`);

            switch (interactionCategory) {
                case "rpg_transaction": {
                    await interaction.deferUpdate();
                    const embed = get_transaction_embed(interaction);

                    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                };
                case "help": {
                    const [_, __, category, cmd = null] = interaction.customId.split("|");

                    await interaction.deferUpdate();
                    let embed;
                    let row;

                    if (category) {
                        embed = await get_help_command(category, interaction?.values?.[0] || cmd || "buy", client);
                    } else {
                        [embed, row] = get_help_embed(interaction.values[0], user, interaction);
                    };

                    await interaction.followUp({
                        embeds: embed ? [embed] : [],
                        components: row ? [row] : [],
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                };
                case "pay_confirm": {
                    await interaction.deferUpdate();
                    const emoji_cross = await get_emoji("crosS", client);
                    const emoji_top = await get_emoji("top", client);
                    const [_, userId, targetUserId, amount] = interaction.customId.split("|");
                    const rpg_data = load_rpg_data(userId);
                    const target_user_rpg_data = load_rpg_data(targetUserId);

                    if (rpg_data.money < amount) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 歐不!`)
                            .setDescription(`你還差 \`${(amount - rpg_data.money).toLocaleString()}$\``)
                            .setEmbedFooter(interaction);

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
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "setLang": {
                    // const { load_rpg_data, save_rpg_data } = require("../../utils/file.js");
                    // const { get_emoji } = require("../../utils/rpg.js");

                    // await interaction.deferUpdate();
                    // const emoji_tick = await get_emoji("Tick", client);
                    // const emoji_cross = await get_emoji("crosS", client);
                    // const embed = new EmbedBuilder()
                    //     .setColor(embed_default_color)
                    //     .setTitle(`${emoji_tick} | 語言設定成功`)
                    //     .setDescription(`你已成功設定語言為 ${client.available_languages[language]}`)
                    //     .setEmbedFooter(interation);

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
                    break;
                };
                case "rpg_privacy_menu": {
                    await interaction.deferUpdate();

                    const [_, userId] = interaction.customId.split("|");

                    const rpg_data = load_rpg_data(userId);

                    const [emoji_shield, emoji_backpack, emoji_pet] = await Promise.all(
                        ["shield", "bag", "pet"].map(async (name) => {
                            return await get_emoji(name, client);
                        }),
                    );

                    const privacy = interaction.values;
                    rpg_data.privacy = privacy;
                    rpg_data.privacy.sort((a, b) => {
                        const order = {
                            [PrivacySettings.Money]: 0,
                            [PrivacySettings.Inventory]: 1,
                            [PrivacySettings.Partner]: 2
                        };
                        return order[a] - order[b];
                    });

                    save_rpg_data(userId, rpg_data);

                    let text = "無";
                    if (rpg_data.privacy.length > 0) {
                        text = rpg_data.privacy
                            .join("、")
                            .replace(PrivacySettings.Money, "金錢")
                            .replace(PrivacySettings.Inventory, "背包")
                            .replace(PrivacySettings.Partner, "夥伴");
                    };

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_shield} | 隱私權設定`)
                        .setDescription(`
為保護每個人的隱私，可以透過下拉選單來設定 **允許被公開的** 資訊

目前的設定為：\`${text}\``)
                        .setEmbedFooter(interaction);

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId(`rpg_privacy_menu|${userId}`)
                        .setPlaceholder("選擇要允許的項目")
                        .setMinValues(0)
                        .setMaxValues(3)
                        .addOptions([
                            {
                                label: "金錢",
                                description: "擁有的金錢數量、交易記錄",
                                value: PrivacySettings.Money,
                                emoji: "💰",
                                default: rpg_data.privacy.includes(PrivacySettings.Money),
                            },
                            {
                                label: "背包",
                                description: "背包內的物品",
                                value: PrivacySettings.Inventory,
                                emoji: emoji_backpack,
                                default: rpg_data.privacy.includes(PrivacySettings.Inventory),
                            },
                            {
                                label: "夥伴",
                                description: "夥伴的清單",
                                value: PrivacySettings.Partner,
                                emoji: emoji_pet,
                                default: rpg_data.privacy.includes(PrivacySettings.Partner),
                            }
                        ]);

                    const row = new ActionRowBuilder()
                        .addComponents(selectMenu);

                    return await interaction.editReply({ embeds: [embed], components: [row] });
                    break;
                };
                case "choose_command": {
                    await interaction.deferUpdate();

                    const [_, __, command] = interaction.customId.split("|");

                    const message = new MockMessage(`${prefix}${command}`, interaction.channel, interaction.user, interaction.guild);
                    let response = await rpg_handler({ client: client, message, d: true, mode: 1 });
                    if (!response) return;

                    response.components ??= [];

                    await interaction.editReply(response);
                    break;
                };
                case "ls": {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                    const [_, userId] = interaction.customId.split("|");
                    const message = new MockMessage(`${prefix}ls`, interaction.message.channel, interaction.user, interaction.guild);
                    const res = await ls_function({
                        client: client,
                        message,
                        rpg_data: load_rpg_data(userId),
                        mode: 1,
                        PASS: true,
                        interaction: interaction
                    });


                    await interaction.followUp(res);
                    break;
                };
                case "sell": {
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

                    const emoji_trade = await get_emoji("trade", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_trade} | 成功售出了 ${amount} 個 ${get_name_of_id(item_id)}`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "cancel": {
                    await interaction.deferUpdate();

                    const emoji_cross = await get_emoji("crosS", client);

                    const [_, __, special = null] = interaction.customId.split("|");

                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 操作取消`)
                        .setEmbedFooter(interaction);

                    if (special) {
                        const data = special_cancel[special];
                        if (data) {
                            const title = data.title ?? null;
                            const description = data.description ?? null;

                            // 把title和description中的{xxx}改成await get_emoji(xxx, client)
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

                            title = await replaceAsync(title, regex, async (match, p1) => await get_emoji(p1, client));
                            description = await replaceAsync(description, regex, async (match, p1) => await get_emoji(p1, client));

                            embed.setTitle(title);
                            embed.setDescription(description);
                        };
                    };

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "buy":
                case "buyc": {
                    let [_, buyerUserId, targetUserId, amount, price, item] = interaction.customId.split("|");

                    await interaction.deferUpdate();

                    const isConfirm = interactionCategory === "buyc";

                    amount = parseInt(amount);
                    price = parseInt(price);

                    const emoji_cross = await get_emoji("crosS", client);
                    const emoji_store = await get_emoji("store", client);

                    const buyerRPGData = load_rpg_data(buyerUserId);
                    const targetUserRPGData = load_rpg_data(targetUserId);
                    const targetUserShopData = load_shop_data(targetUserId);

                    const item_data = targetUserShopData.items[item];

                    if (!item_data) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 沒有販賣這個物品`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ embeds: [embed], components: [] });
                    };

                    if (item_data.amount < amount) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 沒有販賣那麼多物品`)
                            .setEmbedFooter(interaction);

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

                    if (!buyerRPGData.inventory[item]) buyerRPGData.inventory[item] = 0;
                    buyerRPGData.inventory[item] += amount;

                    targetUserRPGData.money = add_money({
                        rpg_data: targetUserRPGData,
                        amount: total_price,
                        originalUser: `<@${buyerUserId}>`,
                        targetUser: `<@${targetUserId}>`,
                        type: `購買物品付款`,
                    });

                    if (!targetUserShopData.items[item].amount) targetUserShopData.items[item].amount = 0;
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
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "oven_bake": {
                    await interaction.deferUpdate();

                    // oven_bake|${userId}|${item_id}|${amount}|${coal_amount}|${duration}|${session_id}
                    const [_, userId, session_id] = interaction.customId.split("|");

                    // 從全域變數中取得 oven_bake 資料
                    const oven_bake = client.oven_sessions.get(session_id);
                    if (!oven_bake) {
                        const emoji_cross = await get_emoji("crosS", client);
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 烘烤會話已過期`)
                            .setDescription(`請重新執行烘烤指令`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ embeds: [embed], components: [] });
                    };

                    const { item_id, amount, coal_amount, duration, item_need } = oven_bake;

                    // 確保所有數值都被正確解析為整數
                    const parsedAmount = parseInt(amount);
                    const parsedCoalAmount = parseInt(coal_amount);
                    const parsedDuration = parseInt(duration);

                    let rpg_data = load_rpg_data(userId)
                    let bake_data = load_bake_data();

                    if (bake_data[userId] && bake_data[userId].length >= oven_slots) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你的烤箱已經滿了`)
                            .setEmbedFooter(interaction);

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

                        const embed = await notEnoughItemEmbed(items, interaction, client);

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
                    client.oven_sessions.delete(session_id);

                    const emoji_drumstick = await get_emoji("drumstick", client);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_drumstick} | 成功放進烤箱烘烤 ${parsedAmount} 個 ${name[item_id]}`)
                        .setDescription(`等待至 <t:${end_time}:R>`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "smelter_smelt": {
                    await interaction.deferUpdate();

                    const [_, userId, item_id, amount, coal_amount, duration, output_amount, session_id] = interaction.customId.split("|");
                    const emoji_cross = await get_emoji("crosS", client);

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
                            .setEmbedFooter(interaction);

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
                                item: get_name_of_id(current_item_id),
                                amount: need_amount - have_amount,
                            });
                        };
                    };

                    if (item_missing.length > 0) {
                        const embed = await notEnoughItemEmbed(item_missing, interaction, client);

                        return await interaction.editReply({ embeds: [embed] });
                    };
                    // ==================檢查物品==================

                    for (const need_item of item_need) {
                        rpg_data.inventory[need_item.item] -= need_item.amount;
                    };

                    save_rpg_data(userId, rpg_data)

                    const output_item_id = smeltable_recipe.find(a => a.input.item === item_id).output;
                    const end_time = Math.floor(Date.now() / 1000) + parsedDuration;

                    let smelt_data = load_smelt_data();

                    if (!smelt_data[userId]) {
                        smelt_data[userId] = [];
                    };

                    if (smelt_data[userId].length >= smelter_slots) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`)
                            .setEmbedFooter(interaction);

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

                    const emoji_furnace = await get_emoji("furnace", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_furnace} | 成功放進煉金爐內`)
                        .setDescription(`等待至 <t:${end_time}:R>`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                };
                case "marry_accept": {
                    await interaction.deferUpdate();

                    const emoji_cross = await get_emoji("crosS", client);
                    const emoji_check = await get_emoji("check", client);

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
                                .setEmbedFooter(interaction);

                            return await interaction.editReply({ embeds: [embed] });
                        } else {
                            const embed = new EmbedBuilder()
                                .setColor(embed_error_color)
                                .setTitle(`${emoji_cross} | 還敢偷找小三!`)
                                .setEmbedFooter(interaction);

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
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ content: "", embeds: [embed], components: [] });
                    break;
                };
                case "divorce": {
                    const [_, userId, with_UserId] = interaction.customId.split("|");

                    const marry_default_value = find_default_value("rpg_database.json")?.["marry"] ?? {};

                    await interaction.deferReply();

                    const emoji_cross = await get_emoji("crosS", client);

                    const rpg_data = load_rpg_data(userId);
                    const with_User_rpg_data = load_rpg_data(with_UserId);

                    const marry_data = rpg_data.marry ?? {};
                    const married = marry_data.married ?? false;

                    if (!married) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你還沒有結過婚ㄝ`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ embeds: [embed] });
                    };

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_cross} | 歐不`)
                        .setDescription(`<@${userId}> 和 <@${with_UserId}> 的婚姻關係已經結束了 :((`)
                        .setEmbedFooter(interaction);

                    rpg_data.marry = marry_default_value;
                    with_User_rpg_data.marry = marry_default_value;

                    save_rpg_data(userId, rpg_data);
                    save_rpg_data(with_UserId, with_User_rpg_data);

                    if (mode === 1) return { embeds: [embed] };
                    return await interaction.editReply({ embeds: [embed] });
                };
                case "job_transfer": {
                    const emoji_job = await get_emoji("job", client);

                    const delay_embed = await job_delay_embed(user.id, interaction, client);
                    if (delay_embed) {
                        if (!interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                        return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor(embed_job_color)
                            .setTitle(`${emoji_job} | 請選擇你要轉職的職業`)
                            .setDescription("轉職後一個禮拜不能更動職業!")
                            .setEmbedFooter(interaction);

                        const rows = await choose_job_row(user.id);

                        return await interaction.update({ embeds: [embed], components: rows });
                    };
                };
                case "job_choose": {
                    if (!interaction.isStringSelectMenu()) return;

                    const emoji_job = await get_emoji("job", client);

                    const job = interaction.values[0];
                    const job_name = jobs?.[job]?.name;

                    const delay_embed = await job_delay_embed(user.id, interaction, client);
                    if (delay_embed) {
                        return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });
                    };

                    const embed = new EmbedBuilder()
                        .setColor(embed_job_color)
                        .setTitle(`${emoji_job} | 確認轉職通知`)
                        .setDescription(`請確認將轉職為 ${job_name}，轉職後七天內不可更動！`)
                        .setEmbedFooter(interaction);

                    const confirm_button = new ButtonBuilder()
                        .setCustomId(`job_confirm|${user.id}|${job}`)
                        .setLabel("我確定")
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder()
                        .addComponents(confirm_button);

                    return await interaction.update({ embeds: [embed], components: [row] });
                };
                case "job_confirm": {
                    const [_, __, job] = interaction.customId.split("|");
                    const job_name = jobs?.[job]?.name;

                    const emoji_job = await get_emoji("job", client);

                    const delay_embed = await job_delay_embed(user.id, interaction, client);
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
                        .setEmbedFooter(interaction);

                    return await interaction.update({ embeds: [embed], components: [] });
                };
                case "play-s": {
                    // 下拉式選單
                    await interaction.deferUpdate();

                    if (!global._sc) {
                        global._sc = new Soundcloud();
                    };

                    const queue = getQueue(interaction.guildId);

                    // 連接到語音頻道
                    if (!getVoiceConnection(interaction.guildId)) {
                        const voiceChannel = interaction.member.voice.channel;

                        const emoji_cross = await get_emoji("crosS", client);

                        if (!voiceChannel) {
                            const error_embed = new EmbedBuilder()
                                .setColor(embed_error_color)
                                .setTitle(`${emoji_cross} | 你需要先進到一個語音頻道`)
                                .setDescription("若你已經在一個語音頻道，請確認我有權限看的到頻道，或是退出再重新加入一次語音頻道")
                                .setEmbedFooter(interaction);

                            return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
                        };

                        const voiceConnection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: interaction.guildId,
                            selfDeaf: true,
                            selfMute: false,
                            adapterCreator: interaction.guild.voiceAdapterCreator,
                        });

                        queue.connection = voiceConnection;
                        queue.voiceChannel = voiceChannel;
                        queue.textChannel = interaction.channel;

                    };

                    if (!queue.textChannel && interaction.channel) queue.textChannel = interaction.channel;
                    queue.subscribe();

                    saveQueue(interaction.guildId, queue);

                    const [trackSessionID, trackID] = interaction.values[0].split("|");
                    const trackSession = client.musicTrackSession.get(trackSessionID)?.[trackID]?.[0];

                    if (!trackSession) {
                        const emoji_cross = await get_emoji("crosS", client);
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 音樂會話已過期`)
                            .setDescription(`請重新執行播放指令`)
                            .setEmbedFooter(interaction);

                        return await interaction.followUp({ content: "", embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
                    };

                    client.musicTrackSession.delete(trackSessionID);

                    const { track, source, next, useStream = false } = trackSession;

                    queue.addTrack(track, next ? 0 : null);

                    const [embed, rows] = await getNowPlayingEmbed(queue, interaction, client, true);

                    if (!queue.isPlaying()) {
                        await queue.play(track);
                    };

                    return await interaction.editReply({ content: "", embeds: [embed], components: rows });
                };
                case "refresh": {
                    const [_, feature] = otherCustomIDs;

                    switch (feature) {
                        case "/info bot": {
                            const embed = await getBotInfoEmbed(locale, client);

                            await interaction.update({ embeds: [embed] });
                            break;
                        };
                        case "/farm info": {
                            const [embed, row] = await get_farm_info_embed(user, interaction, client);

                            await interaction.update({ embeds: [embed], components: [row] });
                            break;
                        };
                        case "music": {
                            const emoji_music = await get_emoji("music", client);
                            const queue = getQueue(interaction.guildId, true);

                            const [embed, rows] = await getNowPlayingEmbed(queue, interaction, client);

                            await interaction.update({ content: `${emoji_music} | 正在播放`, embeds: [embed], components: rows });
                            break;
                        }
                    };

                    break;
                };
                case "music": {
                    const [_, feature, options = null] = otherCustomIDs;

                    const guildId = interaction.guildId;
                    const queue = getQueue(guildId, true);

                    if (!queue.isPlaying()) { // 沒有音樂正在播放
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 沒有音樂正在播放`)
                            .setEmbedFooter(interaction);

                        return await interaction.update({ embeds: [embed], ephemeral: true });
                    };

                    switch (feature) {
                        case "pause": {
                            if (queue.isPaused()) {
                                const emoji_play = await get_emoji("play", client);

                                // 繼續播放
                                await Promise.all([
                                    queue.unpause(),
                                    interaction.update({ content: `${emoji_play} | \`${user.username}\` 繼續播放音樂`, embeds: [] }),
                                ]);
                            } else {
                                const emoji_pause = await get_emoji("pause", client);

                                // 暫停播放
                                await Promise.all([
                                    queue.pause(),
                                    interaction.update({ content: `${emoji_pause} | \`${user.username}\` 暫停了音樂`, embeds: [] }),
                                ]);
                            };
                        };

                        case "skip": {
                            if (!queue.currentTrack) return;
                            const currentTrack = queue.currentTrack;

                            const emoji_skip = await get_emoji("skip", client);

                            await Promise.all([
                                queue.nextTrack(),
                                interaction.update({ content: `${emoji_skip} | \`${user.username}\` 跳過了 \`${currentTrack.title}\``, embeds: [] }),
                            ]);
                        };

                        case "shuffle": {
                            const emoji_shuffle = await get_emoji("shuffle", client);

                            await Promise.all([
                                queue.shuffle(),
                                interaction.update({ content: `${emoji_shuffle} | \`${user.username}\` 隨機排序了音樂佇列`, embeds: [] }),
                            ]);
                        };

                        case "loop": {
                            const currentLoopStatus = queue.loopStatus;
                            const emoji_loop = await get_emoji("loop", client);

                            const translate = {
                                [loopStatus.DISABLED]: "關閉",
                                [loopStatus.TRACK]: "單曲",
                                [loopStatus.ALL]: "全部",
                                [loopStatus.AUTO]: "自動推薦",
                            };

                            const nextLoopStatus = (currentLoopStatus + 1) > (loopStatus.length - 1)
                                ? 0
                                : (currentLoopStatus + 1);

                            await Promise.all([
                                queue.setLoopStatus(nextLoopStatus),
                                interaction.update({ content: `${emoji_loop} | \`${user.username}\` 把重複的狀態更改為 \`${translate[nextLoopStatus]}\` `, embeds: [] }),
                            ]);

                            break;
                        };

                        case "trending": {
                            switch (options) {
                                case "on": {
                                    const emoji_trending = await get_emoji("trending", client);

                                    await Promise.all([
                                        queue.setLoopStatus(loopStatus.AUTO),
                                        interaction.update({ content: `${emoji_trending} | \`${user.username}\` 啟用了自動推薦功能，將會在歌曲結束後推薦下一首音樂` }),
                                    ]);

                                    break;
                                };

                                case "off": {
                                    const emoji_trending = await get_emoji("trending", client);

                                    await Promise.all([
                                        queue.setLoopStatus(loopStatus.DISABLED),
                                        interaction.update({ content: `${emoji_trending} | \`${user.username}\` 關閉了自動推薦功能` }),
                                    ]);

                                    break;
                                };
                            };

                            break;
                        };

                        case "disconnect": {
                            const emoji_wumpusWave = await get_emoji("wumpusWave", client);

                            await Promise.all([
                                queue.destroy(),
                                interaction.update({ content: `${emoji_wumpusWave} | \`${user.username}\` 讓我離開語音頻道`, embeds: [] }),
                            ]);

                            break;
                        };
                    };

                    break;
                };
            };
        } catch (err) {
            const { get_loophole_embed } = require("../../utils/rpg.js");

            const errorStack = util.inspect(err, { depth: null });

            logger.error(errorStack);

            const loophole_embeds = await get_loophole_embed(errorStack, interaction, client);

            if (!interaction.deferred) await interaction.deferReply();
            await interaction.followUp({ embeds: loophole_embeds, flags: MessageFlags.Ephemeral });
        };
    },
    get_help_embed,
    get_help_command,
};