const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { get_logger, getCallerModuleName } = require("./logger.js");
const { wait_until_ready } = require("./wait_until_ready.js");
const { prefix, embed_default_color, embed_error_color } = require("./config.js");

const logger = get_logger();

const mine_gets = [
    "coal",
    "diamond_ore",
    "emerald_ore",
    "gold_ore",
    "iron_ore",
    "ruby_ore",
    "sapphire_ore",
    "stone",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const ingots = [
    "diamond",
    "emerald",
    "gold",
    "iron",
    "ruby",
    "sapphire",
    "steel",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const logs = [
    "acacia_wood",
    "birch_wood",
    "crimson_wood",
    "dark_oak_wood",
    "god_wood",
    "ha_wood",
    "jungle_wood",
    "oak_wood",
    "spruce_wood",
    "warped_wood",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const planks = [
    "acacia_planks",
    "birch_planks",
    "crimson_planks",
    "dark_oak_planks",
    "god_planks",
    "ha_planks",
    "jungle_planks",
    "oak_planks",
    "spruce_planks",
    "warped_planks",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const wood_productions = {
    stick: "stick",
}

const recipes = {
    iron_armor: {
        input: [
            { item: "iron", amount: 28 }
        ],
        output: "iron_armor",
        amount: 1
    },
    iron_axe: {
        input: [
            { item: "stick", amount: 2 },
            { item: "iron", amount: 3 }
        ],
        output: "iron_axe",
        amount: 1
    },
    iron_hoe: {
        input: [
            { item: "stick", amount: 2 },
            { item: "iron", amount: 1 }
        ],
        output: "iron_hoe",
        amount: 1
    },
    iron_short_knife: {
        input: [
            { item: "stick", amount: 1 },
            { item: "iron", amount: 1 }
        ],
        output: "iron_short_knife",
        amount: 1
    },
    iron_sword: {
        input: [
            { item: "stick", amount: 1 },
            { item: "iron", amount: 3 }
        ],
        output: "iron_sword",
        amount: 1
    },
    stick: {
        input: [
            { item: "#planks", amount: 2 }
        ],
        output: "stick",
        amount: 1
    },
    stone_axe: {
        input: [
            { item: "stick", amount: 2 },
            { item: "stone", amount: 3 }
        ],
        output: "stone_axe",
        amount: 1
    },
    stone_short_knife: {
        input: [
            { item: "stick", amount: 1 },
            { item: "stone", amount: 1 }
        ],
        output: "stone_short_knife",
        amount: 1
    },
    stone_sword: {
        input: [
            { item: "stick", amount: 1 },
            { item: "stone", amount: 3 }
        ],
        output: "stone_sword",
        amount: 1
    },
    wooden_hoe: {
        input: [
            { item: "stick", amount: 2 },
            { item: "#planks", amount: 1 }
        ],
        output: "wooden_hoe",
        amount: 1
    }
};

// 動態生成木材到木板的合成配方，比例 1:4
Object.entries(logs).forEach(([logKey, logValue]) => {
    const plankKey = logKey.replace('_wood', '_planks');
    if (planks[plankKey]) {
        recipes[planks[plankKey]] = {
            input: [
                {
                    item: logValue,
                    amount: 1
                }
            ],
            output: planks[plankKey],
            amount: 4
        };
    };
});

const smeltable_items = [
    {
        input: [
            { item: "iron_ore", amount: 2 }
        ],
        output: "iron",
        amount: 1
    },
    {
        input: [
            { item: "iron", amount: 3 }
        ],
        output: "steel",
        amount: 1
    },
    {
        input: [
            { item: "diamond_ore", amount: 1 }
        ],
        output: "diamond",
        amount: 1
    },
];

const tags = {
    "planks": Object.keys(planks),
};

const foods_crops = [
    "apple",
    "bread",
    "raw_potato",
    "tomato",
    "carrot",
    "corn",
    "cooked_corn",
    "potato",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const foods_meat = [
    "anglerfish",
    "beef",
    "catfish",
    "chicken",
    "clownfish",
    "cod",
    "crab",
    "duck",
    "eel",
    "enchanted_golden_apple",
    "golden_apple",
    "golden_beef",
    "golden_carrot",
    "goldfish",
    "jellyfish",
    "koi",
    "lobster",
    "mutton",
    "octopus",
    "pork",
    "pufferfish",
    "raw_beef",
    "raw_chicken",
    "raw_duck",
    "raw_mutton",
    "raw_pork",
    "raw_shrimp",
    "salmon",
    "shrimp",
    "squid",
    "swordfish",
    "tropical_fish",
    "tuna",
    "whale",
    "raw_hugo",
    "hugo",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});

const animals = [
    "a_chicken",
    "a_duck",
    "a_sheep",
    "a_hugo",
    "cow",
    "pig",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, {});;

const animal_products = {
    a_chicken: "raw_chicken",
    a_duck: "raw_duck",
    a_sheep: "raw_mutton",
    a_hugo: "raw_hugo",
    cow: "raw_beef",
    pig: "raw_pork",
};

const foods = { ...foods_crops, ...foods_meat };

const shop_lowest_price = {
    // ==============礦物==============
    coal: 50,
    diamond: 750,
    diamond_ore: 150,
    emerald: 50,
    emerald_ore: 50,
    gold: 50,
    gold_ore: 50,
    iron: 250,
    iron_ore: 50,
    ruby: 50,
    ruby_ore: 50,
    sapphire: 50,
    sapphire_ore: 50,
    steel: 650,
    stone: 50,
    // ==============木材==============
    acacia_planks: 50,
    acacia_wood: 55,
    birch_planks: 50,
    birch_wood: 55,
    crimson_planks: 50,
    crimson_wood: 55,
    dark_oak_planks: 50,
    dark_oak_wood: 55,
    god_planks: 55,
    god_wood: 250,
    ha_planks: 55,
    ha_wood: 45,
    jungle_planks: 50,
    jungle_wood: 55,
    oak_planks: 50,
    oak_wood: 55,
    spruce_planks: 50,
    spruce_wood: 55,
    stick: 55,
    warped_planks: 50,
    warped_wood: 55,
    //==============材料==============
    egg: 50,
    // ==============食物(烤魚類也是食物)==============
    anglerfish: 55,
    apple: 85,
    beef: 50,
    bread: 130,
    cake: 50,
    candy: 50,
    catfish: 55,
    chicken: 50,
    chocolate: 50,
    clownfish: 55,
    cod: 55,
    cookie: 50,
    crab: 55,
    duck: 50,
    eel: 55,
    shark: 12345,
    hugo: 30000,
    enchanted_golden_apple: 50,
    golden_apple: 50,
    golden_beef: 50,
    golden_carrot: 50,
    goldfish: 55,
    jellyfish: 55,
    koi: 55,
    lobster: 55,
    melon_slice: 50,
    mutton: 125,
    octopus: 55,
    pork: 50,
    potato: 50,
    tomato: 50,
    carrot: 50,
    corn: 50,
    cooked_corn: 60,
    pufferfish: 55,
    pumpkin_pie: 50,
    raw_anglerfish: 55,
    raw_beef: 50,
    raw_catfish: 55,
    raw_chicken: 50,
    raw_clownfish: 55,
    raw_cod: 55,
    raw_crab: 55,
    raw_duck: 50,
    raw_eel: 55,
    raw_goldfish: 55,
    raw_jellyfish: 55,
    raw_koi: 55,
    raw_lobster: 55,
    raw_mutton: 50,
    raw_octopus: 55,
    raw_pork: 50,
    raw_potato: 85,
    raw_pufferfish: 55,
    raw_salmon: 55,
    raw_shrimp: 50,
    raw_squid: 55,
    raw_swordfish: 55,
    raw_tropical_fish: 55,
    raw_tuna: 55,
    raw_whale: 55,
    raw_shark: 10000,
    raw_hugo: 10000000,
    salmon: 55,
    shrimp: 50,
    squid: 55,
    swordfish: 55,
    tropical_fish: 55,
    tuna: 55,
    whale: 55,
    wheat: 65,
    // ==============武器裝備==============
    iron_armor: 1200,
    iron_axe: 55,
    iron_hoe: 55,
    iron_short_knife: 55,
    iron_sword: 55,
    stone_axe: 55,
    stone_short_knife: 55,
    stone_sword: 55,
    wooden_hoe: 55,
    // ==============藥水==============
    cough_potion: 55,
    dizzy_potion: 55,
    eye_potion: 55,
    floating_potion: 55,
    gold_potion: 55,
    ha_potion: 55,
    hair_growth_potion: 55,
    invisibility_potion: 55,
    jump_potion: 55,
    lucky_potion: 55,
    mystery_potion: 55,
    nausea_potion: 55,
    poison_potion: 55,
    regen_potion: 100,
    revive_potion: 55,
    unlucky_potion: 55,
};

const sell_data = {
    // ==============礦物==============
    coal: 45,
    diamond: 675,
    diamond_ore: 50,
    emerald: 50,
    emerald_ore: 50,
    gold: 50,
    gold_ore: 50,
    iron: 50,
    iron_ore: 45,
    ruby: 50,
    ruby_ore: 50,
    sapphire: 50,
    sapphire_ore: 50,
    stone: 45,
    // ==============木材==============
    acacia_planks: 50,
    acacia_wood: 45,
    birch_planks: 50,
    birch_wood: 45,
    crimson_planks: 50,
    crimson_wood: 45,
    dark_oak_planks: 50,
    dark_oak_wood: 45,
    god_planks: 50,
    god_wood: 225,
    ha_planks: 50,
    ha_wood: 45,
    jungle_planks: 50,
    jungle_wood: 45,
    oak_planks: 50,
    oak_wood: 45,
    spruce_planks: 50,
    spruce_wood: 45,
    stick: 50,
    warped_planks: 50,
    warped_wood: 45,
    //==============材料==============
    egg: 45,
    // ==============食物(烤魚類也是食物)==============
    anglerfish: 50,
    apple: 85,
    beef: 50,
    bread: 50,
    cake: 50,
    candy: 50,
    catfish: 50,
    chicken: 50,
    chocolate: 50,
    clownfish: 50,
    cod: 50,
    cookie: 50,
    crab: 50,
    duck: 50,
    eel: 50,
    shark: 11110,
    hugo: 27000,
    goldfish: 50,
    jellyfish: 50,
    koi: 50,
    lobster: 50,
    melon_slice: 50,
    mutton: 112,
    octopus: 50,
    pork: 50,
    potato: 117,
    tomato: 45,
    carrot: 45,
    corn: 45,
    cooked_corn: 54,
    pufferfish: 50,
    pumpkin_pie: 50,
    raw_anglerfish: 50,
    raw_beef: 50,
    raw_catfish: 50,
    raw_chicken: 50,
    raw_clownfish: 50,
    raw_cod: 50,
    raw_crab: 50,
    raw_duck: 50,
    raw_eel: 50,
    raw_goldfish: 50,
    raw_jellyfish: 50,
    raw_koi: 50,
    raw_lobster: 50,
    raw_mutton: 45,
    raw_octopus: 50,
    raw_pork: 50,
    raw_potato: 76,
    raw_pufferfish: 50,
    raw_salmon: 50,
    raw_shrimp: 50,
    raw_squid: 50,
    raw_swordfish: 50,
    raw_tropical_fish: 50,
    raw_tuna: 50,
    raw_whale: 50,
    raw_shark: 9000,
    raw_hugo: 9000000,
    salmon: 50,
    shrimp: 50,
    squid: 50,
    swordfish: 50,
    tropical_fish: 50,
    tuna: 50,
    whale: 50,
    // ==============特殊食物==============
    enchanted_golden_apple: 50,
    golden_apple: 50,
    golden_beef: 50,
    golden_carrot: 50,
    wheat: 58,
    // ==============武器裝備==============
    iron_armor: 1080,
    iron_axe: 50,
    iron_hoe: 50,
    iron_short_knife: 50,
    iron_sword: 50,
    stone_axe: 50,
    stone_short_knife: 50,
    stone_sword: 50,
    wooden_hoe: 50,
    // ==============藥水==============
    cough_potion: 50,
    dizzy_potion: 50,
    eye_potion: 50,
    floating_potion: 50,
    gold_potion: 50,
    ha_potion: 50,
    hair_growth_potion: 50,
    invisibility_potion: 50,
    jump_potion: 50,
    lucky_potion: 50,
    mystery_potion: 50,
    nausea_potion: 50,
    poison_potion: 50,
    regen_potion: 50,
    revive_potion: 50,
    steel: 585,
    unlucky_potion: 50,
};

const food_data = {
    anglerfish: 4,
    apple: 1,
    beef: 4,
    bread: 2,
    cake: 2,
    candy: 1,
    catfish: 3,
    chicken: 3,
    chocolate: 2,
    clownfish: 1,
    cod: 2,
    cookie: 2,
    crab: 2,
    duck: 3,
    eel: 4,
    enchanted_golden_apple: 4,
    golden_apple: 3,
    golden_beef: 3,
    golden_carrot: 3,
    goldfish: 1,
    jellyfish: 1,
    koi: 1,
    lobster: 2,
    melon_slice: 2,
    mutton: 3,
    octopus: 4,
    pork: 4,
    potato: 2,
    tomato: 1,
    carrot: 1,
    corn: 1,
    cooked_corn: 3,
    pufferfish: 2,
    pumpkin_pie: 3,
    raw_beef: 1,
    raw_chicken: 1,
    raw_duck: 1,
    raw_mutton: 1,
    raw_pork: 1,
    raw_potato: 1,
    raw_shrimp: 1,
    raw_tuna: 1,
    salmon: 3,
    shrimp: 3,
    squid: 4,
    swordfish: 3,
    tropical_fish: 2,
    tuna: 3,
    whale: 4,
    raw_hugo: 20,
    hugo: 100,
    egg: 1,
};

const brew = {
    cough_potion: "cough_potion",
    dizzy_potion: "dizzy_potion",
    eye_potion: "eye_potion",
    floating_potion: "floating_potion",
    gold_potion: "gold_potion",
    ha_potion: "ha_potion",
    hair_growth_potion: "hair_growth_potion",
    invisibility_potion: "invisibility_potion",
    jump_potion: "jump_potion",
    lucky_potion: "lucky_potion",
    mystery_potion: "mystery_potion",
    nausea_potion: "nausea_potion",
    poison_potion: "poison_potion",
    regen_potion: "regen_potion",
    revive_potion: "revive_potion",
    unlucky_potion: "unlucky_potion",
};

const fish = {
    raw_anglerfish: "raw_anglerfish",
    raw_catfish: "raw_catfish",
    raw_clownfish: "raw_clownfish",
    raw_cod: "raw_cod",
    raw_crab: "raw_crab",
    raw_eel: "raw_eel",
    raw_goldfish: "raw_goldfish",
    raw_jellyfish: "raw_jellyfish",
    raw_koi: "raw_koi",
    raw_lobster: "raw_lobster",
    raw_octopus: "raw_octopus",
    raw_pufferfish: "raw_pufferfish",
    raw_salmon: "raw_salmon",
    raw_shrimp: "raw_shrimp",
    raw_squid: "raw_squid",
    raw_swordfish: "raw_swordfish",
    raw_tropical_fish: "raw_tropical_fish",
    raw_tuna: "raw_tuna",
    raw_whale: "raw_whale",
};

const weapons_armor = {
    iron_armor: "iron_armor",
    iron_axe: "iron_axe",
    iron_hoe: "iron_hoe",
    iron_short_knife: "iron_short_knife",
    iron_sword: "iron_sword",
    stone_axe: "stone_axe",
    stone_short_knife: "stone_short_knife",
    stone_sword: "stone_sword",
    wooden_hoe: "wooden_hoe",
};

// 原材料: 生產出來的
const bake = {
    raw_beef: "beef",
    raw_chicken: "chicken",
    raw_duck: "duck",
    raw_mutton: "mutton",
    raw_pork: "pork",
    raw_potato: "potato",
    raw_salmon: "salmon",
    raw_shrimp: "shrimp",
    raw_tuna: "tuna",
    corn: "cooked_corn",
    wheat: "bread",
};

const name = {
    // ==============礦物==============
    coal: "煤炭",
    diamond: "鑽石",
    diamond_ore: "鑽石礦",
    emerald: "綠寶石",
    emerald_ore: "綠寶石礦",
    gold: "金",
    gold_ore: "金礦",
    iron: "鐵",
    iron_ore: "鐵礦",
    ruby: "紅寶石",
    ruby_ore: "紅寶石礦",
    sapphire: "藍寶石",
    sapphire_ore: "藍寶石礦",
    steel: "鋼鐵",
    stone: "石頭",
    // ==============木材==============
    acacia_planks: "金合歡木板",
    acacia_wood: "金合歡木",
    birch_planks: "白樺木板",
    birch_wood: "白樺木",
    crimson_planks: "緋紅木板",
    crimson_wood: "緋紅木",
    dark_oak_planks: "深色橡木板",
    dark_oak_wood: "深色橡木",
    god_planks: "神木板",
    god_wood: "神木",
    ha_planks: "哈木板",
    ha_wood: "哈木",
    jungle_planks: "叢林木板",
    jungle_wood: "叢林木",
    oak_planks: "橡木板",
    oak_wood: "橡木",
    spruce_planks: "雲杉木板",
    spruce_wood: "雲杉木",
    stick: "木棒",
    warped_planks: "凋零木板",
    warped_wood: "凋零木",
    // ==============材料==============
    egg: "雞蛋",
    // ==============食物==============
    apple: "蘋果",
    beef: "烤牛肉",
    bread: "麵包",
    chicken: "烤雞肉",
    duck: "烤鴨肉",
    enchanted_golden_apple: "附魔金蘋果",
    golden_apple: "金蘋果",
    golden_beef: "金牛肉",
    golden_carrot: "金蘿蔔",
    mutton: "烤羊肉",
    pork: "烤豬肉",
    potato: "烤馬鈴薯",
    tomato: "番茄",
    carrot: "紅蘿蔔",
    corn: "玉米",
    cooked_corn: "烤玉米",
    raw_beef: "生牛肉",
    raw_chicken: "生雞肉",
    raw_duck: "生鴨肉",
    raw_mutton: "生羊肉",
    raw_pork: "生豬肉",
    raw_potato: "馬鈴薯",
    raw_shrimp: "生蝦",
    raw_hugo: "生哈狗",
    hugo: "哈哈哈熱狗",
    shrimp: "烤蝦",
    wheat: "小麥",
    // ==============動物==============
    a_chicken: "雞",
    a_duck: "鴨",
    a_sheep: "羊",
    a_hugo: "哈狗",
    cow: "牛",
    pig: "豬",
    // ==============藥水==============
    cough_potion: "咳嗽藥水",
    dizzy_potion: "眩暈藥水",
    eye_potion: "眼藥水",
    floating_potion: "漂浮藥水",
    gold_potion: "黃金藥水",
    ha_potion: "哈藥水",
    hair_growth_potion: "增髮藥水",
    invisibility_potion: "隱形藥水",
    jump_potion: "跳躍藥水",
    lucky_potion: "幸運藥水",
    mystery_potion: "神秘藥水",
    nausea_potion: "噁心藥水",
    poison_potion: "中毒藥水",
    regen_potion: "回復藥水",
    revive_potion: "復活藥水",
    unlucky_potion: "倒楣藥水",
    // ==============魚類==============
    anglerfish: "烤燈籠魚",
    catfish: "烤鯰魚",
    clownfish: "烤小丑魚",
    cod: "烤鱈魚",
    crab: "烤螃蟹",
    eel: "烤鰻魚",
    goldfish: "烤金魚",
    jellyfish: "烤水母",
    koi: "烤錦鯉",
    lobster: "烤龍蝦",
    octopus: "烤章魚",
    pufferfish: "烤河豚",
    salmon: "烤鮭魚",
    shrimp: "烤蝦",
    squid: "烤魷魚",
    swordfish: "烤劍魚",
    tropical_fish: "烤熱帶魚",
    tuna: "烤鮪魚",
    whale: "烤鯨魚",
    shark: "烤鯊魚",
    raw_anglerfish: "生燈籠魚",
    raw_catfish: "生鯰魚",
    raw_clownfish: "生小丑魚",
    raw_cod: "生鱈魚",
    raw_crab: "生螃蟹",
    raw_eel: "生鰻魚",
    raw_goldfish: "生金魚",
    raw_jellyfish: "生水母",
    raw_koi: "生錦鯉",
    raw_lobster: "生龍蝦",
    raw_octopus: "生章魚",
    raw_pufferfish: "生河豚",
    raw_salmon: "生鮭魚",
    raw_shrimp: "生蝦",
    raw_squid: "生魷魚",
    raw_swordfish: "生劍魚",
    raw_tropical_fish: "生熱帶魚",
    raw_tuna: "生鮪魚",
    raw_whale: "生鯨魚",
    raw_shark: "生鯊魚",
    // ==============武器 & 防具==============
    iron_armor: "鐵製盔甲",
    iron_axe: "鐵斧",
    iron_hoe: "鐵鋤",
    iron_short_knife: "鐵短刀",
    iron_sword: "鐵劍",
    stone_axe: "石斧",
    stone_short_knife: "石短刀",
    stone_sword: "石劍",
    wooden_hoe: "木鋤",
    // ==============tags==============
    "#planks": "任意木板"
    // ==============....==============
};

const name_reverse = Object.entries(name).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {});

function check_item_data() {
    const { get_probability_of_id } = require("./file.js");

    const all_items = [
        ...Object.values(mine_gets),
        ...Object.values(ingots),
        ...Object.values(logs),
        ...Object.values(planks),
        ...Object.values(foods),
        ...Object.keys(recipes),
        ...Object.values(wood_productions),
        ...Object.values(animal_products),
        ...Object.keys(name).filter(item => !item.startsWith("#")),
    ].flat().filter(item => !Object.values(animals).includes(item));

    const work_productions = [
        ...Object.keys(animal_products),
        ...Object.values(mine_gets),
        // ...Object.values(ingots),
        ...Object.values(logs),
        ...Object.values(foods_crops),
        ...Object.values(foods_meat).filter(e => e.startsWith("raw_")),
    ]
        .flat()
        .filter(item => !Object.values(animal_products).includes(item))
        .filter(item => !Object.values(bake).includes(item));


    for (const item_id of all_items) {
        if (!name[item_id]) {
            logger.warn(`[警告] 物品ID "${item_id}" 沒有對應的名稱`);
        };

        if (!shop_lowest_price[item_id]) {
            logger.warn(`[警告] 物品ID "${item_id}" 沒有對應的最低上架價格`);
        };

        if (!sell_data[item_id]) {
            logger.warn(`[警告] 物品ID "${item_id}" 沒有對應的出售價格`);
        };

    };

    for (const item_id of work_productions) {
        if (get_probability_of_id(item_id)) continue;
        logger.warn(`[警告] 物品ID "${item_id}" 沒有對應的掉落機率，會導致無法獲取此物品、或是工作指令報錯`);
    };
};

function get_name_of_id(id, default_value = id) {
    return name[id] || default_value;
};

function get_id_of_name(id, default_value = id) {
    return name_reverse[id] || default_value;
};

function get_number_of_items(name, userid) {
    const { load_rpg_data } = require("./file.js");

    const rpg_data = load_rpg_data(userid);
    const items = rpg_data.inventory;

    // 如果輸入的是中文名稱，找到對應的英文key
    let item_key = name;
    if (Object.values(name_list).includes(name)) {
        item_key = Object.keys(name_list).find(key => name_list[key] === name);
    };

    if (!items[item_key]) return 0;
    return items[item_key];
};

/**
 * 
 * @param {string} userid 
 * @param {string} item 
 * @param {number} item_amount 
 * @returns {boolean} 如果玩家有足夠的物品，回傳true
 */
function userHaveEnoughItems(userid, item, item_amount) {
    const { load_rpg_data } = require("./file.js");

    const rpg_data = load_rpg_data(userid);
    const items = rpg_data.inventory;

    return items?.[item] && items[item] >= item_amount;
};

/**
 * 
 * @param {Array<{item: string, amount: number}> | Array<string> | string} item_datas 
 * @returns {Promise<EmbedBuilder>}
 */
async function notEnoughItemEmbed(item_datas, client = global._client) {
    const { setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    if (item_datas?.length <= 0) throw new Error("item_datas is empty");
    if (!Array.isArray(item_datas)) item_datas = [item_datas];

    const items_str = item_datas.map(item_data => {
        if (typeof item_data === "string") return item_data;
        if (typeof item_data !== "object") {
            logger.warn(`item_data應該是物件或字串，但：\n${JSON.stringify(item_data, null, 4)}`);
            return item_data;
        };

        const length = Object.keys(item_data).length;
        if (!item_data.item || !item_data.amount || length !== 2) {
            logger.warn(`item_data應該只有item和amount屬性，但：\n${JSON.stringify(item_data, null, 4)}`)
        };

    
        if (item_data.name && !item_data.item) {
            logger.warn(`item_data應該使用item屬性，但使用了name：\n${JSON.stringify(item_data, null, 4)}`)
            item_data.item = item_data.name;
        };

        return `${get_name_of_id(item_data.item)} \`x${item_data.amount}\`個`;
    }).join("、");

    const emoji_cross = await get_emoji(client, "crosS");
    const embed = new EmbedBuilder()
        .setTitle(`${emoji_cross} | 你沒有那麼多的物品`)
        .setColor(embed_error_color)
        .setDescription(`你缺少了 ${items_str}`);

    return setEmbedFooter(client, embed);
};

const oven_slots = 3;
const farm_slots = 4;
const smelter_slots = 3;

/*
██████╗ ██████╗  ██████╗     ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔══██╗██╔══██╗██╔════╝     ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
██████╔╝██████╔╝██║  ███╗    █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
██╔══██╗██╔═══╝ ██║   ██║    ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
██║  ██║██║     ╚██████╔╝    ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
╚═╝  ╚═╝╚═╝      ╚═════╝     ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
*/

function BetterEval(obj) {
    return Function(`"use strict";return ${obj}`)();
};

async function get_help_embed(category, client) {
    const { rpg_help, rpg_emojis, setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    category = category.toLowerCase();

    if (!rpg_help[category]) return null;

    const embedData = rpg_help[category];
    const emojiName = rpg_emojis[category] || "question";

    let emojiStr = "❓"; // 預設表情符號
    emojiStr = await get_emoji(client, emojiName);

    const embed = new EmbedBuilder()
        .setColor(embedData.color)
        .setTitle(`${emojiStr} | ${embedData.title}`)
        .setDescription(embedData.description);

    return setEmbedFooter(client, embed);
};

async function get_emoji(client = global._client, name) {
    // await client.application.fetch();
    wait_until_ready(client);

    let emojis = client.application.emojis.cache;
    let emoji = emojis.find(e => e.name === name);

    if (!emoji) {
        emojis = await client.application.emojis.fetch();
        emoji = emojis.find(e => e.name === name);
    };

    // if (!emoji) throw new Error(`找不到名為${name}的emoji`);
    if (!emoji) return "";
    emoji = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
    return emoji;
};

async function get_cooldown_embed(remaining_time, client = global._client, action, count) {
    const { rpg_actions, setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    const emoji = await get_emoji(client, "crosS");

    const timestamp = Math.floor(Date.now() / 1000) + Math.floor(remaining_time / 1000);
    const time = `<t:${timestamp}:T> (<t:${timestamp}:R>)`;

    action = rpg_actions[action];
    const verb = action[0];
    const noun = action[1];

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji} | 你過勞了！`)
        .setDescription(`你今天${verb}了 \`${count}\` 次${noun}，等待到 ${time} 可以繼續${action.join("")}`);
    return setEmbedFooter(client, embed);
};

function get_cooldown_time(command_name, rpg_data) {
    const { rpg_cooldown } = require("../cogs/rpg/msg_handler.js");

    return BetterEval(rpg_cooldown[command_name].replace("{c}", rpg_data.count[command_name]));
};

/**
 * 檢查指令是否已經冷卻完畢
 * @param {string} command_name - 指令名稱
 * @param {Object} rpg_data - 用戶的RPG數據
 * @returns {{is_finished: boolean, remaining_time: number}} - is_finished:如果已冷卻完畢返回true，否則返回false - remaining_time: 剩餘時間
 */
function is_cooldown_finished(command_name, rpg_data) {
    const { rpg_cooldown } = require("../cogs/rpg/msg_handler.js");

    if (!rpg_cooldown[command_name]) return { is_finished: true, remaining_time: 0 };
    const lastRunTimestamp = rpg_data.lastRunTimestamp[command_name] || 0;
    const now = Date.now();
    const time_diff = now - lastRunTimestamp;
    const cooldown_time = get_cooldown_time(command_name, rpg_data) * 1000; // 轉換為毫秒

    return {
        is_finished: time_diff >= cooldown_time,
        remaining_time: cooldown_time - time_diff,
        endsAtms: lastRunTimestamp + cooldown_time,
        endsAts: Math.floor((lastRunTimestamp + cooldown_time) / 1000),
    };
};

async function get_failed_embed(client = global._client, failed_reason, rpg_data) {
    const { setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    let title = "失敗";
    let description = `${failed_reason}`;

    if (failed_reason === "boom") {
        const emoji_bomb = await get_emoji(client, "bomb");
        title = `${emoji_bomb} | 蹦!`;
        description = `你以為挖到了鑽石，但其實是一顆從二戰就埋藏在那的炸彈！`;
    } else if (failed_reason === "mouse") {
        const emoji_wood = await get_emoji(client, "wood");
        title = `${emoji_wood} | 山老鼠別跑`;
        description = `你來到了森林發現有山老鼠把木材都偷走了！`;
    } else if (failed_reason === "collapse") {
        const emoji_bomb = await get_emoji(client, "bomb");
        title = `${emoji_bomb} | 快逃!!`;
        description = `你努力地在暗黑的礦洞中尋找鑽石，但是別的同伴亂挖導致礦洞坍塌了！`;
    } else if (failed_reason === "storm") {
        const emoji_fisher = await get_emoji(client, "fisher");
        title = `${emoji_fisher} | 搖到快吐了`;
        description = `氣象明明說今天天氣很好怎麼會有暴風雨！`;
    } else if (failed_reason === "shark") {
        const emoji_fisher = await get_emoji(client, "fisher");
        title = `${emoji_fisher} | a`;
        description = `欸不是鯊魚 快跑`;
    } else if (failed_reason === "acid_rain") {

    } else if (failed_reason === "escape") {
        const emoji_cow = await get_emoji(client, "cow");
        title = `${emoji_cow} | 給我回來!`;
        description = `你放牧了一頭牛，結果一轉身他就不見了？！`;
    } else if (failed_reason === "epidemic") {
        const emoji_cow = await get_emoji(client, "cow");
        title = `${emoji_cow} | 瘟疫在搞欸`;
        description = `很不幸的最近禽類都染上瘟疫，導致動物都死光了`;
    };

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(title)
        .setDescription(description);

    return setEmbedFooter(client, embed, '', rpg_data);
}

/**
 * 增加錢
 * @param {Object} rpg_data 
 * @param {number} amount 
 * @param {string} originalUser 來源用戶 (系統 或者 '<@id>')
 * @param {string} targetUser 目標用戶 (只能是 '<@id>')
 * @param {string} type 交易類型
 * @returns {number}
 */
function add_money({ rpg_data, amount, originalUser, targetUser, type }) {
    rpg_data.money += amount;
    rpg_data.transactions.push({
        timestamp: Math.floor(Date.now() / 1000),
        originalUser,
        targetUser,
        amount,
        type
    });
    return rpg_data.money;
};

/**
 * 扣除錢
 * @param {Object} rpg_data 
 * @param {number} amount 
 * @param {string} originalUser 來源用戶 (系統 或者 '<@id>')
 * @param {string} targetUser 目標用戶 (只能是 '<@id>')
 * @param {string} type 交易類型
 * @returns {number}
 */
function remove_money({ rpg_data, amount, originalUser, targetUser, type }) {
    rpg_data.money -= amount;
    rpg_data.transactions.push({
        timestamp: Math.floor(Date.now() / 1000),
        originalUser,
        targetUser,
        amount,
        type
    });
    return rpg_data.money;
};

async function get_loophole_embed(client = global._client, text) {
    const { setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    const emoji_cross = await get_emoji(client, "crosS");

    if (text && !text.includes("```")) {
        text = `\`\`\`${text}\`\`\``;
    };

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji_cross} | 你戳到了一個漏洞！`)
        .setDescription(text);

    return setEmbedFooter(client, embed);
};

async function ls_function({ client, message, rpg_data, data, args, mode, random_item, PASS }) {
    const { privacy_data, setEmbedFooter } = require("../cogs/rpg/msg_handler.js");

    if (!rpg_data.privacy.includes(privacy_data["ls"]) && !PASS) {
        const bag_emoji = await get_emoji(client, "bag");

        let embed = new EmbedBuilder()
            .setTitle(`${bag_emoji} | 查看包包`)
            .setColor(embed_default_color)
            .setDescription(`為保護包包內容隱私權，戳這顆按鈕來看你的包包，隱私權設定可以透過 \`${prefix}privacy\` 指令更改`);

        embed = setEmbedFooter(client, embed);

        const confirm_button = new ButtonBuilder()
            .setCustomId(`ls|${message.author.id}`)
            .setEmoji(bag_emoji)
            .setLabel("查看包包")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder()
            .addComponents(confirm_button);

        if (mode === 1) return { embeds: [embed], components: [row] };
        return await message.reply({ embeds: [embed], components: [row] });
    };

    const emojiNames = ["bag", "ore", "farmer", "cow", "swords", "potion"];
    const [bag_emoji, ore_emoji, farmer_emoji, cow_emoji, swords_emoji, potion_emoji] = await Promise.all(
        emojiNames.map(name => get_emoji(client, name))
    );

    // 分類物品
    const ores = {};
    const log_items = {};
    const food_crops_items = {};
    const food_meat_items = {}
    const fish_items = {};
    const weapons_armor_items = {};
    const potions_items = {}
    const other_items = {};

    // 遍歷背包中的物品並分類
    for (const [item, amount] of Object.entries(rpg_data.inventory || {})) {
        if (!amount) continue;

        if (Object.keys(mine_gets).includes(item) || Object.keys(ingots).includes(item)) {
            ores[item] = amount;
        } else if (Object.keys(logs).includes(item) || Object.keys(planks).includes(item) || Object.keys(wood_productions).includes(item)) {
            log_items[item] = amount;
        } else if (Object.keys(foods_crops).includes(item)) {
            food_crops_items[item] = amount;
        } else if (Object.keys(foods_meat).includes(item) && !Object.keys(fish).includes(item)) {
            food_meat_items[item] = amount;
        } else if (Object.keys(fish).includes(item)) {
            fish_items[item] = amount;
        } else if (Object.keys(weapons_armor).includes(item)) {
            weapons_armor_items[item] = amount;
        } else if (Object.keys(brew).includes(item)) {
            potions_items[item] = amount;
        } else {
            other_items[item] = amount;
        };
    };

    // 創建嵌入訊息
    const embed = new EmbedBuilder()
        .setColor(embed_default_color)
        .setTitle(`${bag_emoji} | 你的背包`);

    setEmbedFooter(client, embed);

    // 使用循環添加各類物品欄位
    const categories = [
        { items: ores, name: `${ore_emoji} 礦物` },
        { items: log_items, name: '🪵 木材' },
        { items: food_crops_items, name: `${farmer_emoji} 農作物` },
        { items: food_meat_items, name: `${cow_emoji} 肉類` },
        { items: fish_items, name: `🐟 魚類` },
        { items: weapons_armor_items, name: `${swords_emoji} 武器 & 防具` },
        { items: potions_items, name: `${potion_emoji} 藥水` },
        { items: other_items, name: '📦 其他物品' }
    ];

    // 如果背包是空的
    if (Object.keys(rpg_data.inventory || {}).length === 0) {
        embed.setColor(embed_error_color);
        embed.setTitle(`${bag_emoji} | 你的背包裡沒有任何東西`);
    } else {
        for (const category of categories) {
            if (Object.keys(category.items).length > 0) {
                const itemsText = Object.entries(category.items)
                    .map(([item, amount]) => `${get_name_of_id(item)} \`x${amount.toLocaleString()}\``)
                    .join('\n');
                embed.addFields({ name: category.name, value: itemsText, inline: true });
            };
        };
    };


    if (mode === 1) return { embeds: [embed] };
    return await message.reply({ embeds: [embed] });
};

module.exports = {
    mine_gets,
    ingots,
    logs,
    planks,
    foods,
    foods_crops,
    foods_meat,
    food_data,
    name,
    name_reverse,
    recipes,
    smeltable_items,
    animals,
    animal_products,
    shop_lowest_price,
    brew,
    fish,
    wood_productions,
    weapons_armor,
    tags,
    bake,
    sell_data,
    check_item_data,
    get_name_of_id,
    get_id_of_name,
    get_number_of_items,
    userHaveEnoughItems,
    notEnoughItemEmbed,
    oven_slots,
    farm_slots,
    smelter_slots,
    // rpg functions
    BetterEval,
    get_help_embed,
    get_emoji,
    get_cooldown_embed,
    get_cooldown_time,
    is_cooldown_finished,
    get_failed_embed,
    add_money,
    remove_money,
    get_loophole_embed,
    ls_function,
};
