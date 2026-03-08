const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Message, User, StringSelectMenuOptionBuilder, Guild } = require("discord.js");
const util = require("util");

const {
    get_logger,
} = require("../../utils/logger.js");
const {
    randint,
    choice,
} = require("../../utils/random.js");
const {
    convertToSecondTimestamp,
} = require("../../utils/timestamp.js");
const {
    get_loophole_embed,
    get_emoji,
    ls_function,
    is_cooldown_finished,
    chunkArray,
    get_emojis,
    get_number_of_items,
    firstPrefix,
    InPrefix,
    get_name_of_id,
    get_id_of_name,
    choose_job_row,
    get_failed_embed,
    get_cooldown_embed,
    wrong_job_embed,
    startsWith_prefixes,
    foods,
    name,
    name_reverse,
    fish,
    ingots,
    mine_gets,
    food_data,
    foods_crops,
    foods_meat,
    animal_products,
    shop_lowest_price,
    sell_data,
    userHaveNotEnoughItems,
    BetterEval,
} = require("../../utils/rpg.js");
const {
    load_rpg_data,
    save_rpg_data,
    load_shop_data,
    save_shop_data,
    loadData,
} = require("../../utils/file.js");
const {
    embed_default_color,
    embed_warn_color,
    embed_error_color,
    embed_job_color,
    embed_fell_color,
    embed_marry_color,
    max_hunger,
    cannot_sell,
    failed,
    probabilities,
    jobs,
    PrivacySettings,
    embed_sign_color,
    INVITE_LINK,
    daily_sign_guildIDs,
    fightjobs,
} = require("../../utils/config.js");
const {
    get_help_command,
} = require("./interactions.js");
const {
    mentions_users,
} = require("../../utils/message.js");
const {
    hasSignedTodayOrBrokeSign,
} = require("../dailySign.js");
const EmbedBuilder = require("../../utils/customs/embedBuilder.js");
const DogClient = require("../../utils/customs/client.js");

const logger = get_logger();

class MockMessage {
    /**
     *
     * @param {string | null} [content=null]
     * @param {any | null} [channel=null]
     * @param {User | null} [author=null]
     * @param {Guild | null} [guild=null]
     * @param {User | null} [mention_user=null]
     */
    constructor(content = null, channel = null, author = null, guild = null, mention_user = null) {
        /** @type {string | null} */
        this.content = content;

        /** @type {any | null} */
        this.channel = channel;

        /** @type {User | null} */
        this.author = author;

        /** @type {Guild | null} */
        this.guild = guild;

        this.mentions = {
            users: {
                first: () => mention_user,
                cache: new Map([[mention_user?.id, mention_user]])
            }
        };
    };

    async reply() {
        return this;
    };

    async delete() {
        return this;
    };
};

/**
 * Check whether a item exists by its ID
 * @param {string} item_id
 * @returns {boolean}
 */
function item_exists(item_id) {
    return !!get_name_of_id(item_id, null);
};


/**
 *
 * @param {string} item
 * @param {User} user
 * @param {string} amount_str
 * @returns {Promise<number>}
 */
async function get_amount(item, user, amount_str) {
    const default_value = 1;

    if (amount_str === "all" && item && user) {
        return await get_number_of_items(item, user.id);
    };

    const amount = parseInt(amount_str);

    if (!amount && amount !== 0) return default_value;
    if (isNaN(amount)) return default_value;

    return amount;
};

/**
 * Redirect to another command
 *
 * @overload
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | MockMessage} options.message
 * @param {string} options.command
 * @param {0} [options.mode=0]
 * @returns {Promise<void | Message | null>}
 *
 * @overload
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | MockMessage} options.message
 * @param {string} options.command
 * @param {1} options.mode
 * @returns {Promise<void | { [k: string]: any } | null>}
 *
 * @overload
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | MockMessage} options.message
 * @param {string} options.command
 * @param {0 | 1} [options.mode=0]
 * @returns {Promise<void | { [k: string]: any } | Message | null>}
 *
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | MockMessage} options.message
 * @param {string} options.command
 * @param {0 | 1} [options.mode=0]
 * @throws {TypeError} When the mode argument is not valid
 * @throws {Error} When there is no guild property of the message object
 */
async function redirect({ client, message, command, mode = 0 }) {
    /*
    m = 0: 也回復訊息
    m = 1: 只回傳訊息參數
    */

    if (![0, 1].includes(mode)) throw new TypeError("Invalid mode");

    const guild = message.guild;
    if (!guild) throw new Error("Guild is invalid");

    const pf = (await InPrefix(guild.id, command))?.[0];

    if (pf) {
        try {
            throw new Error(`傳送包含${pf}的指令名已棄用，現在只需要傳送指令名稱`);
        } catch (e) {
            if (e instanceof Error && e.stack) process.emitWarning(e.stack, {
                type: "DeprecationWarning",
                code: "COMMAND_NAME_WITH_PREFIX",
            });
        };
    };

    const prefix = await firstPrefix(guild.id);

    if (!command.includes(prefix)) command = prefix + command;
    // @ts-ignore
    const msg = new MockMessage(command, message.channel, message.author, message.guild, (await mentions_users(message)).first());
    const message_args = await rpg_handler({ client, message: msg, d: true, mode: 1 });
    if (!message_args || message_args instanceof Message) return message_args;

    if (mode === 1) return message_args;
    return await message.reply(message_args);
};

/**
 * Get the embed for showing marry info of a user
 * @param {import("../../utils/config.js").RpgDatabase} rpg_data
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function show_marry_info(rpg_data, client = global._client) {
    const marry_info = rpg_data?.marry ?? {};
    const married = marry_info.status ?? false;
    if (!married) throw new Error("not married but triggered show_marry_info");

    const emoji_check = await get_emoji("check", client);
    const marryTime = convertToSecondTimestamp(marry_info.time);

    const embed = new EmbedBuilder()
        .setTitle(`${emoji_check} 結婚資訊`)
        .setColor(embed_marry_color)
        .setDescription(
            `你和 <@${marry_info.with}> ❤️

結婚紀念日 - <t:${marryTime}:R>`
        )
        .setEmbedFooter();

    return embed;
};

/**
 * command_name: "{c} will be replaced with the command execution times"
 * @type {{ [k: string]: string }}
 */
const rpg_cooldown = {
    // 單位: 秒
    // mine: "180 + {c} * 30",
    // hew: "180 + {c} * 30",
    // herd: "195 + {c} * 30",
    // brew: "145 + {c} * 25",
    // fish: "90 + {c} * 20",
    mine: "60 * 5",
    hew: "60 * 5",
    herd: "60 * 5",
    brew: "60 * 5",
    fish: "60 * 5",
    fell: "60 * 5",
    farm_water: "60 * 60 * 12" // 12小時
};

/** @type {{ [k: string]: [string, string] }} */
const rpg_actions = {
    挖礦: ["挖", "礦"],
    伐木: ["伐", "木"],
    放牧: ["放牧", ""],
    釀造: ["釀造", "藥水"],
    抓魚: ["抓", "魚"],
};

/** @type {{ [k: string]: string }} */
const redirect_data = {
    hew: "fell",
    wood: "fell",
    item: "items",
    bag: "items",
    ls: "items",
    food: "eat",
    mo: "money",
    m: "money",
    store: "shop",
    love: "marry",
    unmarry: "divorce",
    fj: "fightjob",
};

/** @type {string[]} */
const rpg_work = [
    ...Object.keys(rpg_cooldown),
    ...Object.keys(redirect_data).filter(key => key in Object.keys(rpg_cooldown)),
];

const redirect_data_reverse = Object.entries(redirect_data).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
},
    /** @type {{ [k: string]: string }} */
    ({})
);

