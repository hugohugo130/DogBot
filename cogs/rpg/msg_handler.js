const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Message, User } = require("discord.js");
const { get_members_of_guild } = require("../../utils/discord.js");
const { get_logger, getCallerModuleName } = require("../../utils/logger.js");
const { prefix, embed_default_color, embed_error_color } = require("../../utils/config.js");
const { randint, choice } = require("../../utils/random.js");
const { BetterEval, get_loophole_embed, get_emoji, add_money, remove_money, ls_function, is_cooldown_finished } = require("../../utils/rpg.js");
const DogClient = require("../../utils/customs/client.js");

const max_hunger = 20;
const logger = get_logger();

class MockMessage {
    constructor(content = null, channel = null, author = null, guild = null, mention_user = null) {
        this.content = content;
        this.channel = channel;
        this.author = author;
        this.guild = guild;
        this.mentions = {
            users: {
                first: () => mention_user,
                cache: new Map([[mention_user?.id, mention_user]])
            }
        };
    };

    async reply() {
        return;
    };

    async delete() {
        return;
    };
};

/**
 * 
 * @param {string} name 
 * @param {string} userid 
 * @returns {number}
 */
function get_number_of_items(name, userid) {
    const { load_rpg_data } = require("../../utils/file.js");
    const { get_id_of_name } = require("../../utils/rpg.js");

    const rpg_data = load_rpg_data(userid);
    const items = rpg_data.inventory;

    // 如果輸入的是中文名稱，找到對應的英文key
    let item_key = get_id_of_name(name);

    if (!item_key) return 0;

    if (!items[item_key]) return 0;
    return items[item_key];
};

/**
 * 
 * @param {string} item 
 * @param {User} user 
 * @param {number} amount 
 * @returns {number}
 */
function get_amount(item, user, amount) {
    const default_value = 1;

    if (!amount && amount !== 0) return default_value;
    amount = amount.toLowerCase().trim();

    if (amount === "all" && item && user) {
        return get_number_of_items(item, user.id);
    };

    amount = parseInt(amount);
    if (isNaN(amount)) amount = default_value;

    return amount;
};

async function redirect({ client, message, command, mode = 0 }) {
    /*
    m = 0: 也回復訊息
    m = 1: 只回傳訊息參數
    */

    const { mentions_users } = require("../../utils/message.js");
    if (![0, 1].includes(mode)) throw new TypeError("Invalid mode");

    if (command.includes(prefix)) {
        try {
            throw new Error(`傳送包含${prefix}的指令名已棄用，現在只需要傳送指令名稱`);
        } catch (e) {
            process.emitWarning(e.stack, {
                type: "DeprecationWarning",
                code: "HR_COMMAND_NAME_WITH_HR",
                hint: `請使用不含${prefix}的指令名稱`
            });
        };
    };

    if (!command.includes(prefix)) command = prefix + command;
    const msg = new MockMessage(command, message.channel, message.author, message.guild, (await mentions_users(message)).first());
    const message_args = await rpg_handler({ client, message: msg, d: true, mode: 1 });

    if (mode === 1) return message_args;
    return await message.reply(message_args);
};

/**
 * 
 * @param {DogClient} client 
 * @param {EmbedBuilder} embed 
 * @param {string} [text=""]
 * @param {object | string | null} [rpg_data=null] 顯示飽食度，傳入rpg_data或user id
 * @param {boolean} [force=false] text參數將不會增加飽食度或機器犬文字
 * @returns {EmbedBuilder}
 */
function setEmbedFooter(client = global._client, embed, text = "", rpg_data = null, force = false) {
    const { load_rpg_data } = require("../../utils/file.js");

    if (text.includes("飽食度剩餘")) logger.warn(`[DEPRECATED] give rpg_data or user id instead add to the text\ncalled from ${getCallerModuleName(null)}`)
    let data;
    if (rpg_data) {
        if (rpg_data instanceof String) { // userid
            data = load_rpg_data(rpg_data);
        } else if (rpg_data instanceof Object) { // rpg_data
            data = rpg_data;
        };
    };

    if (!force && data) text += `飽食度剩餘 ${data.hunger}`;
    if (!force) text += "\n狗狗機器犬 ∙ 由哈狗製作";
    text = text.trim();

    embed.setFooter({
        text,
        iconURL: client?.user?.displayAvatarURL({ dynamic: true }),
    });

    return embed;
};

/**
 * 
 * @param {DogClient} client 
 * @param {EmbedBuilder} embed 
 * @param {string} author 
 */
function setEmbedAuthor(client = global._client, embed, author = "") {
    if (!author) author = client.name;

    embed.setAuthor({
        name: author,
        iconURL: client?.user?.displayAvatarURL({ dynamic: true }),
    });

    return embed;
};

const rpg_emojis = {
    herd: "cow",
    hew: "wood",
    fell: "wood",
    wood: "wood",
    mine: "ore",
    shop: "store",
    ls: "backpack",
    buy: "store",
    sell: "trade",
    cd: "timer",
};

/*
command_name: "{c} will be replaced with the command execution times"
*/
const rpg_cooldown = {
    // 單位: 秒
    // mine: "180 + {c} * 30",
    // hew: "180 + {c} * 30",
    // herd: "195 + {c} * 30",
    // brew: "145 + {c} * 25",
    // fish: "90 + {c} * 20",
    mine: "2",
    hew: "2",
    herd: "2",
    brew: "2",
    fish: "2",
    fell: "2",
    farm_water: "60 * 60 * 12" // 12小時
};

const rpg_actions = {
    挖礦: ["挖", "礦"],
    伐木: ["伐", "木"],
    放牧: ["放牧", ""],
    釀造: ["釀造", "藥水"],
    抓魚: ["抓", "魚"],
};

const redirect_data = {
    hew: "fell",
    wood: "fell",
    ls: "items",
    bag: "items",
    item: "items",
    food: "eat",
    money: "m",
    mo: "m",
    store: "shop",
    l: "lazy",
};

// const rpg_work = [
//     "mine",
//     "hew",
//     "herd",
//     "brew",
//     "fish",
// ];

const rpg_work = [
    ...Object.keys(rpg_cooldown),
    ...Object.keys(redirect_data).filter(key => Object.keys(rpg_cooldown).includes(redirect_data[key])),
];

const redirect_data_reverse = Object.entries(redirect_data).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {});

