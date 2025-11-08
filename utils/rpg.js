const { get_logger, getCallerModuleName } = require("./logger.js");

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
    "cake",
    "candy",
    "chocolate",
    "cookie",
    "melon_slice",
    "potato",
    "pumpkin_pie",
    "raw_potato",
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
    raw_hugo: 10,
    salmon: 55,
    shrimp: 50,
    squid: 55,
    swordfish: 55,
    tomato: 50,
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
    raw_hugo: 9,
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
    cake: "蛋糕",
    candy: "糖果",
    chicken: "烤雞肉",
    chocolate: "巧克力",
    cookie: "餅乾",
    duck: "烤鴨肉",
    enchanted_golden_apple: "附魔金蘋果",
    golden_apple: "金蘋果",
    golden_beef: "金牛肉",
    golden_carrot: "金蘿蔔",
    melon_slice: "西瓜片",
    mutton: "烤羊肉",
    pork: "烤豬肉",
    potato: "烤馬鈴薯",
    pumpkin_pie: "南瓜派",
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
        ...Object.values(animal_products),
        ...Object.values(mine_gets),
        // ...Object.values(ingots),
        ...Object.values(logs),
        ...Object.values(foods_crops),
        ...Object.values(foods_meat).filter(e => e.startsWith("raw_")),
    ].flat().filter(item => !Object.values(animals).includes(item));


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
        if (get_probability_of_id(item_id) || animal_products[item_id]) continue;
        logger.debug(`[警告] 物品ID "${item_id}" 沒有對應的掉落機率，會導致無法獲取此物品、或是工作指令報錯`);
    };
};

function get_name_of(id, default_value = id) {
    logger.warn(`[get_name_of] [DEPRECAETD] use get_name_of_id instead. Called from\n${getCallerModuleName(null)}`);
    return get_name_of_id(id, default_value);
};

function get_name_of_id(id, default_value = id) {
    return name[id] || default_value;
};

function get_id_of_name(id, default_value = id) {
    return name_reverse[id] || default_value;
};

function get_number_of_items(name, userid) {
    const { load_rpg_data } = require("../module_database.js");
    const { name: name_list } = require("../rpg.js");
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

const oven_slots = 3;
const farm_slots = 4;
const smelter_slots = 3;

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
    get_name_of,
    get_name_of_id,
    get_id_of_name,
    get_number_of_items,
    oven_slots,
    farm_slots,
    smelter_slots,
};