/** @type {{ [k: string]: [string, string, Function, boolean | ((client: DogClient, userId: string) => Promise<boolean> | boolean)] }} */
const rpg_commands = {
    mine: ["挖礦", "挖礦",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const userid = message.author?.id;
            if (!userid) return;

            const { item, amount } = random_item;
            if (!item_exists(item)) {
                const embeds = await get_loophole_embed(`找不到${item}的物品名稱: ${get_name_of_id(item)}`, null, client);
                return await message.reply({ embeds });
            };

            if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
            rpg_data.inventory[item] += amount;

            const ore_name = get_name_of_id(item);

            const [_, emoji] = await Promise.all([
                save_rpg_data(userid, rpg_data),
                get_emoji("ore", client),
            ]);

            let description;
            if (item === "stone") {
                description = `你尋找了很久，最終發現只有 \`${amount}\` 個${ore_name}。`;
            } else if (item === "diamond_ore") {
                const min = -64;
                const max = 16;
                const y_pos = Math.floor(Math.random() * (max - min + 1)) + min;
                description = `你尋找了很久，最終在Y座標\`${y_pos}\` 發現了 \`${amount}\` 個${ore_name}。`;
            } else {
                description = `在洞口處發現了 \`${amount}\` 個${ore_name}！`;
            };

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji} | 挖礦`)
                .setDescription(description)
                .setEmbedFooter({ text: "", rpg_data });

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    fell: ["伐木", "砍砍樹，偶爾可以挖到神木 owob",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;
            const userid = message.author.id;

            const { item, amount } = random_item;
            const log_name = get_name_of_id(item);

            if (!item_exists(item)) {
                const embeds = await get_loophole_embed(`找不到${item}的物品名稱: ${log_name}`, null, client);
                return await message.reply({ embeds });
            };

            let description;
            if (item === "god_wood") {
                description = `本來是平常的一天，居然遇到了神木，於是你砍下了它並獲得了 \`${amount}\` 塊${log_name}！`;
            } else {
                description = `你來到了森林，並且砍了 \`${amount}\` 塊${log_name}`;
            };

            if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
            rpg_data.inventory[item] += amount;
            await save_rpg_data(userid, rpg_data);

            const emoji = await get_emoji("wood", client);

            const embed = new EmbedBuilder()
                .setColor(embed_fell_color)
                .setTitle(`${emoji} | ${item === "god_wood" ? "是神?!" : "平常的一天"}`)
                .setDescription(description)
                .setEmbedFooter({ text: "", rpg_data });

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    herd: ["放牧", "放牧或屠宰動物",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;
            const userid = message.author.id;

            const { item: random_animal, amount } = random_item;
            if (!animal_products[random_animal]) {
                const embeds = await get_loophole_embed(`找不到${random_animal}的動物產品: ${animal_products[random_animal]}`, null, client);
                return await message.reply({ embeds });
            };

            const product = animal_products[random_animal];

            if (!rpg_data.inventory[product]) rpg_data.inventory[product] = 0;

            rpg_data.inventory[product] += amount;

            const product_name = get_name_of_id(product);
            const animal_name = product_name.replace("生", "").replace("肉", "");
            const emoji_cow = await get_emoji("cow", client);

            let title = `是${animal_name}`;
            let description = `你宰了一隻${animal_name}，獲得了 \`${amount}\` 個 ${product_name}！`;
            if (product === "raw_chicken") {
                const egg_amount = randint(1, 3);
                description += `\n不僅如此！你還發現了 \`${egg_amount}\` 顆 ${get_name_of_id("egg")}！`
                if (!rpg_data.inventory["egg"]) rpg_data.inventory["egg"] = 0;
                rpg_data.inventory["egg"] += egg_amount;
            } else if (product === "raw_pork") {
                title = "佩佩豬";
            } else if (product === "raw_duck") {
                title = `呱!`;
                description = `呱呱呱呱呱，呱呱呱呱 \`${amount}\` 呱呱呱！`;
            } else if (product === "raw_hugo") {
                title = `哈狗!`;
                description = `你把哈狗的巢穴連根拔起，並且抓到了 \`${amount}\` 隻 ${product_name} 並逃走了！`;
            } else if (product === "dogdog") {
                title = `🐶 汪!`
                description = `你偷走了機器犬的幼崽！拿到了 \`${amount}\` 隻 ${product_name}`
            };

            await save_rpg_data(userid, rpg_data);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_cow} | ${title}`)
                .setDescription(description)
                .setEmbedFooter({ text: "", rpg_data });

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    brew: ["釀造", "釀造藥水",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;
            const userid = message.author.id;

            const { item, amount } = random_item;
            if (!item_exists(item)) {
                const embeds = await get_loophole_embed(`找不到${item}的物品名稱: ${get_name_of_id(item)}`, null, client);
                return await message.reply({ embeds });
            };

            if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
            const potion_name = get_name_of_id(item);
            rpg_data.inventory[item] += amount;
            await save_rpg_data(userid, rpg_data);

            const emoji_potion = await get_emoji("potion", client);
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_potion} | 釀造`)
                .setDescription(`你研究了許久，獲得了 \`${amount}\` 個${potion_name}`)
                .setEmbedFooter({ text: "", rpg_data });
            // .setTitle(`${emoji_potion} | 回復藥水可以幹嘛?`)
            // .setDescription(`你研究了許久，獲得了 \`${amount}\` 個${potion_name}\n\n之後推出的冒險可以用上`);


            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    fish: ["抓魚", "魚魚: 漁夫!不要抓我~~~",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;
            const userid = message.author.id;

            const { item, amount } = random_item;
            if (!item_exists(item)) {
                const embeds = await get_loophole_embed(`找不到${item}的物品名稱: ${get_name_of_id(item)}`, null, client);
                return await message.reply({ embeds });
            };

            if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
            rpg_data.inventory[item] += amount;
            await save_rpg_data(userid, rpg_data);
            const fish_name = get_name_of_id(item);

            let fish_text;
            let description;
            if (item === "raw_salmon") {
                fish_text = "🐢魚"
                description = `你等待了幾個小時，獲得了 \`${amount}\` 條${fish_name}！`
            } else if (item === "raw_shrimp") {
                fish_text = "太蝦了把"
                description = `你打撈了一片蝦子上來，獲得了 \`${amount}\` 個${fish_name}！`
            } else if (item === "raw_tuna") {
                fish_text = "呼"
                description = `你等待了幾個小時，打撈到了 \`${amount}\` 條${fish_name}！`
            } else {
                if (Math.round(Math.random()) === 0) {
                    fish_text = "好吃的魚魚！但要怎麼烤呢？"
                    description = `你等待了幾個小時，打撈到了 \`${amount}\` 條${fish_name}！`
                } else {
                    fish_text = "好欸！"
                    description = `有 \`${amount}\` 條 ${fish_name} 衝到岸上送到你手上了！`
                };
            };

            const emoji = await get_emoji("fisher", client);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji} | ${fish_text}`)
                .setDescription(description)
                .setEmbedFooter({ text: "", rpg_data });

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    shop: ["商店", "對你的商店進行任何操作",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const subcommand = args[0];
            const userid = message.author.id;

            const [
                emoji_store,
                emoji_cross,
            ] = await get_emojis([
                "store",
                "crosS",
            ], client);

            switch (subcommand) {
                case "add": {
                    const shop_data = await load_shop_data(userid);
                    const status = shop_data.status ? "營業中" : "打烊";
                    /*
                    指令: shop add <商品名稱/ID> <數量> <售價>
                    範例: shop add 鑽石礦 2 600
                    範例2: shop add diamond_ore 2 600
                    */
                    let [_, item_name, amount, price] = args;
                    item_name = get_name_of_id(item_name); // 物品名稱
                    const item = get_id_of_name(item_name); // 物品id

                    if (amount === "all") amount = await get_number_of_items(item, userid); // 獲取所有物品數量

                    if (!
                        Object.keys(name)
                            .concat(Object.values(name))
                            .includes(args[1])
                    ) {
                        return await redirect({ client, message, command: "help shop", mode });
                    };

                    const item_exist = shop_data.items[item];
                    amount = parseInt(amount);
                    if (isNaN(amount)) amount = 1;
                    if (amount < 1) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 錯誤的數量`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    // let price = parseInt(args[3]) || item_exist?.price || shop_lowest_price[item];
                    price = parseInt(price) || item_exist?.price;
                    if (!price || price < 1 || price >= 1000000000) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 錯誤的價格`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    if (price < shop_lowest_price[item]) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 價格低於最低價格`)
                            .setDescription(`請至少販賣一件 \`${shop_lowest_price[item].toLocaleString()}$\``)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    if (!rpg_data.inventory[item]) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你沒有這個物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    if (typeof rpg_data.inventory[item] !== "number") rpg_data.inventory[item] = 0;
                    if (rpg_data.inventory[item] < amount) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你沒有足夠的物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    rpg_data.inventory[item] -= amount;

                    if (item_exist) {
                        shop_data.items[item].amount += amount;
                        if (price) shop_data.items[item].price = price;
                    } else {
                        shop_data.items[item] = {
                            name: item,
                            amount,
                            price,
                        };
                    };

                    amount = shop_data.items[item].amount;
                    price = shop_data.items[item].price;

                    await Promise.all([
                        save_rpg_data(userid, rpg_data),
                        save_shop_data(userid, shop_data)]);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 成功上架`)
                        .setDescription(`你的店面狀態為: \`${status}\`，現在架上有 \`${amount.toLocaleString()}\` 個 \`${item_name}\`，售價為 \`${price.toLocaleString()}$\``)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                case "remove": {
                    const shop_data = await load_shop_data(userid);
                    const item = args[1];

                    if (!item) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 請輸入要下架的物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    const item_name = get_name_of_id(item);
                    const item_id = item;
                    const item_exist = shop_data.items[item_id];
                    if (!item_exist) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你的商店沒有這個物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    const remove_amount = args[2];
                    if (!rpg_data.inventory[item_id]) rpg_data.inventory[item_id] = 0;
                    const amount = parseInt(remove_amount) || item_exist.amount;

                    if (amount < 1) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 錯誤的數量`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    if (amount > shop_data.items[item_id].amount) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 商店沒有足夠的物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    rpg_data.inventory[item_id] += amount;

                    shop_data.items[item_id].amount -= amount;
                    if (shop_data.items[item_id].amount <= 0) {
                        delete shop_data.items[item_id];
                    };

                    await save_rpg_data(userid, rpg_data);
                    await save_shop_data(userid, shop_data);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 成功下架了 \`${amount.toLocaleString()}\` 個 ${item_name}`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                case "list": {
                    const user = (await mentions_users(message)).first() || message.author;

                    const [shop_data, [emoji_cross, emoji_store, emoji_ore, emoji_bread]] = await Promise.all([
                        load_shop_data(user.id),
                        get_emojis(["crosS", "store", "ore", "bread"], client),
                    ]);

                    if (!shop_data.status && user.id != message.author.id) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_default_color)
                            .setTitle(`${emoji_store} | 該商店目前已經打烊了`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    const status = shop_data.status ? "營業中" : "已打烊";

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setAuthor({
                            name: `${user.username} 的商店 (${status})`,
                            iconURL: user.displayAvatarURL()
                        })
                        .setEmbedFooter();

                    // 礦物
                    const minerals = Object.entries(shop_data.items)
                        .filter(([item]) => Object.values(mine_gets).includes(item) || Object.values(ingots).includes(item))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([item, data]) => `${get_name_of_id(item)} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                        .join("\n");

                    if (minerals) embed.addFields({ name: `${emoji_ore} 礦物`, value: minerals, inline: false });

                    // 食物
                    const food = Object.entries(shop_data.items)
                        .filter(([item]) => Object.values(foods).includes(item))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([item, data]) => `${get_name_of_id(item)} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                        .join("\n");

                    if (food) embed.addFields({ name: `${emoji_bread} 食物`, value: food, inline: false });

                    // 其他
                    const others = Object.entries(shop_data.items)
                        .filter(([item]) => !Object.values(mine_gets).includes(item) && !Object.values(ingots).includes(item) && !Object.values(foods).includes(item))
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([item, data]) => `${get_name_of_id(item)} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                        .join("\n");

                    if (others) embed.addFields({ name: `其他`, value: others, inline: false });

                    const nothing_sell = !minerals && !food && !others;

                    if (nothing_sell) {
                        embed.setColor(embed_error_color)
                        embed.setTitle(`${emoji_cross} | 商店裡沒有販賣任何東西`);
                        embed.setAuthor(null);
                    };

                    const buyItemButton = new ButtonBuilder()
                        .setCustomId(`help|${message.author.id}|rpg|buy`)
                        .setLabel("購買食物")
                        .setEmoji(emoji_store)
                        .setStyle(ButtonStyle.Primary);

                    const row =
                        /** @type {ActionRowBuilder<ButtonBuilder>} */
                        (new ActionRowBuilder()
                            .addComponents(buyItemButton));

                    if (mode === 1) return { embeds: [embed], components: nothing_sell ? [] : [row] };
                    return await message.reply({ embeds: [embed], components: nothing_sell ? [] : [row] });
                }

                case "open":
                case "on": {
                    const shop_data = await load_shop_data(userid);

                    shop_data.status = true;
                    await save_shop_data(userid, shop_data);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 你的商店開始營業啦！`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                case "close":
                case "off": {
                    const shop_data = await load_shop_data(userid);

                    shop_data.status = false;
                    await save_shop_data(userid, shop_data);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 你拉下了商店鐵捲門`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                case "status": {
                    const shop_data = await load_shop_data(userid);

                    const status = shop_data.status ? "營業中" : "打烊";

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 你的商店狀態為: ${status}`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                case "edit": {
                    const rpg_data = await load_rpg_data(userid);
                    const shop_data = await load_shop_data(userid);

                    const status = shop_data.status ? "營業中" : "打烊";

                    let [_, item_name, amount = null, price = null] = args;
                    item_name = get_name_of_id(item_name); // 物品名稱
                    const item = get_id_of_name(item_name); // 物品id

                    const item_exist = shop_data.items[item];

                    if (!item_exist) return await redirect({
                        client,
                        message,
                        command: `shop add ${item} ${amount || 1} ${price || 1}`,
                        mode,
                    });

                    const item_amount_needed = (amount - item_exist.amount);

                    if (amount === "all") amount = ((item_exist.amount || 0) + await get_number_of_items(item, userid)) || 1;

                    if (userHaveNotEnoughItems(rpg_data, item, item_amount_needed)) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你沒有足夠的物品`)
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    let rpg_data_modified = false;
                    let shop_data_modified = false;

                    if (amount) {
                        if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
                        rpg_data.inventory[item] -= item_amount_needed;

                        shop_data.items[item].amount = amount;

                        rpg_data_modified = true;
                        shop_data_modified = true;
                    };

                    if (price) {
                        shop_data.items[item].price = price;

                        shop_data_modified = true;
                    };

                    await Promise.all([
                        rpg_data_modified ? save_rpg_data(userid, rpg_data) : null,
                        shop_data_modified ? save_shop_data(userid, shop_data) : null,
                    ]);

                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 成功編輯`)
                        .setDescription(`你的店面狀態為: \`${status}\`，現在架上有 \`${amount.toLocaleString()}\` 個 \`${item_name}\`，售價為 \`${price.toLocaleString()}$\``)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                }

                default: {
                    const user = (await mentions_users(message)).first();

                    if (user) {
                        return await redirect({ client, message, command: `shop list ${user.id}`, mode });
                    };

                    if (mode === 1) return {};
                    return;
                }
            };
        }, true],
    items: ["查看背包", "查看背包",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            return await ls_function({ client, message, rpg_data, mode, interaction: null })
        }, false],
    buy: ["購買", "購買其他人上架的物品",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author || !message.guild) return;

            const userid = message.author.id;
            const emoji_cross = await get_emoji("crosS", client);
            const emoji_store = await get_emoji("store", client);

            const target_users = await mentions_users(message);
            const target_user = target_users.first();
            if (!target_user) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 錯誤的使用者`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            args = args.filter(arg => !arg.includes(target_user.id));

            let args_ = [];
            for (const arg of args) {
                if (!arg.includes("@")) {
                    args_.push(arg);
                };
            };
            args = args_.slice();

            if (target_user?.id && target_user.id === userid) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 不能購買自己的物品`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (args.length === 0 && target_user) {
                return await redirect({ client, message, command: `shop list ${target_user.id}`, mode });
            } else if (args.length === 0) {
                const embed = await get_help_command("rpg", "buy", message.guild.id, null, client);

                if (embed) await message.reply({
                    embeds: [embed],
                });

                return;
            };

            let item = args[0];
            item = get_id_of_name(item);

            if (!item_exists(item)) item = null;

            const shop_data = await load_shop_data(target_user.id);
            if (shop_data.items.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 商店裡沒有販賣任何東西`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            /** @type {string} */
            const item_name = get_name_of_id(item);

            if (!item || !name_reverse[item_name]) {
                return await redirect({ client, message, command: `shop list ${target_user.id}`, mode });
            };

            const item_exist = shop_data.items[item];
            if (!item_exist) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 沒有販賣這項物品`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            let amount = args[1];
            if (amount === "all") {
                amount = item_exist.amount;
            } else if (amount) {
                // 過濾amount中任何非數字的字元 e.g: $100 -> 100
                amount = amount.toString().replace(/\D/g, "");

                amount = parseInt(amount);
            };

            if (typeof amount !== "number") amount = parseInt(amount);

            if (!amount) amount = 1;
            if (amount < 1 || amount > item_exist.amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 錯誤的數量`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (rpg_data.money < item_exist.price * amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 歐不！你沒錢了！`)
                    .setDescription(`你還差 \`${(item_exist.price * amount - rpg_data.money).toLocaleString()}$\``)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const buyer_mention = message.author.toString();
            const targetUserMention = target_user.toString();
            const total_price = (item_exist.price * amount).toLocaleString();
            const pricePerOne = item_exist.price.toLocaleString();

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_store} | 購買確認`)
                .setDescription(`