const rpg_commands = {
    mine: ["挖礦", "挖礦", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { name } = require("../../utils/rpg.js");
        const userid = message.author.id;

        const { item, amount } = random_item;
        if (!name[item]) {
            const embed = await get_loophole_embed(`找不到${item}的物品名稱: ${name[item]}`);
            return await message.reply({ embeds: [embed] });
        };

        if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
        rpg_data.inventory[item] += amount;
        save_rpg_data(userid, rpg_data);
        const ore_name = name[item];
        const emoji = await get_emoji(client, rpg_emojis["mine"]);

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
            .setDescription(description);
        if (mode === 1) return { embeds: [setEmbedFooter(client, embed, '', rpg_data)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed, '', rpg_data)] });
    }, false],
    fell: ["伐木", "砍砍樹，偶爾可以挖到神木 owob", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { name } = require("../../utils/rpg.js");
        const { embed_fell_color } = require("../../utils/config.js");

        const userid = message.author.id;

        const { item, amount } = random_item;
        const log_name = name[item];

        if (!name[item]) {
            const embed = await get_loophole_embed(`找不到${item}的物品名稱: ${log_name}`);
            return await message.reply({ embeds: [embed] });
        };

        let description;
        if (item === "god_wood") {
            description = `本來是平常的一天，居然遇到了神木，於是你砍下了它並獲得了 \`${amount}\` 塊${log_name}！`;
        } else {
            description = `你來到了森林，並且砍了 \`${amount}\` 塊${log_name}`;
        };

        if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
        rpg_data.inventory[item] += amount;
        save_rpg_data(userid, rpg_data);

        const emoji = await get_emoji(client, rpg_emojis["hew"]);

        const embed = new EmbedBuilder()
            .setColor(embed_fell_color)
            .setTitle(`${emoji} | ${item === "god_wood" ? "是神?!" : "平常的一天"}`)
            .setDescription(description);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed, '', rpg_data)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed, '', rpg_data)] });
    }, false],
    herd: ["放牧", "放牧或屠宰動物", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { animal_products, name, get_name_of_id } = require("../../utils/rpg.js");
        const userid = message.author.id;

        const { item: random_animal, amount } = random_item;
        if (!animal_products[random_animal]) {
            const embed = await get_loophole_embed(`找不到${random_animal}的動物產品: ${animal_products[random_animal]}`);
            return await message.reply({ embeds: [embed] });
        };

        const product = animal_products[random_animal];

        if (!rpg_data.inventory[product]) rpg_data.inventory[product] = 0;

        rpg_data.inventory[product] += amount;

        const product_name = name[product];
        const animal_name = product_name.replace("生", "").replace("肉", "");
        const emoji = await get_emoji(client, rpg_emojis["herd"]);

        let title = `是${animal_name}`;
        let description = `你宰了一隻${animal_name}，獲得了 \`${amount}\` 個${product_name}！`;
        if (product === "raw_chicken") {
            const egg_amount = randint(1, 3);
            description += `\n不僅如此！你還發現了${egg_amount}顆${get_name_of_id("egg")}！`
            if (!rpg_data.inventory["egg"]) rpg_data.inventory["egg"] = 0;
            rpg_data.inventory["egg"] += egg_amount;
        } else if (product === "raw_pork") {
            title = "佩佩豬";
        } else if (product === "raw_duck") {
            title = `${emoji} | 呱!`;
            description = `呱呱呱呱呱，呱呱呱呱 \`${amount}\` 呱呱呱！`;
        };

        save_rpg_data(userid, rpg_data);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji} | ${title}`)
            .setDescription(description);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed, '', rpg_data)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed, '', rpg_data)] });
    }, false],
    brew: ["釀造", "釀造藥水", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { name } = require("../../utils/rpg.js");
        const userid = message.author.id;

        const { item, amount } = random_item;
        if (!name[item]) {
            const embed = await get_loophole_embed(`找不到${item}的物品名稱: ${name[item]}`);
            return await message.reply({ embeds: [embed] });
        };

        if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
        const potion_name = name[item];
        rpg_data.inventory[item] += amount;
        save_rpg_data(userid, rpg_data);

        const emoji_potion = await get_emoji(client, "potion");
        let embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_potion} | 釀造`)
            .setDescription(`你研究了許久，獲得了 \`${amount}\` 個${potion_name}`);
        // .setTitle(`${emoji_potion} | 回復藥水可以幹嘛?`)
        // .setDescription(`你研究了許久，獲得了 \`${amount}\` 個${potion_name}\n\n之後推出的冒險可以用上`);

        embed = setEmbedFooter(client, embed, '', rpg_data);

        if (mode === 1) return { embeds: [embed] };
        return await message.reply({ embeds: [embed] });
    }, false],
    fish: ["抓魚", "魚魚: 漁夫!不要抓我~~~", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { name } = require("../../utils/rpg.js");
        const userid = message.author.id;

        const { item, amount } = random_item;
        if (!name[item]) {
            const embed = await get_loophole_embed(`找不到${item}的物品名稱: ${log_name}`);
            return await message.reply({ embeds: [embed] });
        };

        if (!rpg_data.inventory[item]) rpg_data.inventory[item] = 0;
        rpg_data.inventory[item] += amount;
        save_rpg_data(userid, rpg_data);
        const fish_name = name[item];

        let fish_text;
        let description;
        if (item === "raw_salmon") {
            fish_text = "🐢魚"
            description = `你等待了幾個小時，獲得了 \`${amount}\` 條${fish_name}！`
        } else if (item === "raw_shrimp") {
            fish_text = "太蝦了吧"
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

        const emoji = await get_emoji(client, "fisher");
        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji} | ${fish_text}`)
            .setDescription(description);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed, '', rpg_data)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed, '', rpg_data)] });
    }, false],
    shop: ["商店", "對你的商店進行任何操作", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { load_shop_data, save_shop_data, save_rpg_data } = require("../../utils/file.js");
        const { mentions_users } = require("../../utils/message.js");
        const { name, mine_gets, ingots, foods, shop_lowest_price, get_name_of_id } = require("../../utils/rpg.js");
        const subcommand = args[0];

        switch (subcommand) {
            case "add": {
                const userid = message.author.id;
                const emoji = await get_emoji(client, "store");
                const emoji_cross = await get_emoji(client, "crosS");
                const shop_data = load_shop_data(userid);
                const status = shop_data.status ? "營業中" : "打烊";
                /*
                指令: shop add <商品名稱/ID> <數量> <售價>
                範例: shop add 鑽石礦 2 600
                範例2: shop add diamond_ore 2 600
                */
                let [_, item_name, amount, price] = args;
                item_name = get_name_of_id(item_name); // 物品名稱
                const item = Object.keys(name).find(key => name[key] === item_name); // 物品id

                if (amount === "all") amount = get_number_of_items(item, userid); // 獲取所有物品數量
                if (!Object.keys(name).includes(args[1]) && !Object.values(name).includes(args[1])) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 未知的物品`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                const item_exist = shop_data.items[item];
                amount = parseInt(amount);
                if (isNaN(amount)) amount = 1;
                if (amount < 1) {
                    const emoji = await get_emoji(client, "crosS");
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 錯誤的數量`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                // let price = parseInt(args[3]) || item_exist?.price || shop_lowest_price[item];
                price = parseInt(price) || item_exist?.price;
                if (!price || price < 1 || price >= 1000000000) {
                    const emoji = await get_emoji(client, "crosS");
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 錯誤的價格`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                if (price < shop_lowest_price[item]) {
                    const emoji = await get_emoji(client, "crosS");
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 價格低於最低價格`)
                        .setDescription(`請至少販賣一件 \`${shop_lowest_price[item].toLocaleString()}$\``);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                if (!rpg_data.inventory[item]) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有這個物品`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                if (rpg_data.inventory[item] < amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 你沒有足夠的物品`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                if (typeof rpg_data.inventory[item] !== "number") rpg_data.inventory[item] = 0;
                rpg_data.inventory[item] -= amount;

                save_rpg_data(userid, rpg_data);

                if (item_exist) {
                    shop_data.items[item].amount += amount;
                    if (price) {
                        shop_data.items[item].price = price;
                    };
                } else {
                    shop_data.items[item] = {
                        name: item,
                        amount,
                        price,
                    };
                };

                amount = shop_data.items[item].amount;
                price = shop_data.items[item].price;
                save_shop_data(userid, shop_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji} | 成功上架`)
                    .setDescription(`你的店面狀態為: \`${status}\`，現在架上有 \`${amount.toLocaleString()}\` 個 \`${item_name}\`，售價為 \`${price.toLocaleString()}$\``);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            }
            case "remove": {
                const userid = message.author.id;
                const emoji = await get_emoji(client, "store");
                const emoji_cross = await get_emoji(client, "crosS");
                const shop_data = load_shop_data(userid);
                const item = args[1];
                if (!item) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji} | 請輸入要下架的物品`);
                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };
                const item_name = name[item] || item;
                const item_id = Object.keys(name).find(key => name[key] === item_name); // 物品id
                const item_exist = shop_data.items[item_id];
                if (!item_exist) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你的商店沒有這個物品`);
                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                const remove_amount = args[2] || undefined;
                if (!rpg_data.inventory[item_id]) rpg_data.inventory[item_id] = 0;
                const amount = remove_amount ? parseInt(remove_amount) : shop_data.items[item_id].amount;

                if (amount > shop_data.items[item_id].amount) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_error_color)
                        .setTitle(`${emoji_cross} | 你沒有足夠的物品`);
                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                rpg_data.inventory[item_id] += amount;

                save_rpg_data(userid, rpg_data);
                shop_data.items[item_id].amount -= amount;
                if (shop_data.items[item_id].amount <= 0) {
                    delete shop_data.items[item_id];
                };

                save_shop_data(userid, shop_data);
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji} | 成功下架了 \`${amount.toLocaleString()}\` 個 ${item_name}`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            }
            case "list": {
                const user = (await mentions_users(message)).first() || message.author;
                const userid = user.id;

                const emoji_cross = await get_emoji(client, "crosS");
                const emoji_store = await get_emoji(client, "store");
                const ore_emoji = await get_emoji(client, "ore");
                const food_emoji = await get_emoji(client, "bread");
                const shop_data = load_shop_data(userid);

                if (!shop_data.status && user.id != message.author.id) {
                    const embed = new EmbedBuilder()
                        .setColor(embed_default_color)
                        .setTitle(`${emoji_store} | 該商店目前已經打烊了`);

                    if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                    return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
                };

                const status = shop_data.status ? "營業中" : "已打烊";

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setAuthor({
                        name: `${user.username} 的商店 (${status})`,
                        iconURL: user.displayAvatarURL({ dynamic: true })
                    });

                // 礦物
                const minerals = Object.entries(shop_data.items)
                    .filter(([item]) => Object.values(mine_gets).includes(item) || Object.values(ingots).includes(item))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([item, data]) => `${name[item]} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                    .join('\n');
                if (minerals) embed.addFields({ name: `${ore_emoji} 礦物`, value: minerals, inline: false });

                // 食物
                const food = Object.entries(shop_data.items)
                    .filter(([item]) => Object.values(foods).includes(item))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([item, data]) => `${name[item]} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                    .join('\n');
                if (food) embed.addFields({ name: `${food_emoji} 食物`, value: food, inline: false });

                // 其他
                const others = Object.entries(shop_data.items)
                    .filter(([item]) => !Object.values(mine_gets).includes(item) && !Object.values(ingots).includes(item) && !Object.values(foods).includes(item))
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([item, data]) => `${name[item]} \`${data.price.toLocaleString()}$\` / 個 (現有 \`${data.amount.toLocaleString()}\` 個)`)
                    .join('\n');
                if (others) embed.addFields({ name: `其他`, value: others, inline: false });

                const nothing_sell = !minerals && !food && !others;

                if (nothing_sell) {
                    embed.setColor(embed_error_color)
                    embed.setTitle(`${emoji_cross} | 商店裡沒有販賣任何東西`);
                    embed.setAuthor(null);
                };

                const buyItemButton = new ButtonBuilder()
                    .setCustomId(`help|${message.author.id}|rpg|buy`)
                    .setLabel('購買食物')
                    .setEmoji(emoji_store)
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder()
                    .addComponents(buyItemButton);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: nothing_sell ? [] : [row] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: nothing_sell ? [] : [row] });
            }
            case "open":
            case "on": {
                const userid = message.author.id;
                const emoji = await get_emoji(client, "store");
                const shop_data = load_shop_data(userid);
                shop_data.status = true;
                save_shop_data(userid, shop_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji} | 你的商店開始營業啦！`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            }
            case "close":
            case "off": {
                const userid = message.author.id;
                const emoji = await get_emoji(client, "store");
                const shop_data = load_shop_data(userid);
                shop_data.status = false;
                save_shop_data(userid, shop_data);

                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji} | 你拉下了商店鐵捲門`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            }
            case "status": {
                const userid = message.author.id;
                const emoji = await get_emoji(client, "store");
                const shop_data = load_shop_data(userid);
                const status = shop_data.status ? "營業中" : "打烊";
                const embed = new EmbedBuilder()
                    .setColor(embed_default_color)
                    .setTitle(`${emoji} | 你的商店狀態為: ${status}`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            }
            default: {
                const user = (await mentions_users(message)).first();
                if (user) {
                    return await redirect({ client, message, command: `shop list ${user.id}`, mode });
                };
                if (mode === 1) return {};
                return;
            };
        };
    }, true],
    items: ["查看背包", "查看背包", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        return await ls_function({ client, message, rpg_data, data, args, mode, random_item })
    }, false],
    buy: ["購買", "購買其他人上架的物品", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { load_shop_data } = require("../../utils/file.js");
        const { name, get_id_of_name } = require("../../utils/rpg.js");
        const { get_help_command } = require("./rpg_interactions.js");
        const { mentions_users } = require("../../utils/message.js");

        const userid = message.author.id;
        const emoji_cross = await get_emoji(client, "crosS");
        const emoji_store = await get_emoji(client, "store");

        const target_users = await mentions_users(message);
        const target_user = target_users.first();
        if (!target_user) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 錯誤的使用者`)

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        args = args.filter(arg => !Array.from(target_users.keys()).includes(arg));

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
                .setTitle(`${emoji_cross} | 不能購買自己的物品`);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        if (args.length === 0 && target_user) {
            return await redirect({ client, message, command: `shop list ${target_user.id}`, mode });
        } else if (args.length === 0) {
            return await message.reply({
                embeds: [get_help_command("rpg", "buy", client)],
            });
        };

        let item = args[0];
        item = get_id_of_name(item);

        if (!name[item]) item = null;

        const shop_data = load_shop_data(target_user.id);
        if (shop_data.items.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 商店裡沒有販賣任何東西`);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        if (!item) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 這個物品是什麼？我不認識`);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        // if (target_user.bot) {
        //     const embed = new EmbedBuilder()
        //         .setColor(embed_error_color)
        //         .setTitle(`${emoji_cross} | 不能購買機器人的物品`)
        //         .setFooter({
        //             text: `哈狗機器人 ∙ 讓 Discord 不再只是聊天軟體`,
        //             iconURL: client.user.displayAvatarURL({ dynamic: true }),
        //         });
        //     if (mode === 1) return { embeds: [embed] };
        //     return await message.reply({ embeds: [embed] });
        // };
        // if (shop_data.status === false) {
        //     const embed = new EmbedBuilder()
        //         .setColor(embed_error_color)
        //         .setTitle(`${emoji_store} | 該商店目前已經打烊了`);

        //     if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        //     return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        // };

        const item_name = name[item] || item;
        const item_exist = shop_data.items[item];
        if (!Object.values(name).includes(item_name)) {
            // const embed = new EmbedBuilder()
            //     .setColor(embed_error_color)
            //     .setTitle(`${emoji_cross} | 這是什麼東西？`)
            //     .setFooter({
            //         text: `哈狗機器人 ∙ 讓 Discord 不再只是聊天軟體`,
            //         iconURL: client.user.displayAvatarURL({ dynamic: true }),
            //     });
            // if (mode === 1) return { embeds: [embed] };
            // return await message.reply({ embeds: [embed] });
            return await redirect({ client, message, command: `shop list ${target_user.id}`, mode });
        };

        if (!item_exist) {
            // return await redirect({ client, message, command: `shop list ${target_user.id}`, mode });

            // const msg = new MockMessage(
            //     `!shop list ${target_user.id}`,
            //     message.channel,
            //     message.author,
            //     target_user,
            // );

            // const args = await rpg_handler({ client, message: msg, d: true, mode: 1 });
            // return await message.reply(args);

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 沒有販賣這項物品`);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        let amount = args[1];
        if (amount === "all") {
            amount = item_exist.amount;
        } else if (amount) {
            // 過濾amount中任何非數字的字元 e.g: $100 -> 100
            amount = amount.toString().replace(/\D/g, '');

            amount = parseInt(amount);
        };

        if (isNaN(amount)) amount = 1;
        if (amount <= 0 || amount > item_exist.amount) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 錯誤的數量`);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        if (rpg_data.money < item_exist.price * amount) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 歐不！你沒錢了！`)
                .setDescription(`你還差 \`${(item_exist.price * amount - rpg_data.money).toLocaleString()}$\``);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
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
如果價格有誤請和賣家確認好。`);

        const confirmButton = new ButtonBuilder()
            .setCustomId(`buy|${message.author.id}|${target_user.id}|${amount}|${item_exist.price}|${item}`)
            .setLabel('確認購買')
            .setDisabled(!shop_data.status)
            .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel|${message.author.id}`)
            .setLabel('取消')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        if (!shop_data.status) {
            const solderConfirmButton = new ButtonBuilder()
                .setCustomId(`buyc|${target_user.id}|${target_user.id}|${amount}|${item_exist.price}|${item}`)
                .setLabel('店主確認')
                .setStyle(ButtonStyle.Primary);

            row.addComponents(solderConfirmButton);
        };

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, true],
    m: ["查看餘額", "查看自己的餘額", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const button = new ButtonBuilder()
            .setCustomId(`rpg_transaction|${message.author.id}`)
            .setLabel('查看交易紀錄')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(button);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setDescription(`你目前有 \`${rpg_data.money.toLocaleString()}$\``);
        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, false],
    cd: ["查看冷卻剩餘時間", "查看冷卻剩餘時間", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const lastRunTimestamp = rpg_data.lastRunTimestamp;
        const filtered_lastRunTimestamp = Object.fromEntries(Object.entries(lastRunTimestamp).filter(([command, time]) => rpg_cooldown[command]));

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle("⏲️ | 冷卻剩餘時間");

        if (Object.keys(filtered_lastRunTimestamp).length === 0) {
            embed.setDescription(`你沒有工作過(挖礦、伐木、放牧等)，所以快快開始工作吧！`);
        } else {
            for (const [command, time] of Object.entries(filtered_lastRunTimestamp)) {
                if (!rpg_cooldown[command]) continue;
                const { is_finished, remaining_time } = is_cooldown_finished(command, rpg_data);
                const name = command;
                let target_time = Math.floor(new Date() / 1000 + remaining_time / 1000);
                target_time = `<t:${target_time}:R>`;
                let value = is_finished ? `冷卻完畢 (${target_time})` : target_time;
                value += `\n上次執行時間: <t:${Math.floor(time / 1000)}:D> <t:${Math.floor(time / 1000)}:T>`;
                value += `\n今天執行了 \`${rpg_data.count[command].toLocaleString()}\` 次`;
                embed.addFields({ name: name, value: value });
            };
        };

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, false],
    cdd: ["[簡易]查看冷卻剩餘時間", "查看冷卻剩餘時間，但是只顯示時間", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const lastRunTimestamp = rpg_data.lastRunTimestamp;
        const filtered_lastRunTimestamp = Object.fromEntries(Object.entries(lastRunTimestamp).filter(([command, time]) => rpg_cooldown[command]));

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle("⏲️ | 冷卻剩餘時間");

        if (Object.keys(filtered_lastRunTimestamp).length === 0) {
            embed.setDescription(`你沒有工作過(挖礦、伐木、放牧等)，所以快快開始工作吧！`);
        } else {
            for (const [command, time] of Object.entries(filtered_lastRunTimestamp)) {
                if (!rpg_cooldown[command]) continue;
                const { is_finished, remaining_time } = is_cooldown_finished(command, rpg_data);
                const name = command;
                let target_time = Math.floor(new Date() / 1000 + remaining_time / 1000);
                target_time = `<t:${target_time}:R>`;
                let value = is_finished ? `冷卻完畢 (${target_time})` : target_time;
                embed.addFields({ name: name, value: value });
            };
        };

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, false],
    pay: ["付款", "付款給其他用戶", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { mentions_users } = require("../../utils/message.js");

        const target_user = (await mentions_users(message)).first();

        const emoji_cross = await get_emoji(client, "crosS");
        const emoji_top = await get_emoji(client, "top");

        if (!target_user) {
            return await redirect({ client, message, command: `help`, mode });
        };

        if (target_user.id === message.author.id) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 不能自己付款給自己啊www`);
            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        args = args.filter(arg => arg !== `<@${target_user.id}>` && arg !== `<@!${target_user.id}>`);
        if (target_user.bot) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 不能付款給機器人 還是你要把你的錢錢丟進大海`);
            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const amount = args[0];
        if (isNaN(amount) || amount <= 0) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 錯誤的數量`);
            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        if (rpg_data.money < amount) {
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 歐不!`)
                .setDescription(`你還差 \`${(amount - rpg_data.money).toLocaleString()}$\``);
            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const confirmButton = new ButtonBuilder()
            .setCustomId(`pay_confirm|${message.author.id}|${target_user.id}|${amount}|${Date.now()}`)
            .setLabel('確認付款')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`pay_cancel|${message.author.id}`)
            .setLabel('取消付款')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder()
            .addComponents(confirmButton, cancelButton);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_top} | 確認付款`)
            .setDescription(`你確定要付款 \`${amount.toLocaleString()}$\` 給 <@${target_user.id}> ?`)
            .setFooter({ text: `此確認將在 30 秒後過期` });

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, true],
    help: ["查看指令", "查看指令", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const emoji_slash = await get_emoji(client, "slash")

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

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        let embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setDescription(`
嗨嗨 d(･∀･)b 我是${client.name}，
我的目標是讓你快速建立優質的中文 Discord 伺服器!

${emoji_slash} 正在努力轉移部分功能的指令到斜線指令
-# 本機器犬是參考 YEE式機器龍 製作的，${client.author}不是機器龍的開發者owo`);

        embed = setEmbedAuthor(client, embed);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, false],
    privacy: ["隱私權", "修改隱私權", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        // const emoji_shield = await get_emoji(client, "shield");

        // const embed = new EmbedBuilder()
        //     .setColor(embed_default_color)
        //     .setTitle(`${emoji_shield} | 隱私權設定`)
        //     .setDescription(`你確定要設定隱私權嗎？`);

        // const row = new ActionRowBuilder()
        //     .addComponents(
        //         new ButtonBuilder()
        //             .setCustomId(`rpg_privacy_menu|${message.author.id}|true`)
        //             .setLabel('確認')
        //             .setStyle(ButtonStyle.Success),
        //         new ButtonBuilder()
        //             .setCustomId(`rpg_privacy_menu|${message.author.id}|false`)
        //             .setLabel('取消')
        //             .setStyle(ButtonStyle.Danger)
        //     );
        // if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        // return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
        const emojiNames = ["bag", "partner", "shield"];
        const [emoji_backpack, emoji_partner, emoji_shield] = await Promise.all(
            emojiNames.map(name => get_emoji(client, name))
        );

        rpg_data.privacy.sort((a, b) => {
            const order = { "money": 0, "backpack": 1, "partner": 2 };
            return order[a] - order[b];
        });

        let text;
        if (rpg_data.privacy.length > 0) {
            text = rpg_data.privacy.join('、');
            text = text.replace("money", "金錢").replace("backpack", "背包").replace("partner", "夥伴");
        } else text = "無";


        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_shield} | 隱私權設定`)
            .setDescription(`
