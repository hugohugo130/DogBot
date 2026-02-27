const { getVoiceConnection, joinVoiceChannel } = require("@discordjs/voice");
const { Events, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ActionRow, User, ButtonStyle, ButtonBuilder, ButtonInteraction, StringSelectMenuInteraction, BaseInteraction, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, DMChannel, Message, PartialGroupDMChannel, StageChannel, VoiceChannel, TextChannel, ThreadChannel } = require("discord.js");
const util = require("util");

const {
    get_logger,
} = require("../../utils/logger.js");
const {
    load_shop_data,
    save_shop_data,
    load_rpg_data,
    save_rpg_data,
    load_bake_data,
    save_bake_data,
    load_smelt_data,
    save_smelt_data,
    find_default_value,
} = require("../../utils/file.js");
const {
    job_delay_embed,
    choose_job_row,
    get_name_of_id,
    get_emoji,
    add_money,
    remove_money,
    userHaveNotEnoughItems,
    notEnoughItemEmbed,
    firstPrefix,
    ls_function,
    get_loophole_embed,
    bake,
    smeltable_recipe,
    name,
    smelter_slots,
    oven_slots,
    get_emojis,
    get_id_of_name,
    get_fightjob_name,
    get_job_name,
} = require("../../utils/rpg.js");
const {
    get_farm_info_embed,
} = require("../../slashcmd/game/rpg/farm.js");
const {
    getNowPlayingEmbed,
} = require("../../slashcmd/music/nowplaying.js");
const {
    getQueue,
    noMusicIsPlayingEmbed,
    youHaveToJoinVC_Embed,
    loopStatus,
} = require("../../utils/music/music.js");
const {
    embed_default_color,
    embed_error_color,
    embed_job_color,
    cookBurntOverTime,
    cookBurntWeight,
    jobs,
    PrivacySettings,
    cookClickAmount,
    embed_sign_color,
    fightjobs,
} = require("../../utils/config.js");
const {
    getQueueListEmbedRow
} = require("../../slashcmd/music/queue.js");
const {
    get_channel
} = require("../../utils/discord.js");
const {
    getRandomBooleanWithWeight
} = require("../../utils/random.js");
const {
    getCookingContainer,
    getCookingResultContainer,
} = require("../../slashcmd/game/rpg/cook.js");
const {
    getBotInfoEmbed,
} = require("../../slashcmd/info.js");
const {
    get_lang_data,
} = require("../../utils/language.js");
const {
    wait_for_client,
} = require("../../utils/wait_for_client.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

const logger = get_logger();

/**
 *
 * @param {string} userid
 * @returns {Promise<string>}
 */
async function show_transactions(userid) {
    const { transactions = [] } = await load_rpg_data(userid);

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

/**
 *
 * @param {BaseInteraction} interaction
 * @returns {Promise<EmbedBuilder>}
 */
async function get_transaction_embed(interaction) {
    const userid = interaction.user.id;
    const username = interaction.user.username;

    const transactions = await show_transactions(userid);
    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setAuthor({
            name: `${username} 的交易紀錄`,
            iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(transactions || "- 沒有交易紀錄")
        .setTimestamp();

    return embed;
};

/**
 *
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function get_failed_embed(interaction = null, client = global._client) {
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
            "cd": {
                emoji: "timer",
                desc: "查看各工作的冷卻時間",
                usage: [
                    {
                        name: "查看冷卻時間",
                        value: "&cd"
                    }
                ],
                format: "{cmd}",
            },
            "cdd": {
                emoji: "timer",
                desc: "查看各工作的冷卻時間 (更簡略)",
                usage: [
                    {
                        name: "查看冷卻時間",
                        value: "&cdd"
                    }
                ],
                format: "{cmd}",
            },
            "daily": {
                emoji: "calendar",
                desc: "每日簽到",
                usage: [
                    {
                        name: "每日簽到獲得金錢",
                        value: "&daily"
                    }
                ],
                format: "{cmd}",
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
            "feed": {
                emoji: "food",
                desc: "餵食寵物或是結婚的對象增加他的飽食度",
                usage: [
                    {
                        name: "餵{author}吃 2 個牛肉",
                        value: "&feed @{author} beef 2"
                    },
                    {
                        name: "自己吃一個麵包",
                        value: "&eat bread"
                    },
                    {
                        name: "查看你還有多少食物",
                        value: "&food"
                    }
                ],
                format: "{cmd} <寵物標記> <食物ID> [數量]",
            },
            "fell": {
                emoji: "wood",
                desc: "伐木工砍伐木頭使用",
                usage: [],
                format: "{cmd}",
            },
            "fightjob": {
                emoji: "job",
                desc: "選擇冒險職業",
                usage: [],
                format: "{cmd}",
            },
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
            "top": {
                emoji: "top",
                desc: "金錢排行榜",
                usage: [
                    {
                        name: "顯示金錢排行榜",
                        value: "&top"
                    }
                ],
                format: "{cmd}",
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
        },
        special: {

        },
        dev: {

        },
    },
};

/** @type {{ [key: string]: {title?: string, description?: string}}} */
const special_cancel = {
    marry: {
        title: "{crosS} 求婚被拒絕了",
    },
};

/**
 * @typedef GuideCommandData
 * @property {string | null} emoji
 * @property {string} desc
 * @property {{ name: string, value: string }[]} usage
 * @property {string} format
 */

const VALID_GUIDE_CATEGORIES = /** @type {const} */ (["general", "music", "rpg", "special", "dev"]);

/**
 * @typedef {typeof VALID_GUIDE_CATEGORIES[number]} ValidGuideCategory
 */

/**
 * 檢查字串是否為有效的 guide category
 * @param {string} value
 * @returns {value is ValidGuideCategory}
 */
function isValidGuideCategory(value) {
    return value in VALID_GUIDE_CATEGORIES;
};

function check_help_rpg_info() {
    const { rpg_commands, redirect_data } = require("./msg_handler.js");

    const commandsWithHelpInfo = Object.keys(help.group.rpg);
    const commands = Object.keys(rpg_commands)
        .filter(e => !["help", ...Object.keys(redirect_data), ...commandsWithHelpInfo].includes(e))

    for (const cmd of commands) {
        logger.warn(`&${cmd} 缺少使用說明 (&help) 的數據`);
    };
};

/**
 * Get the embed of guile information of a category
 * @param {ValidGuideCategory} category
 * @param {User} user
 * @param {DogClient} client
 * @param {BaseInteraction | null} [interaction=null]
 * @returns {[EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder> | null]}
 */
function get_help_embed(category, user, client, interaction = null) {
    if (!(category in help.group)) throw new Error(`${category} is not a valid category`);

    const options = Object.entries(help.group[category])
        .flatMap(([name, data]) => {
            return [{
                label: name,
                description: data.desc,
                value: name,
            }];
        });

    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(help.name[category])
        .setEmbedFooter(interaction)
        .setEmbedAuthor(client);

    if (options.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`help|${user.id}|${category}`)
            .setPlaceholder(`指令教學`)
            .addOptions(...options);

        const row =
            /** @type {ActionRowBuilder<StringSelectMenuBuilder>} */
            (new ActionRowBuilder()
                .setComponents(selectMenu));

        return [embed, row];
    };

    return [embed, null];
};

/**
 * Get the embed of guile information of command
 * @param {ValidGuideCategory} category
 * @param {string} command_name
 * @param {string} guildID
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder | null>}
 */
async function get_help_command(category, command_name, guildID, interaction = null, client = global._client) {
    const { find_redirect_targets_from_id } = require("./msg_handler.js");

    if (!(category in help.group)) throw new Error(`${category} is not a valid category`);

    /** @type {GuideCommandData | null} */
    const command_data = command_name in help.group[category]
        // @ts-ignore
        ? help.group[category][command_name]
        : null;

    if (!command_data) return null;

    if (!client) client = await wait_for_client();
    const prefix = await firstPrefix(guildID);

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
    const usage = command_data.usage?.length
        ? command_data.usage.map((info, i) => {
            const value = info.value
                .replace(/{author}/g, client.author)
                .replace("&", prefix);

            const name = info.name
                .replace(/{author}/g, client.author)
                .replace("&", prefix);

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
     * @returns {Promise<any>}
     */
    execute: async function (client, interaction) {
        try {
            const { rpg_handler, MockMessage } = require("./msg_handler.js");

            const { user, guild, channel, locale, message } = interaction;

            if (client.get_user_locale(user.id) !== locale) {
                client.save_user_locale(user.id, locale);
            };

            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

            const [interactionCategory, originalUserId, ...otherCustomIDs] = interaction.customId.split("|");

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

            setImmediate(() => {
                logger.info(`${user.username}${user.globalName ? `(${user.globalName})` : ""} 正在觸發互動(rpg_interactions): ${interaction.customId}，訊息ID: ${interaction.message?.id}`)
            });

            switch (interactionCategory) {
                case "rpg_transaction": {
                    const [_, embed] = await Promise.all([
                        interaction.deferUpdate(),
                        get_transaction_embed(interaction),
                    ]);

                    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
                    break;
                }
                case "help": {
                    const [category, cmd = null] = otherCustomIDs;

                    if (!(interaction instanceof StringSelectMenuInteraction) || !guild) return;

                    await interaction.deferUpdate();

                    const choseValue = interaction.values[0];

                    let embed = null;

                    let row = null;

                    if (category) {
                        if (!isValidGuideCategory(category)) throw new Error(`${category} is not a valid guide category`);

                        embed = await get_help_command(category, choseValue || cmd || "buy", guild.id);
                    } else {
                        if (!isValidGuideCategory(choseValue)) throw new Error(`${category} is not a valid guide category`);

                        [embed, row] = get_help_embed(choseValue, user, client, interaction);
                    };

                    await interaction.followUp({
                        embeds: embed ? [embed] : [],
                        components: row ? [row] : [],
                        flags: MessageFlags.Ephemeral,
                    });
                    break;
                }
                case "pay_confirm": {
                    const [targetUserId, amount_str] = otherCustomIDs;

                    const [_, rpg_data, target_user_rpg_data, [emoji_cross, emoji_top]] = await Promise.all([
                        interaction.deferUpdate(),
                        load_rpg_data(user.id),
                        load_rpg_data(targetUserId),
                        get_emojis(["crosS", "top"], client),
                    ]);

                    /** @type {number}*/
                    const amount = parseInt(amount_str);

                    if (rpg_data.money < amount) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 歐不!`)
                            .setDescription(`你還差 \`${(amount - rpg_data.money).toLocaleString()}$\``)
                            .setEmbedFooter(interaction);

                        return await message.reply({ embeds: [embed] });
                    };

                    rpg_data.money = remove_money({
                        rpg_data,
                        amount: amount,
                        originalUser: `<@${user.id}>`,
                        targetUser: `<@${targetUserId}>`,
                        type: `付款給`,
                    });

                    target_user_rpg_data.money = add_money({
                        rpg_data: target_user_rpg_data,
                        amount: amount,
                        originalUser: `<@${user.id}>`,
                        targetUser: `<@${targetUserId}>`,
                        type: `付款給`,
                    });

                    await Promise.all([
                        save_rpg_data(user.id, rpg_data),
                        save_rpg_data(targetUserId, target_user_rpg_data),
                    ]);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_top} | 付款成功`)
                        .setDescription(`你已成功付款 \`${amount.toLocaleString()}$\` 給 <@${targetUserId}>`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                }
                case "setLang": {
                    // await interaction.deferUpdate();
                    // const emoji_tick = await get_emoji("Tick", client);
                    // const emoji_cross = await get_emoji("crosS", client);
                    // const embed = new EmbedBuilder()
                    //     .setColor(embed_default_color)
                    //     .setTitle(`${emoji_tick} | 語言設定成功`)
                    //     .setDescription(`你已成功設定語言為 ${client.available_languages[language]}`)
                    //     .setEmbedFooter(interation);

                    // const language = customIdParts[2];
                    // const rpg_data = await load_rpg_data(interaction.user.id);
                    // if (rpg_data.language != language) {
                    //     rpg_data.language = language;
                    //     await save_rpg_data(interaction.user.id, rpg_data);
                    // } else {
                    //     embed.setColor(embed_error_color);
                    //     embed.setTitle(`${emoji_cross} | 語言一樣`);
                    //     embed.setDescription(`你選擇的語言和現在的語言一樣 :|`);
                    // };

                    // await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                }
                case "rpg_privacy_menu": {
                    if (!(interaction instanceof StringSelectMenuInteraction)) return;

                    const [_, rpg_data, [emoji_shield, emoji_backpack, emoji_pet]] = await Promise.all([
                        interaction.deferUpdate(),
                        load_rpg_data(user.id),
                        get_emojis(["shield", "bag", "pet"], client),
                    ]);

                    const privacy = interaction.values;

                    rpg_data.privacy = privacy;
                    rpg_data.privacy.sort((a, b) => {
                        /** @type {{[key: string]: number}} */
                        const order = {
                            [PrivacySettings.Money]: 0,
                            [PrivacySettings.Inventory]: 1,
                            [PrivacySettings.Partner]: 2
                        };

                        return order[a] - order[b];
                    });

                    await save_rpg_data(user.id, rpg_data);

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
                        .setCustomId(`rpg_privacy_menu|${user.id}`)
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

                    const row = /** @type {ActionRowBuilder<StringSelectMenuBuilder>} */
                        (new ActionRowBuilder()
                            .addComponents(selectMenu));

                    return await interaction.editReply({ embeds: [embed], components: [row] });
                }
                case "choose_command": {
                    const [command] = otherCustomIDs;

                    if (!guild || channel instanceof DMChannel) return;

                    const [_, prefix] = await Promise.all([
                        interaction.deferUpdate(),
                        firstPrefix(guild.id),
                    ]);

                    const message = new MockMessage(`${prefix}${command}`, channel, user, guild);
                    let response = await rpg_handler({ client: client, message, d: true, mode: 1 });
                    if (!response || response instanceof Message) return;

                    response.components ??= [];

                    await interaction.editReply(response);
                    break;
                }
                case "ls": {
                    if (!guild) return;

                    const [_, prefix, rpg_data] = await Promise.all([
                        interaction.deferReply({ flags: MessageFlags.Ephemeral }),
                        firstPrefix(guild.id),
                        load_rpg_data(user.id),
                    ]);

                    const message = new MockMessage(`${prefix}ls`, channel, interaction.user, interaction.guild);
                    const res = await ls_function({
                        client: client,
                        message,
                        rpg_data,
                        mode: 1,
                        PASS: true,
                        interaction,
                    });

                    if (res instanceof Message) return;

                    await interaction.followUp(res);
                    break;
                }
                case "sell": {
                    const [_, rpg_data] = await Promise.all([
                        interaction.deferUpdate(),
                        load_rpg_data(user.id),
                    ]);

                    const [item_id, amount_str, total_price_str] = otherCustomIDs;

                    const amount = parseInt(amount_str);
                    const total_price = Math.round(parseFloat(total_price_str));

                    rpg_data.inventory[item_id] -= amount;
                    rpg_data.money = add_money({
                        rpg_data,
                        amount: total_price,
                        originalUser: "系統",
                        targetUser: `<@${user.id}>`,
                        type: "出售物品所得",
                    })

                    const emoji_trade = await Promise.all([
                        get_emoji("trade", client),
                        save_rpg_data(user.id, rpg_data),
                    ]);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_trade} | 成功售出了 ${amount} 個 ${get_name_of_id(item_id)}`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ content: "", embeds: [embed], components: [] });
                    break;
                }
                case "cancel": {
                    const emoji_cross = await get_emoji("crosS", client);

                    const [special = null] = otherCustomIDs;

                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 操作取消`)
                        .setEmbedFooter(interaction);

                    const data = special
                        ? special_cancel[special]
                        : null;

                    if (data) {
                        let title = data.title ?? null;
                        let description = data.description ?? null;

                        // 把title和description中的{xxx}改成await get_emoji(xxx, client)
                        const regex = /\{([^}]+)\}/g;

                        /**
                         *
                         * @param {string} str
                         * @param {RegExp | string} regex
                         * @param {(substring: string, ...args: any[]) => string | Promise<string>} replacer
                         * @returns {Promise<string>}
                         */
                        const replaceAsync = async (str, regex, replacer) => {
                            /** @type {(Promise<any> | any)[]} */
                            const promises = [];

                            str.replace(regex, (match, p1) => {
                                promises.push(replacer(match, p1));
                                return match;
                            });

                            const replacements = await Promise.all(promises);
                            return str.replace(regex, () => replacements.shift());
                        };

                        if (title) title = await replaceAsync(title, regex, async (match, p1) => await get_emoji(p1, client));
                        if (description) description = await replaceAsync(description, regex, async (match, p1) => await get_emoji(p1, client));

                        embed.setTitle(title);
                        embed.setDescription(description);
                    };

                    await interaction.update({ embeds: [embed], components: [] });
                    break;
                }
                case "buy":
                case "buyc": {
                    let [buyerUserId, targetUserId, amount_str, price_str, item] = otherCustomIDs;

                    await interaction.deferUpdate();

                    const isConfirm = interactionCategory === "buyc";

                    const amount = parseInt(amount_str);
                    const price = parseInt(price_str);

                    const [[emoji_cross, emoji_store], buyerRPGData, targetUserRPGData, targetUserShopData] = await Promise.all([
                        get_emojis(["crosS", "store"], client),
                        load_rpg_data(buyerUserId),
                        load_rpg_data(targetUserId),
                        load_shop_data(targetUserId),
                    ]);

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

                    await Promise.all([
                        save_rpg_data(buyerUserId, buyerRPGData),
                        save_rpg_data(targetUserId, targetUserRPGData),
                        save_shop_data(targetUserId, targetUserShopData),
                    ]);

                    if (isConfirm) await interaction.followUp({
                        content: `${emoji_store} | 你同意了 <@${buyerUserId}> 以 \`${total_price}$\` 購買 ${item_name} \`x${amount}\` 的交易`,
                        flags: MessageFlags.Ephemeral,
                    });

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 購買成功`)
                        .setDescription(`你購買了 ${item_name} \`x${amount.toLocaleString()}\`，花費 \`${(total_price).toLocaleString()}$\`${isConfirm ? "，\n經店家同意" : ""}`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                }
                case "oven_bake": {
                    await interaction.deferUpdate();

                    const [session_id] = otherCustomIDs;;

                    // 從全域變數中取得 oven_bake 資料
                    const oven_bake = client.oven_sessions.get(session_id);
                    if (!oven_bake) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const error_embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 烘烤會話已過期`)
                            .setDescription(`請重新執行烘烤指令`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ content: "", embeds: [error_embed], components: [] });
                    };

                    const { item_id, amount, coal_amount, duration, item_need, userId: _userId } = oven_bake;

                    if (user.id !== _userId) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const error_embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 這不是你的烘烤會話`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ content: "", embeds: [error_embed], components: [] });
                    };

                    let [rpg_data, bake_data] = await Promise.all([
                        load_rpg_data(user.id),
                        load_bake_data(user.id),
                    ]);

                    if (!bake_data) bake_data = [];

                    if (bake_data?.length && bake_data.length >= oven_slots) {
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
                                name: get_name_of_id(current_item_id),
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

                    const output_item_id = bake[item_id];
                    const end_time = Math.floor(Date.now() / 1000) + duration;

                    bake_data.push({
                        userId: user.id,
                        item_id,
                        amount,
                        coal_amount,
                        end_time,
                        output_item_id,
                    });

                    const [_, __, emoji_drumstick] = await Promise.all([
                        save_rpg_data(user.id, rpg_data),
                        save_bake_data(user.id, bake_data),
                        get_emoji("drumstick", client),
                    ]);

                    // 清理 session 資料
                    client.oven_sessions.delete(session_id);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_drumstick} | 成功放進烤箱烘烤 ${amount} 個 ${get_name_of_id(item_id)}`)
                        .setDescription(`等待至 <t:${end_time}:R>`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                }
                case "smelter_smelt": {
                    const [item_id, amount, coal_amount, duration, output_amount, session_id] = otherCustomIDs;
                    const [_, rpg_data, smelt_data, emoji_cross] = await Promise.all([
                        interaction.deferUpdate(),
                        load_rpg_data(user.id),
                        load_smelt_data(user.id),
                        get_emoji("crosS", client),
                    ]);

                    // 確保所有數值都被正確解析為整數
                    const parsedAmount = parseInt(amount);
                    const parsedCoalAmount = parseInt(coal_amount);
                    const parsedDuration = parseInt(duration);

                    // 從全域變數中取得 item_need 資料
                    const item_need = client.smelter_sessions.get(session_id);
                    if (!item_need) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 熔鍊會話已過期`)
                            .setDescription(`請重新執行熔鍊指令`)
                            .setEmbedFooter(interaction);

                        return await interaction.editReply({ embeds: [embed], components: [] });
                    };

                    // ==================檢查物品==================
                    let item_missing = [];

                    for (const need_item of item_need) {
                        const current_item_id = need_item.item;
                        const need_amount = need_item.amount;

                        const not_enough_item = userHaveNotEnoughItems(rpg_data, current_item_id, need_amount);
                        if (not_enough_item) item_missing.push(not_enough_item);
                    };

                    if (item_missing.length > 0) {
                        const embed = await notEnoughItemEmbed(item_missing, interaction, client);

                        return await interaction.editReply({ embeds: [embed] });
                    };
                    // ==================檢查物品==================

                    for (const need_item of item_need) {
                        rpg_data.inventory[need_item.item] -= need_item.amount;
                    };

                    await save_rpg_data(user.id, rpg_data);

                    const smelt_recipe = smeltable_recipe.find(a => a.input.item === item_id);
                    if (!smelt_recipe) {
                        const error_embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 找不到這個熔煉配方`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [error_embed], flags: MessageFlags.Ephemeral });
                    };

                    const output_item_id = smelt_recipe.output;
                    const end_time = Math.floor(Date.now() / 1000) + parsedDuration;

                    if (smelt_data.length >= smelter_slots) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你的煉金爐已經滿了`)
                            .setEmbedFooter(interaction);

                        return await interaction.followUp({ embeds: [embed] });
                    };

                    smelt_data.push({
                        userId: user.id,
                        item_id,
                        amount: parsedAmount,
                        coal_amount: parsedCoalAmount,
                        end_time,
                        output_item_id,
                        output_amount: parseInt(output_amount),
                    });

                    await save_smelt_data(user.id, smelt_data);

                    // 清理 session 資料
                    client.smelter_sessions.delete(session_id);

                    const emoji_furnace = await get_emoji("furnace", client);
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_furnace} | 成功放進煉金爐內`)
                        .setDescription(`等待至 <t:${end_time}:R>`)
                        .setEmbedFooter(interaction);

                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                }
                case "marry_accept": {
                    await interaction.deferUpdate();

                    const [userId] = otherCustomIDs;
                    const targetUserId = user.id;

                    const [rpg_data, t_rpg_data, [emoji_cross, emoji_check]] = await Promise.all([
                        load_rpg_data(userId),
                        load_rpg_data(targetUserId),
                        get_emojis(["crosS", "check"], client),
                    ]);

                    const marry_data = rpg_data.marry ?? {};
                    const marry_with = marry_data.with ?? null;
                    const married = marry_data.status ?? false;

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

                    await Promise.all([
                        save_rpg_data(userId, rpg_data),
                        save_rpg_data(targetUserId, t_rpg_data),
                    ]);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_check} | 求婚成功`)
                        .setDescription(`<@${userId}> 和 <@${targetUserId}> 現在是夫妻拉`)
                        .setEmbedFooter(interaction);

                    return await interaction.editReply({ content: "", embeds: [embed], components: [] });
                }
                case "divorce": {
                    const [with_UserId] = otherCustomIDs;

                    const marry_default_value = find_default_value("rpg_database.json")?.["marry"] ?? {};

                    const [_, emoji_cross, rpg_data, with_User_rpg_data] = await Promise.all([
                        interaction.deferReply(),
                        get_emoji("crosS", client),
                        load_rpg_data(user.id),
                        load_rpg_data(with_UserId),
                    ]);

                    const marry_data = rpg_data.marry ?? {};
                    const married = marry_data.status ?? false;

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
                        .setDescription(`<@${user.id}> 和 <@${with_UserId}> 的婚姻關係已經結束了 :((`)
                        .setEmbedFooter(interaction);

                    rpg_data.marry = marry_default_value;
                    with_User_rpg_data.marry = marry_default_value;

                    await Promise.all([
                        save_rpg_data(user.id, rpg_data),
                        save_rpg_data(with_UserId, with_User_rpg_data),
                    ]);

                    return await interaction.editReply({ embeds: [embed] });
                }
                case "job_transfer": {
                    const [emoji_job, delay_embed] = await Promise.all([
                        get_emoji("job", client),
                        job_delay_embed(user.id, interaction, client),
                    ]);

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
                }
                case "job_choose": {
                    if (!interaction.isStringSelectMenu()) return;

                    const job = interaction.values[0];
                    const job_name = jobs?.[job]
                        ? get_job_name(job, locale)
                        : null;

                    /*
                    const [emoji_job, delay_embed] = await Promise.all([
                        get_emoji("job", client),
                        job_delay_embed(user.id, interaction, client),
                    ]);
                    */

                    // if (delay_embed) return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });

                    const emoji_job = await get_emoji("job", client);

                    const embed = new EmbedBuilder()
                        .setColor(embed_job_color)
                        .setTitle(`${emoji_job} | 確認轉職通知`)
                        .setDescription(`請確認將轉職為 ${job_name}，轉職後七天內不可更動！`)
                        .setEmbedFooter(interaction);

                    const confirm_button = new ButtonBuilder()
                        .setCustomId(`job_confirm|${user.id}|${job}`)
                        .setLabel("我確定")
                        .setStyle(ButtonStyle.Danger);

                    const row =
                        /** @type {ActionRowBuilder<ButtonBuilder>} */
                        (new ActionRowBuilder()
                            .addComponents(confirm_button));

                    return await interaction.update({ embeds: [embed], components: [row] });
                }
                case "job_confirm": {
                    const [_, __, job] = interaction.customId.split("|");

                    const job_name = jobs?.[job]
                        ? get_job_name(job, locale)
                        : null;

                    const [emoji_job, delay_embed] = await Promise.all([
                        get_emoji("job", client),
                        job_delay_embed(user.id, interaction, client),
                    ]);

                    if (delay_embed) return await interaction.followUp({ embeds: [delay_embed], flags: MessageFlags.Ephemeral });

                    const rpg_data = await load_rpg_data(user.id);

                    rpg_data.job = job;

                    if (job === "farmer") {
                        if (!rpg_data.inventory) rpg_data.inventory = {};
                        if (!rpg_data.inventory.wooden_hoe) rpg_data.inventory.wooden_hoe = 0;
                        rpg_data.inventory.wooden_hoe += 4;
                    };

                    if (!rpg_data.lastRunTimestamp) rpg_data.lastRunTimestamp = {};
                    rpg_data.lastRunTimestamp.job = Date.now();

                    const embed = new EmbedBuilder()
                        .setColor(embed_job_color)
                        .setTitle(`${emoji_job} | 成功轉職為 ${job_name}!`)
                        .setEmbedFooter(interaction);

                    await Promise.all([
                        interaction.update({ embeds: [embed], components: [] }),
                        save_rpg_data(user.id, rpg_data),
                    ]);

                    break;
                }
                case "play-s": {
                    if (
                        !guild
                        || !(interaction instanceof StringSelectMenuInteraction)
                    ) break;

                    // 下拉式選單
                    await interaction.deferUpdate();

                    const queue = getQueue(guild.id);

                    const vconnection = getVoiceConnection(guild.id);

                    // 連接到語音頻道
                    if (!vconnection) {
                        const voiceChannel = interaction.member && 'voice' in interaction.member
                            ? interaction.member.voice?.channel
                            : null;

                        if (!voiceChannel) return await interaction.followUp({
                            embeds: [await youHaveToJoinVC_Embed(interaction, client)],
                            flags: MessageFlags.Ephemeral,
                        });

                        const voiceConnection = joinVoiceChannel({
                            channelId: voiceChannel.id,
                            guildId: guild.id,
                            selfDeaf: true,
                            selfMute: false,
                            adapterCreator: guild.voiceAdapterCreator,
                        });

                        queue.setConnection(voiceConnection);
                        if (!(voiceChannel instanceof StageChannel)) queue.setVoiceChannel(voiceChannel);
                        if (channel && (
                            channel instanceof TextChannel
                            || channel instanceof ThreadChannel
                        )) queue.setTextChannel(channel);
                    } else if (!queue.connection) { // 強制把機器犬拉進來可能會這樣
                        queue.setConnection(vconnection);

                        if (!queue.voiceChannel && vconnection.joinConfig.channelId) {
                            const vchannel = await get_channel(vconnection.joinConfig.channelId, interaction.guild);
                            if (vchannel && vchannel instanceof VoiceChannel) {
                                queue.setVoiceChannel(vchannel);
                            };
                        };
                    };

                    if (!queue.textChannel
                        && channel
                        && (
                            channel instanceof TextChannel
                            || channel instanceof ThreadChannel
                        )) queue.setTextChannel(channel);
                    queue.subscribe();

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

                    const { track, next } = trackSession;

                    const [embed, rows] = await getNowPlayingEmbed(queue, track, interaction, client, true);

                    await Promise.all([
                        queue.addOrPlay(track, next ? 0 : null),
                        interaction.editReply({ content: "", embeds: [embed], components: rows }),
                    ]);

                    break;
                }
                case "refresh": {
                    const [feature] = otherCustomIDs;

                    switch (feature) {
                        case "/info bot": {
                            const embed = await getBotInfoEmbed(locale, client);

                            await interaction.update({ embeds: [embed] });
                            break;
                        }

                        case "/farm info": {
                            const [embed, row] = await get_farm_info_embed(user, interaction, client);

                            await interaction.update({ embeds: [embed], components: [row] });
                            break;
                        }

                        case "nowplaying": {
                            if (!interaction.guildId) break;
                            const queue = getQueue(interaction.guildId, true);

                            const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
                            if (notPlayingEmbed) {
                                return await interaction.update({ content: "", embeds: [notPlayingEmbed] });
                            };

                            const [emoji_music, [embed, rows]] = await Promise.all([
                                get_emoji("music", client),
                                getNowPlayingEmbed(queue, null, interaction, client),
                            ]);

                            await interaction.update({ content: `${emoji_music} | 正在播放`, embeds: [embed], components: rows });
                            break;
                        }
                    };

                    break;
                }
                case "music": {
                    const [feature, options = null] = otherCustomIDs;

                    const guildId = guild?.id;
                    if (!guildId) return;

                    const queue = getQueue(guildId);

                    const notPlayingEmbed = await noMusicIsPlayingEmbed(queue, interaction, client);
                    if (notPlayingEmbed && !["loop", "trending", "disconnect"].includes(feature)) {
                        return await interaction.update({ content: "", embeds: [notPlayingEmbed] });
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

                            break;
                        }

                        case "skip": {
                            if (!queue.currentTrack) return;
                            const currentTrack = queue.currentTrack;

                            const emoji_skip = await get_emoji("skip", client);

                            await Promise.all([
                                queue.nextTrack(),
                                interaction.update({ content: `${emoji_skip} | \`${user.username}\` 跳過了 \`${currentTrack.title}\``, embeds: [] }),
                            ]);

                            break;
                        }

                        case "shuffle": {
                            const emoji_shuffle = await get_emoji("shuffle", client);

                            await Promise.all([
                                queue.shuffle(),
                                interaction.update({ content: `${emoji_shuffle} | \`${user.username}\` 隨機排序了音樂佇列`, embeds: [] }),
                            ]);

                            break;
                        }

                        case "loop": {
                            const currentLoopStatus = queue.loopStatus;
                            const emoji_loop = await get_emoji("loop", client);

                            /** @type {{ [k: number]: string }} */
                            const translate = {
                                [loopStatus.DISABLED]: "關閉",
                                [loopStatus.TRACK]: "單曲",
                                [loopStatus.ALL]: "全部",
                                [loopStatus.AUTO]: "自動推薦",
                            };

                            const nextLoopStatus = (currentLoopStatus + 1) > (Object.keys(loopStatus).length - 1) ? 0 : (currentLoopStatus + 1);

                            await Promise.all([
                                queue.setLoopStatus(nextLoopStatus),
                                interaction.update({ content: `${emoji_loop} | \`${user.username}\` 把重複的狀態更改為 \`${translate[nextLoopStatus]}\` `, embeds: [] }),
                            ]);

                            break;
                        }

                        case "trending": {
                            switch (options) {
                                case "on": {
                                    const emoji_trending = await get_emoji("trending", client);

                                    await Promise.all([
                                        queue.setLoopStatus(loopStatus.AUTO),
                                        interaction.update({ content: `${emoji_trending} | \`${user.username}\` 啟用了自動推薦功能，將會在歌曲結束後推薦下一首音樂` }),
                                    ]);

                                    break;
                                }

                                case "off": {
                                    const emoji_trending = await get_emoji("trending", client);

                                    await Promise.all([
                                        queue.setLoopStatus(loopStatus.DISABLED),
                                        interaction.update({ content: `${emoji_trending} | \`${user.username}\` 關閉了自動推薦功能` }),
                                    ]);

                                    break;
                                }
                            };

                            break;
                        }

                        case "disconnect": {
                            const emoji_wumpusWave = await get_emoji("wumpusWave", client);

                            await Promise.all([
                                queue.destroy(),
                                interaction.update({ content: `${emoji_wumpusWave} | \`${user.username}\` 讓我離開語音頻道`, embeds: [] }),
                            ]);

                            break;
                        }

                        case "page": {
                            if (typeof options !== "string") break;

                            const [embed, row] = await getQueueListEmbedRow(queue, parseInt(options) ?? 1, interaction, client);

                            await interaction.update({ embeds: [embed], components: [row] });
                            break;
                        }
                    };

                    break;
                }
                case "cook": {
                    const [sessionId] = otherCustomIDs;

                    const session = client.cook_sessions.get(sessionId);
                    if (!session) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 烹飪會話已過期`)
                            .setDescription(`請重新執行烹飪指令`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
                    };

                    const {
                        userId,
                        recipe,
                        item_needed,
                        inputed_foods,
                        amount,
                        last_cook_time,
                    } = session;

                    if (user.id !== userId) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 這不是你的烹飪會話`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
                    };

                    const food_name = get_name_of_id(recipe.output);

                    let burnt = false;
                    const now = Date.now();
                    const time_diff = now - last_cook_time;
                    if (time_diff > cookBurntOverTime) {
                        burnt = getRandomBooleanWithWeight(cookBurntWeight);
                    };

                    if (burnt) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const textDisplay = new TextDisplayBuilder()
                            .setContent(`**${emoji_cross} | 烹飪失敗**\n你的${food_name}燒焦了，下次炒快點！`)

                        const section = new SectionBuilder()
                            .addTextDisplayComponents(textDisplay)

                        return await Promise.all([
                            client.cook_sessions.delete(sessionId),
                            interaction.update({ components: [section] }),
                        ]);
                    };

                    session.cooked += 1;
                    session.last_cook_time = Date.now();

                    let container;

                    if (session.cooked >= cookClickAmount) {
                        container = await getCookingResultContainer(recipe.output, amount, client);

                        const rpg_data = await load_rpg_data(user.id);
                        const output_item = recipe.output;

                        if (!rpg_data.inventory[output_item]) rpg_data.inventory[output_item] = 0;
                        rpg_data.inventory[output_item] += amount;

                        await Promise.all([
                            client.cook_sessions.delete(sessionId),
                            save_rpg_data(user.id, rpg_data),
                        ]);
                    } else {
                        container = await getCookingContainer(inputed_foods, item_needed, user.id, sessionId, session.cooked, client);
                    };

                    await interaction.update({
                        content: null,
                        components: [container],
                    });

                    break;
                }
                case "gbmi": {
                    const [session_id] = otherCustomIDs;

                    const session = client.gbmi_sessions.get(session_id);
                    if (!session) {
                        const [emoji_cross, emoji_panic] = await get_emojis(["crosS", "panic"], client);

                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 退回失敗`)
                            .setDescription(`${emoji_panic} 正在偷吃你的物品，但被你抓到了 (跑走`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
                    };

                    if (user.id !== session.userId) {
                        const emoji_cross = await get_emoji("crosS", client);

                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 這不是你的會話`)
                            .setEmbedFooter(interaction);

                        return await interaction.reply({ embeds: [embed], components: [], flags: MessageFlags.Ephemeral });
                    };

                    const items = session.item_needed
                        .map(item => {
                            const name = get_id_of_name(item.item);
                            const amount = item.amount;

                            return { name, amount };
                        })

                    const rpg_data = await load_rpg_data(user.id);

                    for (const item of items) {
                        if (!rpg_data.inventory[item.name]) rpg_data.inventory[item.name] = 0;
                        rpg_data.inventory[item.name] += item.amount;
                    };

                    const [__, ___, ____, emoji_check] = await Promise.all([
                        interaction.message.delete(),
                        interaction.deferReply({ flags: MessageFlags.Ephemeral }),
                        save_rpg_data(user.id, rpg_data),
                        get_emoji("check", client),
                    ]);

                    const textDisplay = new TextDisplayBuilder().setContent(`**${emoji_check} | 成功取回 ${items.map(item => `${item.amount} 個 ${get_name_of_id(item.name)}`).join(", ")}**`);

                    await interaction.followUp({ components: [textDisplay], flags: MessageFlags.IsComponentsV2 });

                    break;
                }
                case "daily": {
                    if (!guild) break;

                    const [emoji_calendar, rpg_data, prefix] = await Promise.all([
                        get_emoji("calendar", client),
                        load_rpg_data(user.id),
                        firstPrefix(guild.id),
                    ]);

                    const enabled = rpg_data.daily_msg;
                    const changeToStatusText = enabled ? "關閉" : "開啟"

                    rpg_data.daily_msg = !enabled;

                    const embed = new EmbedBuilder()
                        .setColor(embed_sign_color)
                        .setTitle(`${emoji_calendar} | 成功${changeToStatusText}簽到訊息`)
                        .setDescription(
                            enabled
                                ? `很抱歉這個私訊造成你的困擾，如果要再次打開這個訊息，請使用 \`${prefix}daily\` 或是點擊下方按鈕`
                                : `當你到我們伺服器聊天ㄉ時候，就會收到這個簽到訊息，如果要關閉這個訊息，請使用 \`${prefix}daily\` 或是點擊下方按鈕`
                        )
                        .setEmbedFooter(interaction);

                    const row =
                        /** @type {ActionRowBuilder<ButtonBuilder>} */
                        (new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`daily|any|${enabled ? "disable" : "enable"}-dm`)
                                    .setLabel(`${enabled ? "不想" : "想"}收到機器犬的私訊ㄇ`)
                                    .setStyle(ButtonStyle.Secondary),
                            ));

                    await Promise.all([
                        save_rpg_data(user.id, rpg_data),
                        interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral }),
                    ]);
                    break;
                }
                case "fightjob": {
                    if (!(interaction instanceof StringSelectMenuInteraction)) return;

                    /** @type {string | null} */
                    let jobId = interaction.values?.[0];

                    const lang_none = get_lang_data(locale, "rpg", "fightjob.none"); // None 無
                    const lang_transfer_to = get_lang_data(locale, "rpg", "fightjob.transfer_to"); // Successfully changed adventure job to | 成功轉職為

                    if (!fightjobs[jobId]) jobId = null;
                    const fight_job_name = jobId
                        ? get_fightjob_name(jobId, locale) ?? lang_none
                        : lang_none;

                    const rpg_data = await load_rpg_data(user.id);
                    rpg_data.fightjob = jobId;

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${lang_transfer_to} ${fight_job_name}`)
                        .setEmbedFooter(interaction);

                    await Promise.all([
                        save_rpg_data(user.id, rpg_data),
                        interaction.update({ content: "", embeds: [embed], components: [] }),
                    ]);
                }
            };
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });

            logger.error(errorStack);

            const loophole_embeds = await get_loophole_embed(errorStack, interaction, client);

            if (!interaction.deferred || !interaction.replied) try {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            } catch { };

            try {
                await interaction.followUp({ embeds: loophole_embeds, flags: MessageFlags.Ephemeral });
            } catch { };
        };
    },
    check_help_rpg_info,
    get_help_embed,
    get_help_command,
};