${buyer_mention} 將要花費 \`${total_price}$ (${pricePerOne}$ / 個)\` 購買 ${targetUserMention} 的 ${item_name} \`x${amount.toLocaleString()}\`${shop_data.status ? "" : "，\n請等待店主同意該交易。"}

請確認價格和商店正確，我們不處理購買糾紛，
如果價格有誤請和賣家確認好。`)
                .setEmbedFooter();

            const confirmButton = new ButtonBuilder()
                .setCustomId(`buy|${message.author.id}|${message.author.id}|${target_user.id}|${amount}|${item_exist.price}|${item}`)
                .setLabel("確認購買")
                .setDisabled(!shop_data.status)
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel|${message.author.id}`)
                .setLabel("取消")
                .setStyle(ButtonStyle.Danger);

            const row = /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(confirmButton, cancelButton));

            if (!shop_data.status) {
                const solderConfirmButton = new ButtonBuilder()
                    .setCustomId(`buyc|${target_user.id}|${message.author.id}|${target_user.id}|${amount}|${item_exist.price}|${item}`)
                    .setLabel("店主確認")
                    .setStyle(ButtonStyle.Primary);

                row.addComponents(solderConfirmButton);
            };

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, true],
    money: ["查看餘額", "查看自己的餘額",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const button = new ButtonBuilder()
                .setCustomId(`rpg_transaction|${message.author.id}`)
                .setLabel("查看交易紀錄")
                .setStyle(ButtonStyle.Primary);

            const row = /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(button));

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setAuthor({
                    name: message.author.username,
                    iconURL: message.author.displayAvatarURL(),
                })
                .setDescription(`你目前有 \`${rpg_data.money.toLocaleString()}$\``)
                .setEmbedFooter();

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, false],
    cd: ["查看冷卻剩餘時間", "查看冷卻剩餘時間",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const lastRunTimestamp = rpg_data.lastRunTimestamp;
            const filtered_lastRunTimestamp = Object.fromEntries(
                Object.
                    entries(lastRunTimestamp)
                    .filter(([command, time]) => rpg_cooldown[command]),
            );

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("⏲️ | 冷卻剩餘時間")
                .setEmbedFooter();

            if (Object.keys(filtered_lastRunTimestamp).length === 0) {
                embed.setDescription(`你沒有工作過(挖礦、伐木、放牧等)，所以快快開始工作吧！`);
            } else {
                for (const [command, time] of Object.entries(filtered_lastRunTimestamp)) {
                    if (!rpg_cooldown[command]) continue;

                    const { is_finished, remaining_time } = is_cooldown_finished(command, rpg_data);
                    const field_name = command === "work" ? "工作" : command;

                    const target_time = Math.floor(Date.now() / 1000 + remaining_time / 1000);
                    const target_time_str = `<t:${target_time}:R>`;

                    let value = is_finished ? `冷卻完畢 (${target_time_str})` : target_time_str;
                    value += `\n上次執行時間: <t:${Math.floor(time / 1000)}:D> <t:${Math.floor(time / 1000)}:T>`;
                    value += `\n今天執行了 \`${rpg_data.count[command].toLocaleString()}\` 次`;

                    embed.addFields({ name: field_name, value: value, inline: true });
                };
            };

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    cdd: ["[簡易]查看冷卻剩餘時間", "查看冷卻剩餘時間，但是只顯示時間",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const lastRunTimestamp = rpg_data.lastRunTimestamp;
            const filtered_lastRunTimestamp = Object.fromEntries(Object.entries(lastRunTimestamp).filter(([command, time]) => rpg_cooldown[command]));

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("⏲️ | 冷卻剩餘時間")
                .setEmbedFooter();

            if (Object.keys(filtered_lastRunTimestamp).length === 0) {
                embed.setDescription(`你沒有工作過(挖礦、伐木、放牧等)，所以快快開始工作吧！`);
            } else {
                for (const [command, time] of Object.entries(filtered_lastRunTimestamp)) {
                    if (!rpg_cooldown[command]) continue;

                    const { is_finished, remaining_time } = is_cooldown_finished(command, rpg_data);
                    const field_name = command;

                    const target_time = Math.floor(Date.now() / 1000 + remaining_time / 1000);
                    const target_time_str = `<t:${target_time}:R>`;

                    let value = is_finished ? `冷卻完畢 (${target_time_str})` : target_time_str;

                    embed.addFields({ name: field_name, value: value, inline: true });
                };
            };

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    pay: ["付款", "付款給其他用戶",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const target_users = await mentions_users(message);
            const target_user = target_users.first();

            const emoji_cross = await get_emoji("crosS", client);
            const emoji_top = await get_emoji("top", client);

            if (!target_user) {
                return await redirect({ client, message, command: `help`, mode });
            };

            if (target_user.id === message.author?.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 不能自己付款給自己啊www`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            args = args.filter(arg => !arg.includes(target_user.id));

            const amount = BetterEval(args[0], 1);
            if (isNaN(amount) || amount <= 0) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 錯誤的數量`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (rpg_data.money < amount) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 歐不!`)
                    .setDescription(`你還差 \`${(amount - rpg_data.money).toLocaleString()}$\``)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const confirmButton = new ButtonBuilder()
                .setCustomId(`pay_confirm|${message.author.id}|${target_user.id}|${amount}`)
                .setLabel("確認付款")
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel|${message.author.id}`)
                .setLabel("取消付款")
                .setStyle(ButtonStyle.Success);

            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(confirmButton, cancelButton));

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_top} | 確認付款`)
                .setDescription(`你確定要付款 \`${amount.toLocaleString()}$\` 給 ${target_user.toString()} ?`)
                .setEmbedFooter();

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, true],
    help: ["查看指令", "查看指令",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author || !message.guild) return;
            let specific_cmd = args[0];

            const [emoji_cross, emoji_slash] = await get_emojis(["crosS", "slash"], client);

            if (specific_cmd && specific_cmd !== "help") {
                specific_cmd = redirect_data[specific_cmd] ?? specific_cmd;
                const embed = await get_help_command("rpg", specific_cmd, message.guild.id, null, client);

                if (!embed) {
                    const error_embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 我不認識 ${specific_cmd}`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [error_embed] };
                    return await message.reply({ embeds: [error_embed] });
                };

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`help|${message.author.id}`)
                .setPlaceholder(`指令教學`)
                .addOptions([
                    {
                        label: `一般`,
                        description: `查詢類型的指令`,
                        value: `general`,
                    },
                    {
                        label: `音樂`,
                        description: `想要聽音樂的靠過來`,
                        value: `music`,
                    },
                    {
                        label: `rpg系統`,
                        description: `找不到手游玩就來玩RPG`,
                        value: `rpg`,
                    },
                    {
                        label: `特殊`,
                        description: `特殊功能等你去挖掘`,
                        value: `special`,
                    },
                    {
                        label: `開發者使用`,
                        description: `開發者使用`,
                        value: `dev`,
                    },
                ]);

            const row = /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(selectMenu));

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setDescription(`
嗨嗨 d(･∀･)b 我是${client.name}，
我的目標是讓你快速建立優質的中文 Discord 伺服器!

${emoji_slash} 正在努力轉移部分功能的指令到斜線指令
-# 免責聲明：我是${client.author}參考 YEE式機器龍 製作的，${client.author}不是機器龍的開發者owob`)
                .setEmbedFooter()
                .setEmbedAuthor(client);

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, false],
    privacy: ["隱私權", "修改隱私權",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const [emoji_backpack, emoji_pet, emoji_shield] = await get_emojis(["bag", "pet", "shield"], client);

            rpg_data.privacy.sort((a, b) => {
                /** @type {{[key: string]: number}} */
                const order = {
                    [PrivacySettings.Money]: 0,
                    [PrivacySettings.Inventory]: 1,
                    [PrivacySettings.Partner]: 2
                };

                return order[a] - order[b];
            });

            let text;
            if (rpg_data.privacy.length > 0) {
                text = rpg_data.privacy
                    .join("、")
                    .replace(PrivacySettings.Money, "金錢")
                    .replace(PrivacySettings.Inventory, "背包")
                    .replace(PrivacySettings.Partner, "夥伴");
            } else text = "無";

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_shield} | 隱私權設定`)
                .setDescription(`
為保護每個人的隱私，可以透過下拉選單來設定 **允許被公開的** 資訊

目前的設定為：\`${text}\``)
                .setEmbedFooter();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`rpg_privacy_menu|${message.author.id}`)
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
                    },
                ]);

            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(selectMenu));

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, false],
    eat: ["吃東西", "吃東西回復飽食度",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const user = message.author;
            const userid = user?.id;
            if (!userid) return;

            const [emoji_cross, emoji_drumstick] = await get_emojis(["crosS", "drumstick"], client);

            if (args.length > 0) {
                const extra_embeds = [];

                const food_id = args[0];
                const food_name = get_name_of_id(food_id);

                // let amount = args[1]?.toLowerCase().trim() || 1;
                // if (amount === "all") amount = await get_number_of_items(item, userid);
                // amount = parseInt(amount);
                // if (isNaN(amount)) amount = 1;

                if (!foods[food_id]) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 這東東不能吃ㄟ`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                if (!rpg_data.inventory[food_id]) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有這個食物`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                let amount = await get_amount(food_id, user, args[1]);
                const force_eat = (args[2] ?? args[1])?.toLowerCase().trim() === "force";
                // if (force_eat && !amount) amount = 1;

                if (amount < 1) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 錯誤的數量`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                if (amount > rpg_data.inventory[food_id]) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有那麼多的食物`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                const add = food_data[food_id]
                if (!add) {
                    const embeds = await get_loophole_embed(`food_data[${food_id}] is ${add}`, null, client);

                    logger.warn(`食物${food_name} (${food_id})在food_data中沒有這個食物的數據`);

                    if (mode === 1) return { embeds };
                    return await message.reply({ embeds });
                };

                if (rpg_data.hunger >= max_hunger) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你已經吃太飽了`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                let newadd = add * amount;
                if ((rpg_data.hunger + newadd) > max_hunger) {
                    const old_amount = amount;

                    const new_amount = Math.floor((max_hunger - rpg_data.hunger) / add);
                    const new_newadd = add * new_amount;

                    if (!force_eat) {
                        amount = new_amount;
                        newadd = new_newadd;
                    };

                    if (amount < 1) {
                        const embed = new EmbedBuilder()
                            .setColor(embed_error_color)
                            .setTitle(`${emoji_cross} | 你已經吃太飽了`)
                            .setDescription("吃不下了拉 :(")
                            .setEmbedFooter();

                        if (mode === 1) return { embeds: [embed] };
                        return await message.reply({ embeds: [embed] });
                    };

                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你會吃太飽撐死!`)
                        .setDescription(`你想吃掉\`${old_amount.toLocaleString()}\` 個 \`${food_name}\`\n但你最多只能吃掉 \`${amount}\` 個 \`${food_name}\``)
                        .setEmbedFooter();

                    if (force_eat) {
                        embed.setColor(embed_warn_color)
                            .setTitle(`${emoji_cross} | 爆體保護被停用！`)
                            .setDescription(`你停用了爆體保護，浪費了 \`${(rpg_data.hunger + newadd) - max_hunger}\` 飽食度`);
                    };

                    extra_embeds.push(embed);
                };

                rpg_data.hunger += newadd;
                rpg_data.hunger = Math.min(rpg_data.hunger, max_hunger);

                rpg_data.inventory[food_id] -= amount;
                await save_rpg_data(userid, rpg_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_drumstick} | 成功進食`)
                    .setDescription(`你吃下了 \`${amount}\` 個 \`${food_name}\`，你的體力值增加到了 \`${rpg_data.hunger}\``)
                    .setEmbedFooter();

                const embeds = [embed, ...extra_embeds];

                if (mode === 1) return { embeds };
                return await message.reply({ embeds });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_drumstick} | 可以吃的東西`)
                    .setDescription(`體力值: ${rpg_data.hunger} / ${max_hunger} 點`)
                    .setEmbedFooter();

                /** @type {{[key: string]: number}} */
                const food_crops_items = {};
                /** @type {{[key: string]: number}} */
                const food_meat_items = {};

                // 遍歷背包中的物品並分類
                for (const [item, amount] of Object.entries(rpg_data.inventory || {})) {
                    if (amount <= 0) continue;
                    // if (!Object.keys(foods).includes(item)) continue;
                    if (!Object.keys(food_data).includes(item)) continue;
                    // if (item.startsWith("raw_")) continue;

                    if (Object.keys(foods_crops).includes(item)) {
                        food_crops_items[item] = amount;
                    } else if (Object.keys(foods_meat).includes(item) || Object.keys(fish).includes(item)) {
                        food_meat_items[item] = amount;
                    };
                };

                if (
                    Object.keys(food_crops_items).length === 0 &&
                    Object.keys(food_meat_items).length === 0
                ) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有任何食物`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };

                const [emoji_farmer, emoji_cow, emoji_food, emoji_store] = await get_emojis(["farmer", "cow", "food", "store"], client);

                const categories = [
                    { items: food_crops_items, name: `${emoji_farmer} 農作物` },
                    { items: food_meat_items, name: `${emoji_cow} 肉類` },
                ];

                let errors = [];
                const embed_field_value_limit = 1024;

                for (const category of categories) {
                    try {
                        const category_items = category.items;
                        if (Object.keys(category_items).length > 0) {
                            const itemsTexts = Object.entries(category_items)
                                .map(([item, amount]) => `${get_name_of_id(item)} \`${amount.toLocaleString()}\` 個 (回復 \`${food_data[item]}\` ${emoji_drumstick})`);

                            const longestItemNameLength = Math.max(...itemsTexts.map(item => item.length));
                            const itemsPerChunk = Math.floor(embed_field_value_limit / longestItemNameLength);
                            const chunks = chunkArray(itemsTexts, itemsPerChunk);

                            for (const chunk of chunks) {
                                const itemsText = chunk.join("\n");

                                embed.addFields({ name: category.name, value: itemsText });
                            };
                        };
                    } catch (err) {
                        const errorStack = util.inspect(err, { depth: null });

                        errors.push(errorStack);
                    };
                };

                const howToEatButton = new ButtonBuilder()
                    .setCustomId(`help|any|rpg|eat`)
                    .setLabel("如何吃食物")
                    .setEmoji(emoji_food)
                    .setStyle(ButtonStyle.Primary);

                const buyFoodButton = new ButtonBuilder()
                    .setCustomId(`help|any|rpg|buy`)
                    .setLabel("購買食物")
                    .setEmoji(emoji_store)
                    .setStyle(ButtonStyle.Primary);

                const row =
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder()
                        .addComponents(howToEatButton, buyFoodButton));

                if (errors.length > 0) {
                    const embeds = await get_loophole_embed(errors.join("\n"), null, client);

                    if (mode === 1) return { embeds };
                    await message.reply({ embeds });
                };

                if (mode === 1) return { embeds: [embed], components: [row] };
                return await message.reply({ embeds: [embed], components: [row] });
            };
        }, false],
    sell: ["出售", "出售物品給系統",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const item_name = get_name_of_id(args[0]);
            const item_id = get_id_of_name(args[0]);

            const isFarmer = rpg_data.job === "farmer";
            const isHoe = item_id?.endsWith("hoe") ?? false;

            const emoji_trade = await get_emoji("trade", client);

            if (!item_exists(item_id)) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 未知的物品`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (!rpg_data.inventory[item_id]) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你沒有這個物品哦`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const amount = await get_amount(item_id, message.author, args[1]) || 1;
            if (rpg_data.inventory[item_id] < amount) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你沒有那麼多的物品`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (cannot_sell.includes(item_id)) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 這個物品不能販賣`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (isFarmer && isHoe) {
                const emoji_cross = await get_emoji("crosS", client);

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 農夫不能販賣鋤頭`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const price = sell_data[item_id];
            if (!price) {
                const embeds = await get_loophole_embed(`詳細資訊: sell_data[${item_id}]為${price}`, null, client);

                if (mode === 1) return { embeds };
                return await message.reply({ embeds });
            };
            const total_price = Math.round(price * amount);

            const confirm_button = new ButtonBuilder()
                .setCustomId(`sell|${message.author.id}|${item_id}|${amount}|${total_price}`)
                .setLabel("確認")
                .setStyle(ButtonStyle.Success);

            const cancel_button = new ButtonBuilder()
                .setCustomId(`cancel|${message.author.id}`)
                .setLabel("取消")
                .setStyle(ButtonStyle.Danger);

            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(cancel_button, confirm_button));

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_trade} | 出售確認`)
                .setDescription(`你將要出售 \`${amount.toLocaleString()}\` 個 \`${item_name}\`，共獲得 \`${total_price.toLocaleString()}$\``)
                .setEmbedFooter();

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, true],
    top: ["金錢排行榜", "who!誰是世界首富!是不是你!",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const users = client.users.cache.values();

            const userDataList = await Promise.all(
                Array.from(users).map(async (user) => {
                    const userid = user.id;
                    const user_rpg_data = await load_rpg_data(userid);
                    return {
                        user,
                        money: user_rpg_data.money,
                    };
                }),
            );

            userDataList.sort((a, b) => b.money - a.money);

            const emoji_top = await get_emoji("top", client);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_top} | 金錢排行榜 Top 10`)
                .setEmbedFooter();

            let description = "";
            const topUsers = userDataList.slice(0, 10);

            for (let i = 0; i < topUsers.length; i++) {
                const userData = topUsers[i];
                const rank = i + 1;

                description += `${rank}. ${userData.user.toString()} - \`${userData.money.toLocaleString()}$\`\n`;
            };

            if (description === "") {
                description = "奇怪餒，目前怎麼可能還沒有任何用戶擁有金錢？";
            };

            embed.setDescription(description);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    last: ["「倒數」金錢排行榜", "讓我們看看誰最窮!嘿嘿",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const users = client.users.cache.values();

            const userDataList = await Promise.all(
                Array.from(users).map(async (user) => {
                    const userid = user.id;
                    const user_rpg_data = await load_rpg_data(userid);
                    return {
                        user,
                        money: user_rpg_data.money,
                    };
                }),
            );

            userDataList.sort((a, b) => a.money - b.money);

            const emoji_decrease = await get_emoji("decrease", client);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_decrease} | 「倒數」金錢排行榜 Top 10`)
                .setEmbedFooter();

            let description = "";
            const topUsers = userDataList.slice(0, 10);

            for (let i = 0; i < topUsers.length; i++) {
                const userData = topUsers[i];
                const rank = i + 1;

                description += `${rank}. ${userData.user.toString()} - \`${userData.money.toLocaleString()}$\`\n`;
            };

            if (description === "") {
                description = "奇怪餒，目前怎麼可能還沒有任何用戶擁有金錢？我壞掉了？";
            };

            embed.setDescription(description);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, false],
    name: ["顯示物品名稱", "透過物品ID顯示物品名稱",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const item_id = args[0];

            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle("❌ | 請輸入物品ID")
                    .setDescription("請輸入物品ID以顯示物品名稱")
                    .setEmbedFooter();

                return await message.reply({ embeds: [embed] });
            };

            const item_name = get_name_of_id(item_id, null);
            if (!item_name) {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle("❌ | 物品ID不存在")
                    .setDescription("請輸入正確的物品ID以顯示物品名稱")
                    .setEmbedFooter();

                return await message.reply({ embeds: [embed] });
            };

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("📝 | 物品名稱")
                .setDescription(`物品ID: \`${item_id}\`\n物品名稱: \`${item_name}\``)
                .setEmbedFooter();


            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, true],
    id: ["顯示物品ID", "透過物品名稱顯示物品ID",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const item_name = args.join(" ");

            if (!args[0]) {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle("❌ | 請輸入物品名稱")
                    .setDescription("請輸入物品名稱以顯示物品ID")
                    .setEmbedFooter();

                return await message.reply({ embeds: [embed] });
            };

            const item_id = get_id_of_name(item_name, null);
            if (!item_id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle("❌ | 物品名稱不存在")
                    .setDescription("請輸入正確的物品名稱以顯示物品ID")
                    .setEmbedFooter();

                return await message.reply({ embeds: [embed] });
            };

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("📝 | 物品ID")
                .setDescription(`物品名稱: \`${item_name}\`\n物品ID: \`${item_id}\``)
                .setEmbedFooter();

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }, true],
    marry: ["結婚", "與某人結婚",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const marry_info = rpg_data?.marry ?? {};
            const marry_with = marry_info.with ?? null;
            const married = marry_info.status ?? false;

            const emoji_cross = await get_emoji("crosS", client);

            const target_users = await mentions_users(message);
            const target_user = target_users.first();
            if (!target_user) {
                if (!married) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 錯誤的使用者`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                } else {
                    const embed = await show_marry_info(rpg_data, client);

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };
            };

            if (target_user.id === message.author.id) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 欸不是 不要跟自己結婚好嘛>_<`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            if (married) {
                if (marry_with === target_user.id) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你那麼健忘哦? 他都跟你結過婚了!`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 還敢偷找小三!`)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };
            };

            const t_rpg_data = await load_rpg_data(target_user.id);
            const t_marry_info = t_rpg_data?.marry ?? {};
            const t_married = t_marry_info.status ?? false;
            if (t_married) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你的要結婚對象已經有其他人了!`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`❤️ | 求婚`)
                .setDescription(`${message.author.toString()} 向你求婚!`)
                .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Drawn_love_hearts.svg/1200px-Drawn_love_hearts.svg.png")
                .setEmbedFooter();

            const deny_button = new ButtonBuilder()
                .setCustomId(`cancel|${target_user.id}|marry`)
                .setLabel("拒絕")
                .setStyle(ButtonStyle.Danger);

            const accept_button = new ButtonBuilder()
                .setCustomId(`marry_accept|${target_user.id}|${message.author.id}`)
                .setLabel("我願意!")
                .setEmoji("❤️")
                .setStyle(ButtonStyle.Success);

            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(deny_button, accept_button));

            if (mode === 1) return { content: `${target_user.toString()}`, embeds: [embed], components: [row] };
            return await message.reply({ content: `${target_user.toString()}`, embeds: [embed], components: [row] });
        }, async (_, userid) => {
            const rpg_data = await load_rpg_data(userid);
            const marry_info = rpg_data?.marry ?? {};
            const married = marry_info.status ?? false;

            return !married;
        }],
    divorce: ["結婚", "與某人結婚",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const emoji_cross = await get_emoji("crosS", client);

            const userid = message.author.id;

            const marry_info = rpg_data.marry ?? {};
            const married = marry_info.status ?? false;

            if (!married) {
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji_cross} | 你還沒有結過婚ㄝ`)
                    .setEmbedFooter();

                if (mode === 1) return { embeds: [embed] };
                return await message.reply({ embeds: [embed] });
            };

            const with_UserId = marry_info.with;

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("⚠ | 離婚確認")
                .setDescription(`你確定你不愛 <@${with_UserId}> 了嗎?!`)
                .setEmbedFooter();

            const confirm_button = new ButtonBuilder()
                .setCustomId(`divorce|${userid}|${with_UserId}`)
                .setLabel("確定")
                .setStyle(ButtonStyle.Danger);

            const deny_button = new ButtonBuilder()
                .setCustomId(`cancel|${userid}`)
                .setLabel("取消")
                .setStyle(ButtonStyle.Success);

            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(confirm_button, deny_button));

            if (mode === 1) return { embeds: [embed], components: [row] };
            return await message.reply({ embeds: [embed], components: [row] });
        }, async (_, userid) => {
            const rpg_data = await load_rpg_data(userid);

            const marry_info = rpg_data.marry ?? {};
            const married = marry_info.status ?? false;

            return !married;
        }],
    job: ["職業", "選擇職業",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            const [emoji_job, emoji_nekoWave] = await get_emojis(["job", "nekoWave"], client);

            if (args?.[0] === "fightjob") {
                return await redirect({ client, message, command: "fj", mode });
            };

            const userid = message.author.id;
            const job = rpg_data.job;

            if (job) {
                const job_name = jobs?.[job]?.name;

                const embed = new EmbedBuilder()
                    .setColor(embed_job_color)
                    .setTitle(`${emoji_job} | 你是一名 ${job_name}`)
                    .setDescription(jobs[job].desc)
                    .setEmbedFooter();

                const change_job_button = new ButtonBuilder()
                    .setCustomId(`job_transfer|${userid}`)
                    .setLabel("轉職?")
                    .setStyle(ButtonStyle.Primary);

                const row =
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder()
                        .addComponents(change_job_button));

                if (mode === 1) return { embeds: [embed], components: [row] };
                return await message.reply({ embeds: [embed], components: [row] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(embed_job_color)
                    .setTitle(`${emoji_job} | 請選擇你的職業`)
                    .setDescription
                    (`
轉職後一個禮拜不能更動職業!

${emoji_nekoWave} 如果出現紅字 \`Invalid Form Body\` 的錯誤訊息
，請確認 \`Discord\` 有更新到最新版本
                `)
                    .setEmbedFooter();

                const rows = await choose_job_row(userid);

                if (mode === 1) return { embeds: [embed], components: rows };
                return await message.reply({ embeds: [embed], components: rows });
            };
        }, false],
    daily: ["簽到", "簽到",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            const [[signed, _], [emoji_cross, emoji_calendar]] = await Promise.all([
                hasSignedTodayOrBrokeSign(rpg_data.daily),
                get_emojis(["crosS", "calendar"], client),
            ]);

            const DM_enabled = rpg_data.daily_msg;

            const switch_config_button = new ButtonBuilder()
                .setCustomId(`daily|any|${DM_enabled ? "disable" : "enable"}-dm`)
                .setLabel(`${DM_enabled ? "不想" : "想"}收到機器犬的私訊ㄇ`)
                .setStyle(ButtonStyle.Secondary);

            let embed;
            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder());

            if (signed) {
                embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你今天已經簽到過了ㄟ`)
                    .setEmbedFooter();
            } else {
                if (message.guild && daily_sign_guildIDs.includes(message.guild.id)) return;

                embed = new EmbedBuilder()
                    .setColor(embed_sign_color)
                    .setTitle(`${emoji_calendar} | 到我們ㄉ伺服器聊天就會自動簽到!`)
                    .setDescription("加入我們伺服器接收機器人最新訊息ㄅ")
                    .setEmbedFooter();

                const invite_button = new ButtonBuilder()
                    .setLabel(`${client.name}群組`)
                    .setURL(INVITE_LINK)
                    .setStyle(ButtonStyle.Link);

                row.addComponents(invite_button);
            };

            row.addComponents(switch_config_button);

            if (mode === 1) return { embeds: [embed], components: [row] };
            await message.reply({ embeds: [embed], components: [row] });
        }, false],
    fightjob: ["選擇冒險職業", "選擇冒險職業",
        /**
         *
         * @param {Object} datas
         * @param {DogClient} datas.client
         * @param {Message | MockMessage} datas.message
         * @param {import("../../utils/config.js").RpgDatabase} datas.rpg_data
         * @param {any[]} datas.args
         * @param {0 | 1} datas.mode
         * @param {{ item: string, amount: number }} datas.random_item
         * @returns {Promise<any>}
         */
        async function ({ client, message, rpg_data, args, mode, random_item }) {
            if (!message.author) return;

            /** @type {string | null} */
            const current_fightjob = rpg_data.fightjob;

            /** @type {{ emoji: string, HP: number, ATK: number, name: string } | null | undefined} */
            const current_fightjob_data = current_fightjob
                ? fightjobs[current_fightjob]
                : null;

            const current_fightjob_str = current_fightjob_data
                ? `${await get_emoji(current_fightjob_data.emoji)} \`${current_fightjob_data.name}\``
                : "\`無\`";

            const emoji_adventure = await get_emoji("adventure", client);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${emoji_adventure} | 選擇冒險職業`)
                .setDescription(`你現在的冒險職業是: ${current_fightjob_str}\n冒險職業選擇之後可以進行更改`)
                .setEmbedFooter();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`fightjob|${message.author.id}`)
                .setPlaceholder("選擇冒險職業")
                .addOptions(
                    ...await Promise.all(
                        Object.entries(fightjobs)
                            .map(async ([fj_id, data]) => {
                                const emoji = await get_emoji(data.emoji, client);

                                return new StringSelectMenuOptionBuilder()
                                    .setEmoji(emoji)
                                    .setLabel(data.name)
                                    .setDescription(`血量: ${data.HP} | 攻擊力: ${data.ATK}`)
                                    .setValue(fj_id);
                            }),
                    ),
                );

            const cancelButton = new ButtonBuilder()
                .setCustomId(`cancel|${message.author.id}`)
                .setLabel("取消選擇")
                .setStyle(ButtonStyle.Danger);

            const row =
                /** @type {ActionRowBuilder<StringSelectMenuBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(selectMenu));

            const row2 =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(cancelButton));

            if (mode === 1) return { embeds: [embed], components: [row, row2] };
            return await message.reply({ embeds: [embed], components: [row, row2] });
        }, false],
};

for (const [from, target] of Object.entries(redirect_data)) {
    rpg_commands[from] = rpg_commands[target];
};

/**
 * Find the redirect target(s) from a redirect source
 * @param {string} id
 * @returns {string[]}
 */
function find_redirect_targets_from_id(id) {
    return Object.entries(redirect_data).filter(([key, value]) => value === id).map(([key, value]) => key);
};

/**
 * @param {Object} options
 * @param {DogClient} options.client - Discord Client
 * @param {Message | MockMessage} options.message - Discord Message
 * @param {boolean} [options.d=false]
 * @param {boolean} [options.dm=false] - 私訊模式
 * @param {0 | 1} [options.mode=0] - 請求模式 - 0: 預設模式 - 1: 取得訊息回傳參數
 * @returns {Promise<Message | { [k: string]: any } | null | void>}
*/
async function rpg_handler({ client, message, d = false, dm = false, mode = 0 }) {
    if (![0, 1].includes(mode)) throw new TypeError("args 'mode' must be 0(default) or 1(get message response args)");

    if (!d && message.author?.bot) return null;

    const guildID = message.guild?.id ?? null;

    if (!dm) {
        if (!guildID) return null;

        const data = await loadData(guildID);
        if (!data["rpg"]) return null;
    };

    let content = message.content?.toLowerCase().trim();
    if (!content) return null;

    const allowedPrefix = dm || !guildID
        ? "&"
        : await startsWith_prefixes(guildID, content);

    if (
        (dm || !guildID) && allowedPrefix
            ? content.startsWith(allowedPrefix)
            : !allowedPrefix
    ) return null;

    if (allowedPrefix) content = content.replace(allowedPrefix, "").trim();
    let [command, ...args] = content.split(" ");

    // 移除所有元素的空白字元
    args = args.map(arg => arg.trim());

    // 移除所有空白的元素 ""
    args = args.filter(arg => arg !== "");

    command = command.toLowerCase().trim();
    command = command in redirect_data
        ? redirect_data[command]
        : command;

    if (command.length === 0 || content === allowedPrefix) return null;

    if (!message.author) return;

    const userid = message.author.id;
    let rpg_data = await load_rpg_data(userid);

    const [wrongJobEmbed, row] = await wrong_job_embed(rpg_data, command, userid, null, client);
    if (wrongJobEmbed) {
        if (mode === 1) return { embeds: [wrongJobEmbed], components: row ? [row] : [] };

        return await message.reply({ embeds: [wrongJobEmbed], components: row ? [row] : [] });
    };

    const cmd_data = rpg_commands[command];

    if (!cmd_data) {
        const commands = Object.keys(rpg_commands);
        const emoji_cross = await get_emoji("crosS", client);

        command = command.replace(/[^a-zA-Z0-9]/g, "");

        const firstChar = command.charAt(0);
        const similarCommands = commands.filter(cmd => cmd.startsWith(firstChar) && !rpg_commands[cmd][3] && !redirect_data[cmd]);

        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | 是不是打錯指令了？我找到了你可能想要的指令`)
            .setEmbedFooter();

        if (similarCommands.length === 0) return null;

        const buttons = similarCommands.map(cmd => {
            return new ButtonBuilder()
                .setCustomId(`choose_command|${userid}|${cmd}`)
                .setLabel(cmd)
                .setStyle(ButtonStyle.Primary);
        });

        // 將按鈕分成每組最多5個

        /** @type {ActionRowBuilder<ButtonBuilder>[]} */
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row =
                /** @type {ActionRowBuilder<ButtonBuilder>} */
                (new ActionRowBuilder()
                    .addComponents(buttons.slice(i, i + 5)));

            rows.push(row);
        };

        if (rows.length > 5) rows.length = 5;

        if (mode === 1) return { embeds: [embed], components: rows };
        return await message.reply({ embeds: [embed], components: rows });
    };

    const execute = cmd_data[2];
    const action = cmd_data[0];

    if (rpg_work.includes(command)) {
        if (rpg_data.hunger <= 0) {
            const food_items = Object.keys(foods);
            let found_food = food_items.filter(food => Object.keys(rpg_data.inventory).includes(food) && food_data[food] < max_hunger)[0];

            if (found_food) {
                // 嘗試自動吃掉一個食物
                if (typeof rpg_commands.eat?.[2] === "function") {
                    const eatPromise = rpg_commands.eat[2]({
                        client,
                        message,
                        rpg_data,
                        args: [found_food, "all"],
                        mode: 1
                        // {client, message, rpg_data, data, args, mode, random_item }
                    });


                    // 5秒超時
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error("eat timeout")), 5000);
                    });

                    const res = await Promise.race([
                        eatPromise,
                        timeoutPromise,
                    ]);

                    if (res.embeds && res.embeds.length > 1) {
                        res.embeds.length = 1;
                    };

                    if (mode === 1) return res;
                    await message.reply(res);
                };
            };

            rpg_data = await load_rpg_data(userid);

            if (rpg_data.hunger <= 0) {
                if (!found_food) {
                    const emoji_cross = await get_emoji("crosS", client);

                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你已經餓到沒有食物可以吃了！請先補充食物！`);

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                } else { // 正常是不會發生這種事情拉
                    const emoji_cross = await get_emoji("crosS", client);

                    const embed = new EmbedBuilder()
                        .setTitle(`${emoji_cross} | 你的體力不足了！`)
                        .setColor(embed_error_color)
                        .setEmbedFooter();

                    if (mode === 1) return { embeds: [embed] };
                    return await message.reply({ embeds: [embed] });
                };
            };

        };
    };

    if (rpg_cooldown[command] || ["cd", "cdd"].includes(command)) {
        // 檢查上次執行時間是否為今天
        if (rpg_data.lastRunTimestamp && rpg_data.lastRunTimestamp[command]) {
            const lastRunDate = new Date(rpg_data.lastRunTimestamp[command]);
            const today = new Date();

            // 檢查是否為同一天 (比較年、月、日)
            if (lastRunDate.getFullYear() !== today.getFullYear() ||
                lastRunDate.getMonth() !== today.getMonth() ||
                lastRunDate.getDate() !== today.getDate()) {

                // 如果不是同一天，重置計數
                rpg_data.count = {};
                // rpg_data.lastRunTimestamp = {};
            };
        };

        for (const cmd of rpg_work) {
            // 初始化計數器
            if (!rpg_data.count[cmd]) {
                rpg_data.count[cmd] = 0;
            };

            if (!rpg_data.lastRunTimestamp[cmd]) {
                rpg_data.lastRunTimestamp[cmd] = 0;
            };
        };

        const { is_finished, remaining_time } = is_cooldown_finished(command, rpg_data);

        // 冷卻
        if (!is_finished) {
            // if (!is_finished && message.channel.id !== "1432642462840524853") {
            if (mode === 1) return { embeds: [await get_cooldown_embed(remaining_time, action, rpg_data.count[command], null, client)] };
            return await message.reply({ embeds: [await get_cooldown_embed(remaining_time, action, rpg_data.count[command], null, client)] });
        };

        rpg_data.hunger -= 1;

        // 增加計數
        if (rpg_work.includes(command)) {
            rpg_data.count["work"]++;
        } else {
            rpg_data.count[command]++;
        };

        rpg_data.lastRunTimestamp[command] = Date.now();
        await save_rpg_data(userid, rpg_data);
    };

    const { failed, item, amount } = get_random_result(command);
    if (failed && rpg_work.includes(command)) {
        // rpg_data.hunger += 1;
        // await save_rpg_data(userid, rpg_data);
        if (item) {
            if (mode === 1) return { embeds: [await get_failed_embed(item, rpg_data, null, client)] };
            await message.reply({ embeds: [await get_failed_embed(item, rpg_data, null, client)] });
        };

        return;
    };

    let need_arg = false;
    const need_arg_func = rpg_commands[command][3];

    if (need_arg_func) {
        if (typeof need_arg_func === "function") {
            need_arg = await need_arg_func(client, userid);
        } else {
            need_arg = need_arg_func;
        };
    };

    if (need_arg && !args[0]) {
        const embed = await get_help_command("rpg", command, guildID, null, client);

        if (embed) {
            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };
        return;
    };

    const result = await execute({ client, message, rpg_data, args, mode, random_item: { item, amount } });
    if (mode === 1) return result;
};

/**
 * Get a random gain of a rpg work
 * @param {string} category - work command or ID
 * @returns {{ failed: boolean, item: string | null, amount: number }}
 */
function get_random_result(category) {
    const datas = probabilities[category];

    const error_template = {
        failed: true,
        item: null,
        amount: 0,
    };

    if (!datas || typeof datas !== "object") return error_template;

    const items = Object.keys(datas);
    if (items.length === 0) return error_template;

    let totalWeight = 0;
    const cumulativeWeights = [];
    for (const item of items) {
        const weight = datas[item][0];

        totalWeight += weight;
        cumulativeWeights.push(totalWeight);
    };

    // Choose item randomly
    const rand = Math.random() * totalWeight;
    let selectedItem = null;
    for (let i = 0; i < cumulativeWeights.length; i++) {
        if (rand < cumulativeWeights[i]) {
            selectedItem = items[i];
            break;
        };
    };

    if (!selectedItem) return error_template;

    const [minAmount, maxAmount] = datas[selectedItem];
    const amount = randint(minAmount, maxAmount);

    const is_failed = failed.includes(selectedItem);

    return { failed: is_failed, item: selectedItem, amount };
}

module.exports = {
    name: Events.MessageCreate,
    /**
     *
     * @param {DogClient} client
     * @param {Message} message
     */
    execute: async function (client, message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildID = message.guild?.id ?? null;

        /** @type {string[]} */
        let inpref = guildID ? [] : ["&"];

        if (guildID) {
            let data;

            [data, inpref] = await Promise.all([
                loadData(guildID),
                InPrefix(guildID, message.content.trim()),
            ]);

            if (!data["rpg"] || !inpref?.length) return;
        };

        if (client.lock.rpg_handler.hasOwnProperty(userId)) {
            const emoji_cross = await get_emoji("crosS", client);

            const running_cmd = client.lock.rpg_handler[userId];

            if (!running_cmd) delete client.lock.rpg_handler[userId];

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你已經在執行 ${running_cmd} 指令了`);

            return await message.reply({ embeds: [embed] });
        };

        try {
            const command = message.content.split(" ")[0].toLowerCase();

            if (rpg_commands[command]) {
                let cmdName = command;

                for (const pref of inpref) {
                    cmdName = cmdName.replace(pref, "");
                };

                client.lock.rpg_handler[userId] = cmdName;
            };

            // 超時機制
            const TIMEOUT = 30000; // 30 秒超時
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("指令執行超時")), TIMEOUT);
            });

            await Promise.race([
                rpg_handler({ client, message, dm: !guildID }),
                timeoutPromise,
            ]);
        } catch (error) {
            const errorStack = util.inspect(error, { depth: null });

            if (error instanceof Error && error.message === "指令執行超時") {
                logger.error(`RPG 指令執行超時: userId=${userId}, command=${client.lock.rpg_handler[userId]}`);
            } else {
                logger.error(`處理rpg遊戲訊息時發生錯誤: ${errorStack}`);
            };

            const loophole_embeds = await get_loophole_embed(errorStack, null, client);
            await message.reply({ embeds: loophole_embeds });
        } finally {
            delete client.lock.rpg_handler[userId];
        };
    },

    rpg_cooldown,
    rpg_work,
    rpg_commands,
    redirect_data,
    redirect_data_reverse,
    rpg_actions,
    redirect,
    rpg_handler,
    get_number_of_items,
    find_redirect_targets_from_id,
    MockMessage,
};