為保護每個人的隱私，可以透過下拉選單來設定 **允許被公開的** 資訊

目前的設定為：\`${text}\``);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`rpg_privacy_menu|${message.author.id}`)
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

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, false],
    lazy: ["懶惰", "懶惰地遊玩這個遊戲", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        return
        if (message.channel.id !== "1432642462840524853") return await message.reply("只能在 <#1432642462840524853> 中使用");
        // if (new Date().getMinutes() % 2 === 0) {
        if (true) {
            const embeds = []
            const cmds = ["mine", "hew", "herd", "brew", "fish"];
            for (const cmd of cmds) {
                const res = await redirect({ client, message, command: cmd, mode: 1 });
                embeds.push(...res.embeds);
            };

            if (mode === 1) return { embeds };
            return await message.reply({ embeds });
        } else {
            const emoji_cross = await get_emoji(client, "crosS");

            const embed = new EmbedBuilder()
                .setTitle(`${emoji_cross} | 太懶了辣！`)
                .setColor(embed_default_color)
                .setThumbnail("https://cdn.discordapp.com/emojis/1368436829371764867.webp?size=96")
                .setDescription("你太懶了，所以我不給你用!lazy了 owo");

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };
    }, false],
    eat: ["吃東西", "吃東西回復飽食度", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { save_rpg_data } = require("../../utils/file.js");
        const { foods, name, food_data, foods_crops, foods_meat, fish } = require("../../utils/rpg.js");
        const { embed_warn_color } = require("../../utils/config.js");

        const user = message.author;
        const userid = user.id;

        const emoji_cross = await get_emoji(client, "crosS");
        const drumstick_emoji = await get_emoji(client, "drumstick");

        if (args.length > 0) {
            const extra_embeds = [];

            const food_name = name[args[0]] || args[0];
            const food_id = Object.keys(name).find(key => name[key] === food_name);

            // let amount = args[1]?.toLowerCase().trim() || 1;
            // if (amount === "all") amount = get_number_of_items(item, userid);
            // amount = parseInt(amount);
            // if (isNaN(amount)) amount = 1;
            let amount = get_amount(food_id, user, args[1]);
            if (amount < 1) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 錯誤的數量`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            if (!foods[food_id]) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 這啥東西？不能吃欸`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            const add = food_data[food_id]
            if (!add) {
                const embed = await get_loophole_embed(client, `food_data[${food_id}] is ${add}`)

                logger.warn(`食物${food_name} (${food_id})在food_data中沒有這個食物的數據`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            if ((rpg_data.hunger + add) > max_hunger) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你已經吃太飽了`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            let newadd = add * amount;
            if ((rpg_data.hunger + newadd) > max_hunger) {
                const force_eat = args[2]?.toLowerCase().trim() === "force";

                const old_amount = amount;

                const new_amount = Math.floor((max_hunger - rpg_data.hunger) / add);
                const new_newadd = add * amount;

                if (!force_eat) {
                    amount = new_amount;
                    newadd = new_newadd;
                };

                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你會吃太飽撐死!`)
                    .setDescription(`你想吃掉\`${old_amount.toLocaleString()}\` 個 \`${food_name}\` \n但你最多只能吃掉 \`${amount}\` 個 \`${food_name}\``);

                if (force_eat) {
                    embed.setColor(embed_warn_color)
                    embed.setTitle(`${emoji_cross} | 爆體保護被停用！`)
                        .setDescription(`你停用了爆體保護，應該會多攝取`);
                };

                extra_embeds.push(embed);
            };

            if (!rpg_data.inventory[food_id]) {
                const embed = new EmbedBuilder()
                    .setColor(embed_error_color)
                    .setTitle(`${emoji_cross} | 你沒有這個食物`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            rpg_data.hunger += newadd;
            rpg_data.hunger = Math.min(rpg_data.hunger, max_hunger);

            rpg_data.inventory[food_id] -= amount;
            save_rpg_data(userid, rpg_data);

            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${drumstick_emoji} | 成功進食`)
                .setDescription(`你吃下了 \`${amount}\` 個 \`${food_name}\`，你的體力值增加到了 \`${rpg_data.hunger}\``);

            const embeds = [setEmbedFooter(client, embed), ...extra_embeds.map(e => setEmbedFooter(client, e))];

            if (mode === 1) return { embeds };
            return await message.reply({ embeds });
        } else {
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle(`${drumstick_emoji} | 可以吃的東西`)
                .setDescription(`體力值: ${rpg_data.hunger} / ${max_hunger} 點`);

            const food_crops_items = {};
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
                    .setTitle(`${emoji_cross} | 你沒有任何食物`);

                if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
                return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
            };

            const farmer_emoji = await get_emoji(client, "farmer");
            const cow_emoji = await get_emoji(client, "cow");
            const food_emoji = await get_emoji(client, "food");
            const store_emoji = await get_emoji(client, "store");

            const categories = [
                { items: food_crops_items, name: `${farmer_emoji} 農作物` },
                { items: food_meat_items, name: `${cow_emoji} 肉類` },
            ];

            for (const category of categories) {
                if (Object.keys(category.items).length > 0) {
                    const itemsText = Object.entries(category.items)
                        .map(([item, amount]) => `${name[item]} \`${amount.toLocaleString()}\` 個 (回復 \`${food_data[item]}\` ${drumstick_emoji})`)
                        .join('\n');
                    embed.addFields({ name: category.name, value: itemsText });
                };
            };

            const howToEatButton = new ButtonBuilder()
                .setCustomId(`help|${message.author.id}|rpg|eat`)
                .setLabel('如何吃食物')
                .setEmoji(food_emoji)
                .setStyle(ButtonStyle.Primary);

            const buyFoodButton = new ButtonBuilder()
                .setCustomId(`help|${message.author.id}|rpg|buy`)
                .setLabel('購買食物')
                .setEmoji(store_emoji)
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder()
                .addComponents(howToEatButton, buyFoodButton);

            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
        };
    }, false],
    sell: ["出售", "出售物品給系統", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { sell_data, name } = require("../../utils/rpg.js");

        const item_name = name[args[0]] || args[0];
        const item_id = Object.keys(name).find(key => name[key] === item_name);

        const emoji_trade = await get_emoji(client, "trade");

        if (!name[item_id]) {
            const emoji_cross = await get_emoji(client, "crosS");

            let embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 未知的物品`);

            embed = setEmbedFooter(client, embed);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };

        if (!rpg_data.inventory[item_id]) {
            const emoji_cross = await get_emoji(client, "crosS");

            let embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你沒有這個物品哦`);

            embed = setEmbedFooter(client, embed);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };

        const amount = get_amount(item_id || item_name, message.author, args[1]) || 1;
        if (rpg_data.inventory[item_id] < amount) {
            const emoji_cross = await get_emoji(client, "crosS");

            let embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你沒有這麼多的物品哦`);

            embed = setEmbedFooter(client, embed);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        }

        const price = sell_data[item_id];
        if (!price) {
            const embed = await get_loophole_embed(client, `詳細資訊: sell_data[${item_id}]為${price}`);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };

        const confirm_button = new ButtonBuilder()
            .setCustomId(`sell|${message.author.id}|${item_id}|${price}|${amount}`)
            .setLabel("確認")
            .setStyle(ButtonStyle.Success);

        const cancel_button = new ButtonBuilder()
            .setCustomId(`cancel|${message.author.id}`)
            .setLabel("取消")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(cancel_button, confirm_button);

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_trade} | 出售確認`)
            .setDescription(`你將要出售 \`${amount.toLocaleString()}\` 個 \`${item_name}\`，共獲得 \`${(price * amount).toLocaleString()}$\``);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: [row] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: [row] });
    }, true],
    // cmd: ["通過按下按鈕來選擇指令", "PS: 需要參數的指令不行哦！", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
    //     const commands = Object.keys(rpg_commands);;

    //     const attachment = new AttachmentBuilder(`./f_images/cmdBlock.webp`, { name: "cmdBlock.webp" });
    //     const embed = new EmbedBuilder()
    //         .setColor(embed_default_color)
    //         .setTitle(`⚙️ | 選擇指令`)
    //         .setDescription("PS: 需要參數的指令不行哦！")
    //         .setThumbnail("attachment://cmdBlock.webp");

    //     const buttons = commands.map(cmd => {
    //         return new ButtonBuilder()
    //             .setCustomId(`choose_command|${message.author.id}|${cmd}`)
    //             .setLabel(cmd)
    //             .setStyle(ButtonStyle.Primary);
    //     });

    //     // 將按鈕分成每組最多5個
    //     const rows = [];
    //     for (let i = 0; i < buttons.length; i += 5) {
    //         const row = new ActionRowBuilder()
    //             .addComponents(buttons.slice(i, i + 5));
    //         rows.push(row);
    //     };

    //     if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: rows, files: [attachment] };
    //     return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: rows, files: [attachment] });
    // }, false],
    top: ["金錢排行榜", "who!誰是世界首富!是不是你!", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { load_rpg_data } = require("../../utils/file.js");
        const guild = message.guild;

        const members = (await get_members_of_guild(guild.id, client)).filter(member => !member.user.bot);

        const userDataList = [];
        for (const member of members.values()) {
            const userid = member.user.id;
            userDataList.push({
                user: member.user,
                money: load_rpg_data(userid).money,
            });
        };

        userDataList.sort((a, b) => b.money - a.money);

        const emoji_top = await get_emoji(client, "top");

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_top} | 金錢排行榜 Top 10`)

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

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, false],
    last: ['"倒數"金錢排行榜', "讓我們看看誰最窮!嘿嘿", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { load_rpg_data } = require("../../utils/file.js");

        const guild = message.guild;

        const members = (await get_members_of_guild(guild.id, client)).filter(member => !member.user.bot);

        const userDataList = [];
        for (const member of members.values()) {
            const userid = member.user.id;
            userDataList.push({
                user: member.user,
                money: load_rpg_data(userid).money,
            });
        };

        // 按金錢排序（從高到低）
        userDataList.sort((a, b) => b.money - a.money);

        const emoji_decrease = await get_emoji(client, "decrease");

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle(`${emoji_decrease} | 「倒數」金錢排行榜 Top 10`)

        let description = "";
        const topUsers = userDataList.slice(-10);
        topUsers.reverse();

        for (let i = 0; i < topUsers.length; i++) {
            const userData = topUsers[i];
            const rank = i + 1;

            description += `${rank}. ${userData.user.toString()} - \`${userData.money.toLocaleString()}$\`\n`;
        };

        if (description === "") {
            description = "奇怪餒，目前怎麼可能還沒有任何用戶擁有金錢？我壞掉了？";
        };

        embed.setDescription(description);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, false],
    name: ["顯示物品名稱", "透過物品ID顯示物品名稱", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { get_name_of_id } = require("../../utils/rpg.js");
        const item_id = args[0];

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("❌ | 請輸入物品ID")
                .setDescription("請輸入物品ID以顯示物品名稱");
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const item_name = get_name_of_id(item_id, null);
        if (!item_name) {
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("❌ | 物品ID不存在")
                .setDescription("請輸入正確的物品ID以顯示物品名稱");
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle("📝 | 物品名稱")
            .setDescription(`物品ID: \`${item_id}\`\n物品名稱: \`${item_name}\``);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, true],
    id: ["顯示物品ID", "透過物品名稱顯示物品ID", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        const { get_id_of_name } = require("../../utils/rpg.js");
        const item_name = args.join(" ");

        if (!args[0]) {
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("❌ | 請輸入物品名稱")
                .setDescription("請輸入物品名稱以顯示物品ID");
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const item_id = get_id_of_name(item_name, null);
        if (!item_id) {
            const embed = new EmbedBuilder()
                .setColor(embed_default_color)
                .setTitle("❌ | 物品名稱不存在")
                .setDescription("請輸入正確的物品名稱以顯示物品ID");
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const embed = new EmbedBuilder()
            .setColor(embed_default_color)
            .setTitle("📝 | 物品ID")
            .setDescription(`物品名稱: \`${item_name}\`\n物品ID: \`${item_id}\``);

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
    }, true],
    limited: ["???", "???", async function ({ client, message, rpg_data, data, args, mode, random_item }) {
        if (message.author.id !== "898836485397180426") return;
        const { load_rpg_data } = require("../../utils/file.js");
        const { foods } = require("../../utils/rpg.js");
        const amount = parseInt(args[0]) || 1;
        const msg = await message.reply("處理中...");
        const total = amount;
        const length = 50;
        let completed = 0;
        let last_msg = "";

        // 取得所有可吃的食物
        const food_items = Object.keys(foods);

        const timer = setInterval(async () => {
            const percent = (completed / total).toFixed(4);
            const cell_num = Math.floor(percent * length);

            let cell = '';
            for (let i = 0; i < cell_num; i++) {
                cell += '█';
            };

            let empty = '';
            for (let i = 0; i < length - cell_num; i++) {
                empty += '░';
            };

            const show_completed = completed.toString().padStart(total.toString().length, '0');
            const percentage = (100 * percent).toFixed(2).toString();

            const progressText = `進度: ${percentage}% ${cell}${empty} ${show_completed}/${total}`;

            const embeds = last_msg?.embeds;
            let desc = "";
            if (embeds && embeds[0]) {
                const embed = embeds[0]?.toJSON();
                const description = embed.description || embed.title || "無描述";
                if (!description.includes("天氣")) {
                    const new_description = description
                        .split("`")
                        .slice(1)
                        .join("`")
                        .replace('`', '')
                        .replace("條", '')
                        .replace('！', '')
                        .replace('個', '');

                    const [amount, ...names] = new_description.split(" ");
                    if (amount && names && names.length > 0) {
                        for (const name of names) {
                            if (name.includes("生")) {
                                desc = name;
                                desc += ` x${amount}`;
                                break;
                            };
                        };
                    } else {
                        desc = description;
                    };
                };
            };
            desc = desc.padEnd(13, '|');

            // 重新載入玩家資料
            // if (completed % 1 === 0) {
            if (true) {
                rpg_data = load_rpg_data(message.author.id);
            };

            // 尋找玩家擁有的可吃食物
            let current_food = null;
            for (const food of food_items) {
                if (rpg_data.inventory[food] > 0) {
                    current_food = food;
                    break;
                };
            };

            let txt;
            if (current_food) {
                txt = `${progressText} | 剩下 ${rpg_data.inventory[current_food].toLocaleString()} 個${current_food} | ${desc}`;
            } else {
                txt = `${progressText} | 沒有食物了 | ${desc}`;
            };
            process.stdout.write(txt + "\r");

            if (completed >= total) {
                clearInterval(timer);
                await msg.edit("完成!");
                return;
            };

            const cmds = ["mine", "hew", "herd", "brew", "fish"];
            for (const cmd of cmds) {
                last_msg = await redirect({ client, message, command: cmd, mode: 1 });
            };

            // 如果有食物就吃
            if (current_food) {
                await redirect({ client, message, command: `eat ${current_food} all`, mode: 1 });
            };

            completed += 1;
        }, 1000);
    }, false],
};

for (const [from, target] of Object.entries(redirect_data)) {
    rpg_commands[from] = rpg_commands[target];
};

const privacy_data = {
    ls: "backpack"
}

function find_redirect_targets_from_id(id) {
    return Object.entries(redirect_data).filter(([key, value]) => value === id).map(([key, value]) => key);
};

/**
 * @param {DogClient} client 機器人客戶端
 * @param {Message} message 訊息
 * @param {boolean} d
 * @param {number} mode 請求模式 - 0: 預設模式 - 1: 取得訊息回傳參數
 * @returns {Promise<Message | MessagePayload | null>}
*/
async function rpg_handler({ client, message, d, mode = 0 }) {
    const { load_rpg_data, save_rpg_data, loadData } = require("../../utils/file.js");
    const { get_help_command } = require("./rpg_interactions.js");
    const { get_failed_embed, get_cooldown_embed } = require("../../utils/rpg.js");

    if (![0, 1].includes(mode)) throw new TypeError("args 'mode' must be 0(default) or 1(get message response args)");

    if (!d && message.author.bot) return;

    const guildID = message.guild.id;
    const data = loadData(guildID);
    if (!data["rpg"]) return;

    let content = message.content.toLowerCase().trim();
    if (!content.startsWith(prefix)) return;
    content = content.replace(prefix, "").trim();
    let [command, ...args] = content.split(" ");

    // 移除所有元素的空白字元
    args = args.map(arg => arg.trim());

    // 移除所有空白的元素 ''
    args = args.filter(arg => arg !== '');

    command = command.toLowerCase().trim();
    command = redirect_data[command] || command;
    if (command.length === 0 || content === prefix) return;
    const cmd_data = rpg_commands[command];

    if (!cmd_data) {
        const commands = Object.keys(rpg_commands);
        const cross_emoji = await get_emoji(client, "crosS");

        command = command.replace(/[^a-zA-Z0-9]/g, '');

        const firstChar = command.charAt(0);
        const similarCommands = commands.filter(cmd => cmd.startsWith(firstChar) && !rpg_commands[cmd][3]);

        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${cross_emoji} | 是不是打錯指令了？我找到了你可能想要的指令`);

        if (similarCommands.length === 0) {
            embed.setTitle(`${cross_emoji} | 我找不到你想要選哪個指令餒...`);
            if (mode === 1) return { embeds: [setEmbedFooter(client, embed)] };
            return await message.reply({ embeds: [setEmbedFooter(client, embed)] });
        };

        const buttons = similarCommands.map(cmd => {
            return new ButtonBuilder()
                .setCustomId(`choose_command|${message.author.id}|${cmd}`)
                .setLabel(cmd)
                .setStyle(ButtonStyle.Primary);
        });

        // 將按鈕分成每組最多5個
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            const row = new ActionRowBuilder()
                .addComponents(buttons.slice(i, i + 5));

            rows.push(row);
        };

        embed.setDescription(`你是不是指：\n${similarCommands.map(cmd => `- ${prefix}${cmd}`).join('\n')}`);
        if (rows.length > 5) rows.length = 5;

        if (mode === 1) return { embeds: [setEmbedFooter(client, embed)], components: rows };
        return await message.reply({ embeds: [setEmbedFooter(client, embed)], components: rows });
    };

    const execute = cmd_data[2];
    const userid = message.author.id;
    const rpg_data = load_rpg_data(userid);
    const action = cmd_data[0];

    if (rpg_work.includes(command) && rpg_data.hunger === 0) {
        const { foods } = require("../../utils/rpg.js");
        const food_items = Object.keys(foods);
        let found_food = null;
        for (const food of food_items) {
            if (rpg_data.inventory && rpg_data.inventory[food] > 0) {
                found_food = food;
                break;
            };
        };

        if (found_food) {
            // 嘗試自動吃掉一個食物
            if (typeof rpg_commands.eat?.[2] === "function") {
                const eatPromise = rpg_commands.eat[2]({
                    client,
                    message,
                    rpg_data,
                    data,
                    args: [found_food, "all"],
                    mode: 1
                });

                // 5秒超時
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('eat timeout')), 5000);
                });

                const res = await Promise.race([
                    eatPromise,
                    timeoutPromise,
                ]);

                if (mode === 1) return res;

                if (res.embeds && res.embeds.length > 1) {
                    res.embeds.length = 1;
                };

                await message.reply(res);
            };
        } else {
            const emoji_cross = await get_emoji(client, "crosS");

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你已經餓到沒有食物可以吃了！請先補充食物！`);

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };
    };

    if (rpg_work.includes(command)) {
        if (rpg_data.hunger <= 0) {
            const emoji_cross = await get_emoji(client, "crosS");

            const embed = setEmbedFooter(client, new EmbedBuilder()
                .setTitle(`${emoji_cross} | 你的體力不足了！`)
                .setColor(embed_error_color));

            if (mode === 1) return { embeds: [embed] };
            return await message.reply({ embeds: [embed] });
        };

        rpg_data.hunger -= 1;
    };

    if (rpg_cooldown[command] || command === "cd") {
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
            if (mode === 1) return { embeds: [await get_cooldown_embed(remaining_time, client, action, rpg_data.count[command])] };
            return await message.reply({ embeds: [await get_cooldown_embed(remaining_time, client, action, rpg_data.count[command])] });
        };

        // 增加計數
        rpg_data.count[command]++;

        rpg_data.lastRunTimestamp[command] = Date.now();
        save_rpg_data(userid, rpg_data);
    };

    const { failed, item, amount } = get_random_result(command);
    if (failed && rpg_work.includes(command)) {
        // rpg_data.hunger += 1;
        // save_rpg_data(userid, rpg_data);
        if (mode === 1) return { embeds: [await get_failed_embed(client, item, rpg_data)] };
        return await message.reply({ embeds: [await get_failed_embed(client, item, rpg_data)] });
    };

    const need_arg = rpg_commands[command][3] ?? false;
    if (need_arg && !args[0]) {
        const embed = get_help_command("rpg", command, client);

        if (mode === 1) return { embeds: [embed] };
        return await message.reply({ embeds: [embed] });
    };

    const result = await execute({ client, message, rpg_data, data, args, mode, random_item: { item, amount } });
    if (mode === 1) return result;
};

/**
 * 
 * @param {string} category 
 * @returns {{failed: boolean, item: string, times: number}}
 */
function get_random_result(category) {
    const { probabilities, failed } = require("../../utils/config.js");
    const datas = probabilities[category];
    if (!datas) return {
        failed: true,
        item: null,
        amount: null
    };

    /*
    {
        "key": [amount, ...],
        "key2": [amount, ...],
        ...
    }

    -> [key * amount, key2 * amount, ...]
    */
    const result = [];
    for (const [key, value] of Object.entries(datas)) {
        result.push(...Array(value[0]).fill(key));
    };

    const item = choice(result);
    const data = datas[item];

    const amount = randint(data[1], data[2]);

    const is_failed = failed.includes(item);

    return { failed: is_failed, item, amount };
};

module.exports = {
    name: Events.MessageCreate,
    /**
     * 
     * @param {DogClient} client 
     * @param {Message} message 
     */
    execute: async function (client, message) {
        const { embed_error_color } = require("../../utils/config.js");
        const userId = message.author.id;

        if (!client.lock) client.lock = {};
        if (!client.lock.rpg_handler) client.lock.rpg_handler = {};
        if (client.lock.rpg_handler.hasOwnProperty(userId)) {
            const emoji_cross = await get_emoji(client, "crosS");
            const running_cmd = client.lock.rpg_handler[userId] ?? "?";

            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你已經在執行 ${running_cmd} 指令了`);

            return await message.reply({ embeds: [embed] });
        };

        try {
            const command = message.content.split(" ")[0].toLowerCase();
            client.lock.rpg_handler[userId] = command;


            // 超時機制
            const TIMEOUT = 30000; // 30 秒超時
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('指令執行超時')), TIMEOUT);
            });

            await Promise.race([
                rpg_handler({ client, message }),
                timeoutPromise
            ]);
        } catch (error) {
            if (error.message === '指令執行超時') {
                logger.error(`RPG 指令執行超時: userId=${userId}, command=${client.lock.rpg_handler[userId]}`);
            } else {
                logger.error(`處理rpg遊戲訊息時發生錯誤: ${error.stack}`);
            };

            await message.reply({ embeds: [await get_loophole_embed(client, error.stack)] });
        } finally {
            delete client.lock.rpg_handler[userId];
        };
    },
    max_hunger,
    rpg_cooldown,
    rpg_work,
    rpg_commands,
    rpg_emojis,
    redirect_data,
    redirect_data_reverse,
    privacy_data,
    rpg_actions,
    redirect,
    get_number_of_items,
    randint,
    setEmbedFooter,
    setEmbedAuthor,
    MockMessage,
    rpg_handler,
    find_redirect_targets_from_id,

    // moved to utils/rpg.js, require that instead.
    BetterEval,
    get_loophole_embed,
    get_emoji,
    add_money,
    remove_money,
    ls_function,
    is_cooldown_finished,
};
