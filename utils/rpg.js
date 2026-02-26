const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, Emoji, BaseInteraction, escapeMarkdown, Message, ApplicationEmoji } = require("discord.js");
const util = require("util");

const {
    wait_for_client,
} = require("./wait_for_client.js");
const {
    get_logger,
} = require("./logger.js");
const {
    load_rpg_data,
    loadData,
    get_probability_of_id,
} = require("./file.js");
const {
    convertToSecondTimestamp,
    DateNowSecond,
} = require("./timestamp.js");
const {
    embed_default_color,
    embed_error_color,
    embed_fell_color,
    reserved_prefixes,
    setJobDelay,
    jobs,
    workCmdJobs,
    PrivacySettings,
} = require("./config.js");
const {
    get_lang_data,
} = require("./language.js");
const EmbedBuilder = require("./customs/embedBuilder.js");
const DogClient = require("./customs/client.js");

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
}, /** @type {Object<string, string>} */({}));

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
}, /** @type {Object<string, string>} */({}));

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
}, /** @type {Object<string, string>} */({}));

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
}, /** @type {Object<string, string>} */({}));

const wood_productions = {
    stick: "stick",
};

/** @type {{ [k: string]: { input: { item: string, amount: number }[], output: string, amount: number } }} */
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
    },
    god_stick: {
        input: [
            { item: "gold", amount: 1 },
            { item: "stick", amount: 1 }
        ],
        output: "god_stick",
        amount: 1
    },
    bread_dough: {
        input: [
            { item: "bread", amount: 1 }
        ],
        output: "bread_dough",
        amount: 2
    },
    hugo_burger: {
        input: [
            { item: "bread_dough", amount: 2 },
            { item: "hugo", amount: 1 }
        ],
        output: "hugo_burger",
        amount: 1
    },
};

// 動態生成木材到木板的合成配方，比例 1:4
Object.entries(logs).forEach(([logKey, logValue]) => {
    const plankKey = logKey.replace("_wood", "_planks");
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

const smeltable_recipe = [
    {
        input: {
            item: "iron_ore",
            amount: 2
        },
        output: "iron",
        amount: 1
    },
    {
        input: {
            item: "iron",
            amount: 3
        },
        output: "steel",
        amount: 1
    },
    {
        input: {
            item: "diamond_ore",
            amount: 1
        },
        output: "diamond",
        amount: 1
    },
    {
        input: {
            item: "gold_ore",
            amount: 5
        },
        output: "gold",
        amount: 1
    },
];

/** @type {{ [k: string]: string[] }} */
const tags = {
    "planks": Object.keys(planks),
};

const foods_crops = [
    "apple",
    "bread",
    "bread_dough",
    "raw_potato",
    "tomato",
    "tomato_egg",
    "carrot_egg",
    "carrot",
    "corn",
    "cooked_corn",
    "potato",
    "wheat",
    "hugo_burger",
].reduce((acc, cur) => {
    acc[cur] = cur;
    return acc;
}, /** @type {Object<string, string>} */({}));

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
    "raw_anglerfish",
    "raw_catfish",
    "raw_clownfish",
    "raw_cod",
    "raw_crab",
    "raw_duck",
    "raw_eel",
    "raw_goldfish",
    "raw_jellyfish",
    "raw_koi",
    "raw_lobster",
    "raw_mutton",
    "raw_pufferfish",
    "raw_octopus",
    "raw_salmon",
    "raw_squid",
    "raw_swordfish",
    "raw_tropical_fish",
    "raw_tuna",
    "raw_whale",
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
}, /** @type {Object<string, string>} */({}));

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
}, /** @type {Object<string, string>} */({}));

/** @type {{ [k: string]: string }} */
const animal_products = {
    a_chicken: "raw_chicken",
    a_duck: "raw_duck",
    a_sheep: "raw_mutton",
    a_hugo: "raw_hugo",
    a_dog: "dogdog",
    cow: "raw_beef",
    pig: "raw_pork",
};

/** @type {{ [k: string]: number }} */
const shop_lowest_price = {
    // ==============材料==============
    egg: 50,
    // ==============作物==============
    wheat: 65,
    raw_potato: 85,
    carrot: 85,
    apple: 100,
    tomato: 100,
    corn: 120,
    cooked_corn: 150,
    // ==============魚獲==============
    raw_anglerfish: 95,
    raw_catfish: 95,
    raw_clownfish: 95,
    raw_cod: 95,
    raw_crab: 95,
    raw_eel: 95,
    raw_goldfish: 95,
    raw_jellyfish: 95,
    raw_koi: 95,
    raw_lobster: 95,
    raw_octopus: 95,
    raw_pufferfish: 95,
    raw_squid: 95,
    raw_swordfish: 95,
    raw_tropical_fish: 95,
    raw_whale: 95,
    raw_shrimp: 85,
    raw_salmon: 105,
    raw_tuna: 105,
    raw_shark: 130,
    raw_hugo: 140,
    // ==============肉品==============
    raw_duck: 100,
    raw_chicken: 100,
    raw_pork: 100,
    raw_beef: 115,
    raw_mutton: 115,
    // ==============食物==============
    bread: 125,
    bread_dough: 62,
    potato: 130,
    shrimp: 150,
    salmon: 105,
    tuna: 105,
    pork: 135,
    beef: 175,
    tomato_egg: 175,
    carrot_egg: 175,
    duck: 150,
    chicken: 150,
    mutton: 150,
    anglerfish: 135,
    catfish: 135,
    clownfish: 135,
    cod: 135,
    crab: 135,
    eel: 135,
    goldfish: 135,
    jellyfish: 135,
    koi: 135,
    lobster: 135,
    octopus: 135,
    pufferfish: 135,
    squid: 135,
    swordfish: 135,
    tropical_fish: 135,
    whale: 135,
    shark: 140,
    hugo: 150,
    // ==============礦物==============
    coal: 50,
    iron_ore: 50,
    diamond_ore: 150,
    stone: 50,
    emerald_ore: 270,
    gold_ore: 200,
    ruby_ore: 230,
    sapphire_ore: 230,
    // ==============熔煉物==============
    diamond: 750,
    emerald: 50,
    gold: 500,
    iron: 250,
    ruby: 50,
    sapphire: 50,
    steel: 650,
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
    // ==============木頭==============
    acacia_planks: 14,
    acacia_wood: 55,
    birch_planks: 14,
    birch_wood: 55,
    crimson_planks: 14,
    crimson_wood: 55,
    dark_oak_planks: 14,
    dark_oak_wood: 55,
    god_planks: 55,
    god_wood: 250,
    ha_planks: 55,
    ha_wood: 45,
    jungle_planks: 14,
    jungle_wood: 55,
    oak_planks: 14,
    oak_wood: 55,
    spruce_planks: 14,
    spruce_wood: 55,
    stick: 55,
    warped_planks: 14,
    warped_wood: 55,
    // ==============合成品==============
    god_stick: 500,
    stone_sword: 150,
    stone_axe: 300,
    stone_short_knife: 250,
    iron_sword: 600,
    iron_axe: 650,
    iron_short_knife: 350,
    iron_armor: 1200,
    wooden_hoe: 25,
    iron_hoe: 50,
    // =============其他===============
    dogdog: 1000,
    // ============================
};

const sell_data = Object.keys(shop_lowest_price).reduce(function (result, key) {
    result[key] = parseFloat((shop_lowest_price[key] * 0.9).toFixed(1));
    return result;
},
    /** @type {{ [k: string]: number }} */
    ({})
);

/** @type {{ [k: string]: number }} */
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
    clownfish: 3,
    cod: 2,
    cookie: 2,
    crab: 2,
    duck: 3,
    eel: 4,
    goldfish: 3,
    jellyfish: 3,
    koi: 3,
    lobster: 2,
    mutton: 3,
    octopus: 4,
    pork: 4,
    potato: 2,
    tomato: 1,
    tomato_egg: 3,
    carrot_egg: 3,
    carrot: 1,
    corn: 1,
    cooked_corn: 3,
    pufferfish: 2,
    salmon: 3,
    shrimp: 3,
    squid: 4,
    swordfish: 3,
    tropical_fish: 2,
    tuna: 3,
    whale: 4,
    raw_hugo: 4,
    hugo: 3,
    hugo_burger: 4,
    egg: 1,
    raw_beef: 1,
    raw_chicken: 1,
    raw_pork: 1,
    raw_potato: 1,
    raw_shrimp: 1,
    raw_anglerfish: 1,
    raw_catfish: 1,
    raw_clownfish: 1,
    raw_cod: 1,
    raw_crab: 1,
    raw_duck: 1,
    raw_eel: 1,
    raw_goldfish: 1,
    raw_jellyfish: 1,
    raw_koi: 1,
    raw_lobster: 1,
    raw_mutton: 1,
    raw_pufferfish: 1,
    raw_octopus: 1,
    raw_salmon: 1,
    raw_squid: 1,
    raw_swordfish: 1,
    raw_tropical_fish: 1,
    raw_tuna: 1,
    raw_whale: 1,
};

let foods = { ...foods_crops, ...foods_meat };

// 透過food_data排序foods, 從高到低
foods = Object.keys(foods).sort((a, b) => food_data[b] - food_data[a]).reduce((obj, key) => {
    obj[key] = foods[key];
    return obj;
}, /** @type {Object<string, string>} */({}));

/** @type {{ [k: string]: string }} */
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

/** @type {{ [k: string]: string }} */
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

/** @type {{ [k: string]: string }} */
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

/** @type {{ [k: string]: string }} */
let bake = {
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

for (const raw_food of Object.keys(foods_meat).filter(e => e.startsWith("raw_"))) {
    if (bake[raw_food]) continue;

    const food = raw_food.replace("raw_", "");
    bake[raw_food] = food;
};

const cook = [
    { // tomato_egg
        input: [
            { name: "tomato", amount: 1 },
            { name: "egg", amount: 1 },
        ],
        output: "tomato_egg",
        amount: 1,
    },
    { // carrot_egg
        input: [
            { name: "carrot", amount: 1 },
            { name: "egg", amount: 1 },
        ],
        output: "carrot_egg",
        amount: 1,
    },
];

/** @type {{ [k: string]: string }} */
const name = {
    // ==============礦物==============
    coal: "煤炭",
    diamond_ore: "鑽石礦",
    emerald_ore: "綠寶石礦",
    gold_ore: "金礦",
    iron_ore: "鐵礦",
    ruby_ore: "紅寶石礦",
    sapphire_ore: "藍寶石礦",
    stone: "石頭",
    // ==============熔煉物==============
    diamond: "鑽石",
    emerald: "綠寶石",
    gold: "黃金",
    iron: "鐵",
    ruby: "紅寶石",
    sapphire: "藍寶石",
    steel: "鋼鐵",
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
    warped_planks: "凋零木板",
    warped_wood: "凋零木",

    stick: "木棒",
    god_stick: "神木棒",
    // ==============材料==============
    egg: "雞蛋",
    // ==============食物==============
    apple: "蘋果",
    beef: "烤牛肉",
    bread: "麵包",
    bread_dough: "麵包胚",
    chicken: "烤雞肉",
    duck: "烤鴨肉",
    mutton: "烤羊肉",
    pork: "烤豬肉",
    potato: "烤馬鈴薯",
    tomato: "番茄",
    tomato_egg: "番茄炒蛋",
    carrot_egg: "胡蘿蔔炒蛋",
    carrot: "紅蘿蔔",
    corn: "玉米",
    cooked_corn: "烤玉米",
    raw_beef: "生牛肉",
    raw_chicken: "生雞肉",
    raw_duck: "生鴨肉",
    raw_mutton: "生羊肉",
    raw_pork: "生豬肉",
    raw_potato: "馬鈴薯",
    raw_hugo: "生哈狗",
    hugo: "烤哈狗",
    hugo_burger: "哈狗堡",
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
    "#planks": "任意木板",
    // ==============職業==============
    fisher: "漁夫",
    pharmacist: "藥劑師",
    farmer: "農夫",
    cook: "廚師",
    miner: "礦工",
    herder: "牧農",
    blacksmith: "鐵匠",
    lumberjack: "伐木工",
    // ==============其他==============
    a_dog: "狗狗機器犬",
    dogdog: "正在孵化的幼犬",
    // ==============....==============
};

const name_reverse = Object.entries(name).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
},
    /** @type {{ [k: string]: string }} */
    ({})
);

function check_item_data() {
    const all_items = [
        ...Object.values(mine_gets),
        ...Object.values(ingots),
        ...Object.values(logs),
        ...Object.values(planks),
        ...Object.values(foods),
        ...Object.keys(recipes),
        ...Object.values(wood_productions),
        ...Object.values(animal_products),
        ...Object.keys(name),
    ]
        .flat()
        .filter(item => !item.startsWith("#"))
        .filter(item => !jobs[item])
        .filter(item => !Object.keys(animal_products).includes(item))
        .filter(item => !Object.values(animals).includes(item));

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
        .filter(item => !Object.values(bake).includes(item))
        .filter(item => !cook.map(data => data.output).includes(item));


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

/**
 * Get the item name of the item ID
 * @param {string} id
 * @param {string | *} default_value
 * @returns {string | *} id or default_value
 */
function get_name_of_id(id, default_value = id) {
    return name[id] || default_value;
};

/**
 * Get the item ID of the item name
 * @param {string} id
 * @param {string | *} default_value
 * @returns {string | *} id or default_value
 */
function get_id_of_name(id, default_value = id) {
    return name_reverse[id] || default_value;
};

/**
 * Get the amount of item in the inventory of a user
 * @param {string} name
 * @param {string} userid
 * @returns {Promise<number>}
 */
async function get_number_of_items(name, userid) {
    const rpg_data = await load_rpg_data(userid);
    const items = rpg_data.inventory;

    // 如果輸入的是中文名稱，找到對應的英文key
    let item_key = get_id_of_name(name);

    if (!item_key) return 0;

    if (!items[item_key]) return 0;
    return items[item_key];
};

/**
 *
 * @param {import("./config.js").RpgDatabase} rpg_data
 * @param {string} item
 * @param {number} amount_needed
 * @returns {null | {item: string, amount: number}} 如果玩家有足夠的物品，回傳null，否則返回物品id和數量
 */
function userHaveNotEnoughItems(rpg_data, item, amount_needed) {
    const items = rpg_data.inventory;

    const item_amount = items?.[item];

    if (item_amount && item_amount >= amount_needed) {
        return null;
    } else {
        return {
            item: item,
            amount: amount_needed - item_amount,
        };
    };
};

/**
 *
 * @param {({ item: string, amount: number } | string)[] | ({ item: string, amount: number } | string)} item_datas
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function notEnoughItemEmbed(item_datas, interaction = null, client = global._client) {
    if (!Array.isArray(item_datas)) item_datas = [item_datas];
    if (!item_datas.length) throw new Error("item_datas is empty");

    const items_str = Array.isArray(item_datas) ?
        item_datas.map(item_data => {
            if (typeof item_data === "string") return item_data;
            if (typeof item_data !== "object") {
                logger.warn(`item_data應該是物件或字串，但：\n${JSON.stringify(item_data, null, 4)}`);
                return item_data;
            };

            const length = Object.keys(item_data).length;
            if (!item_data.hasOwnProperty("item") || !item_data.hasOwnProperty("amount") || length !== 2) {
                logger.warn(`item_data應該只有item和amount屬性，但：\n${JSON.stringify(item_data, null, 4)}`)
            };

            return `${get_name_of_id(item_data.item)} \`x${item_data.amount}\`個`;
        }).join("、")
        : item_datas;

    const emoji_cross = await get_emoji("crosS", client);
    const embed = new EmbedBuilder()
        .setTitle(`${emoji_cross} | 你沒有那麼多的物品`)
        .setColor(embed_error_color)
        .setDescription(`你缺少了 ${items_str}`)
        .setEmbedFooter(interaction);

    return embed;
};

/*
██████╗ ██████╗  ██████╗     ███████╗██╗   ██╗███╗   ██╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗███████╗
██╔══██╗██╔══██╗██╔════╝     ██╔════╝██║   ██║████╗  ██║██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║██╔════╝
██████╔╝██████╔╝██║  ███╗    █████╗  ██║   ██║██╔██╗ ██║██║        ██║   ██║██║   ██║██╔██╗ ██║███████╗
██╔══██╗██╔═══╝ ██║   ██║    ██╔══╝  ██║   ██║██║╚██╗██║██║        ██║   ██║██║   ██║██║╚██╗██║╚════██║
██║  ██║██║     ╚██████╔╝    ██║     ╚██████╔╝██║ ╚████║╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║███████║
╚═╝  ╚═╝╚═╝      ╚═════╝     ╚═╝      ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
*/

/**
 *
 * @param {any} obj
 * @param {any} [default_value=null]
 * @returns {any}
 */
function BetterEval(obj, default_value = null) {
    try {
        return Function(`"use strict";return ${obj}`)();
    } catch {
        return default_value;
    };
};

/**
 * Chunk an array
 * @param {Array<any>} array - the array to chunk
 * @param {number} chunkSize - the size of each chunk
 * @returns {Array<any>}
 */
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    };

    return chunks;
};

/**
 * 
 * @param {import("./config.js").RpgDatabase} rpg_data
 * @param {string} command
 * @param {string} userId
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<[EmbedBuilder | null, ActionRowBuilder<ButtonBuilder> | null]>}
 */
async function wrong_job_embed(rpg_data, command, userId, interaction = null, client = global._client) {
    const workJobShouldBe = workCmdJobs[command];

    if (workJobShouldBe?.length > 0) {
        if (rpg_data.job !== workJobShouldBe?.[0]) {
            const shouldBeJobName = workJobShouldBe?.[1]?.name;

            const emoji_cross = await get_emoji("crosS", client);
            const embed = new EmbedBuilder()
                .setColor(embed_error_color)
                .setTitle(`${emoji_cross} | 你的職業不是${shouldBeJobName}`)
                .setEmbedFooter(interaction);

            let row = null;

            if (!rpg_data.job) {
                embed.setTitle(`${emoji_cross} | 你沒有選擇職業`);

                const chooseJobButton = new ButtonBuilder()
                    .setCustomId(`job_menu|${userId}`)
                    .setLabel("選擇職業")
                    .setStyle(ButtonStyle.Primary);

                row =
                    /** @type {ActionRowBuilder<ButtonBuilder>} */
                    (new ActionRowBuilder()
                        .addComponents(chooseJobButton));
            };

            return [embed, row];
        };
    };

    return [null, null];
};

/**
 *
 * @param {string} name
 * @param {DogClient | null} [client]
 * @returns {Promise<ApplicationEmoji | null>}
 */
async function get_emoji_object(name, client = global._client) {
    if (!client) client = await wait_for_client();

    let emojis = client.application?.emojis.cache;
    let emoji = emojis?.find(e => e.name === name);

    if (!emoji) {
        emojis = await client.application?.emojis.fetch();
        emoji = emojis?.find(e => e.name === name);
    };

    return emoji || null;
};

/**
 *
 * @param {string[]} names
 * @param {DogClient | null} [client]
 * @returns {Promise<(ApplicationEmoji | null)[]>}
 */
async function get_emoji_objects(names, client = global._client) {
    if (!client) client = await wait_for_client();

    const emojis = await Promise.all(
        names.map(name => get_emoji_object(name, client)),
    );

    return emojis;
};

/**
 *
 * @param {string} name
 * @param {DogClient | null} [client]
 * @returns {Promise<string>}
 */
async function get_emoji(name, client = global._client) {
    if (!client) client = await wait_for_client();

    const emojiObject = await get_emoji_object(name, client);

    // if (!emoji) throw new Error(`找不到名為${name}的emoji`);
    if (!emojiObject) return "";
    const emoji = `<${emojiObject.animated ? "a" : ""}:${emojiObject.name}:${emojiObject.id}>`;
    return emoji;
};

/**
 *
 * @param {string[]} names
 * @param {DogClient | null} [client]
 * @returns {Promise<string[]>}
 */
async function get_emojis(names, client = global._client) {
    if (!client) client = await wait_for_client();

    const emojis = await Promise.all(
        names.map(name => get_emoji(name, client)),
    );

    return emojis;
};

/**
 * 
 * @param {number} remaining_time
 * @param {string} action
 * @param {number | string} count
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function get_cooldown_embed(remaining_time, action, count, interaction = null, client = global._client) {
    const { rpg_actions } = require("../cogs/rpg/msg_handler.js");

    const emoji = await get_emoji("crosS", client);

    const timestamp = Math.floor(Date.now() / 1000) + Math.floor(remaining_time / 1000);
    const time = `<t:${timestamp}:T> (<t:${timestamp}:R>)`;

    const [verb, noun] = rpg_actions[action];

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji} | 你過勞了！`)
        .setDescription(`你今天${verb}了 \`${count}\` 次${noun}，等待到 ${time} 可以繼續${verb}${noun}`)
        .setEmbedFooter(interaction);

    return embed;
};

/**
 * Get work cooldown time
 * @param {string} command_name
 * @param {import("./config.js").RpgDatabase} rpg_data
 * @returns {number}
 */
function get_cooldown_time(command_name, rpg_data) {
    const { rpg_cooldown } = require("../cogs/rpg/msg_handler.js");

    return BetterEval(rpg_cooldown[command_name].replace("{c}", String(rpg_data.count[command_name])));
};

/**
 * 檢查指令是否已經冷卻完畢
 * @param {string} command_name - 指令名稱
 * @param {import("./config.js").RpgDatabase} rpg_data - 用戶的RPG數據
 * @returns {{ is_finished: boolean, remaining_time: number, endsAtms: number, endsAts: number }} - is_finished:如果已冷卻完畢返回true，否則返回false - remaining_time: 剩餘時間
 */
function is_cooldown_finished(command_name, rpg_data) {
    const { rpg_cooldown } = require("../cogs/rpg/msg_handler.js");

    if (!rpg_cooldown[command_name]) return {
        is_finished: true,
        remaining_time: 0,
        endsAtms: 0,
        endsAts: 0,
    };

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

/**
 * 
 * @param {string} failed_reason
 * @param {import("./config.js").RpgDatabase} rpg_data
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder>}
 */
async function get_failed_embed(failed_reason, rpg_data, interaction = null, client = global._client) {
    let color = embed_error_color;

    let title = "失敗";
    let description = failed_reason;

    if (failed_reason === "boom") {
        const emoji_bomb = await get_emoji("bomb", client);

        title = `${emoji_bomb} | 蹦!`;
        description = `你以為挖到了鑽石，但其實是一顆從二戰就埋藏在那的炸彈！`;
    } else if (failed_reason === "mouse") {
        const emoji_wood = await get_emoji("wood", client);

        color = embed_fell_color;
        title = `${emoji_wood} | 山老鼠別跑`;
        description = `你來到了森林發現有山老鼠把木材都偷走了！`;
    } else if (failed_reason === "collapse") {
        const emoji_bomb = await get_emoji("bomb", client);

        title = `${emoji_bomb} | 快逃!!`;
        description = `你努力地在暗黑的礦洞中尋找鑽石，但是別的同伴亂挖導致礦洞坍塌了！`;
    } else if (failed_reason === "storm") {
        const emoji_fisher = await get_emoji("fisher", client);

        title = `${emoji_fisher} | 搖到快吐了`;
        description = `氣象明明說今天天氣很好怎麼會有暴風雨！`;
    } else if (failed_reason === "shark") {
        const emoji_fisher = await get_emoji("fisher", client);

        title = `${emoji_fisher} | a`;
        description = `欸不是鯊魚 快跑`;
    } else if (failed_reason === "acid_rain") {

    } else if (failed_reason === "escape") {
        const emoji_cow = await get_emoji("cow", client);

        title = `${emoji_cow} | 給我回來!`;
        description = `你放牧了一頭牛，結果一轉身他就不見了？！`;
    } else if (failed_reason === "epidemic") {
        const emoji_cow = await get_emoji("cow", client);

        title = `${emoji_cow} | 瘟疫在搞欸`;
        description = `很不幸的最近禽類都染上瘟疫，導致動物都死光了`;
    };

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setEmbedFooter(interaction, { text: "", rpg_data });

    return embed;
};

/**
 * 增加錢
 * @param {Object} options - 選項
 * @param {import("./config.js").RpgDatabase} options.rpg_data
 * @param {number} options.amount
 * @param {string} options.originalUser 來源用戶 (系統 或者 "<@id>")
 * @param {string} options.targetUser 目標用戶 (只能是 "<@id>")
 * @param {string} options.type 交易類型
 * @returns {number}
 */
function add_money({ rpg_data, amount, originalUser, targetUser, type }) {
    if (amount_limit(rpg_data.money) || amount_limit(rpg_data.money + amount) || amount_limit(amount)) throw new Error("金額超過上限");

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
 * @param {Object} options - 選項
 * @param {import("./config.js").RpgDatabase} options.rpg_data
 * @param {number} options.amount
 * @param {string} options.originalUser 來源用戶 (系統 或者 "<@id>")
 * @param {string} options.targetUser 目標用戶 (只能是 "<@id>")
 * @param {string} options.type 交易類型
 * @returns {number}
 */
function remove_money({ rpg_data, amount, originalUser, targetUser, type }) {
    if ((amount_limit(rpg_data.money) && amount_limit(rpg_data.money - amount)) || amount_limit(amount)) throw new Error("金額超過上限");

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

/**
 * Generate analyze template
 * @param {string} title
 * @param {string} description
 * @returns {{ title: string, description: string }}
 */
function generate_analyze_data(title, description) {
    return {
        title,
        description,
    };
};

/**
 * Analyze an error stack
 * @param {string} errorStack
 * @returns {{ title: string, description: string }[]}
 */
function error_analyze(errorStack) {
    const analyzes = [];

    if (errorStack.includes("is not a function")) {
        const title = "無效的函數";
        const description = "不好! 哈狗的代碼出錯了! (使用了錯誤的函數)";

        const data = generate_analyze_data(title, description);

        analyzes.push(data);
    };

    const match_read_prop = errorStack.match(/^TypeError: Cannot read properties of (\w+) \(reading ['"](\w+)['"]\)$/m);
    if (match_read_prop) {
        const object = match_read_prop[1];
        const property = match_read_prop[2];

        const title = "無效的屬性";
        const description = `${object} 沒有 ${property} 這個屬性餒 :(`;

        const data = generate_analyze_data(title, description);

        analyzes.push(data);
    };

    // Expected: expected.length <= 100
    const error_length_match = errorStack.match(/Expected: expected.length <= (\d+)/m);
    if (
        error_length_match
        && errorStack.includes("ExpectedConstraintError > s.string().lengthLessThanOrEqual()")
        && errorStack.includes("Invalid string length")
    ) {
        const length = error_length_match[1];

        const title = "糟糕! 你的輸入太長了!";
        const description = `discord限制代碼中的一些字元長度，不能超過 ${length} 字元`;

        const data = generate_analyze_data(title, description);

        analyzes.push(data);
    };

    // at async Object.execute (path/to/file.usuallyJs:Line:Column)
    // async may be missing
    for (const errorStackLine of errorStack.split("\n")) {
        const match_execute = errorStackLine.trim().match(/^at (?:async )?Object\.execute \((.+):(\d+):(\d+)\)$/);
        if (match_execute) {
            const file = match_execute[1].replace("/app/", ""); // 檔案路徑，並且移除 docker 路徑 /app/
            const line = match_execute[2]; // 行
            const column = match_execute[3]; // 列

            const title = "代碼錯誤";
            const description = `
從錯誤中看出，這是斜線指令的錯誤:
檔案: ${file}
行: ${line}
列: ${column}
`.trim();

            const data = generate_analyze_data(title, description);

            analyzes.push(data);
        };
    };

    // 如果沒有分析出來
    if (!analyzes.length) {
        const title = "未知的錯誤";
        const description = "未知的錯誤";

        const data = generate_analyze_data(title, description);

        analyzes.push(data);
    };

    return analyzes;
};

/**
 * 
 * @param {string | Error} text
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client=global._client]
 * @returns {Promise<EmbedBuilder[]>}
 */
async function get_loophole_embed(text, interaction = null, client = global._client) {
    const emoji_cross = await get_emoji("crosS", client);

    if (text instanceof Error) {
        text = util.inspect(text, { depth: null });
    };

    if (typeof text !== "string") {
        text = String(text);
    };

    text = escapeMarkdown(text, {
        codeBlockContent: false,
        codeBlock: true,
    });

    // embed 描述最長：4096 字元
    if (text.length > 4000) {
        text = text.slice(0, 4000) + "...";
    };

    text = `\`\`\`\n${text}\n\`\`\``;

    const embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle(`${emoji_cross} | 你戳到了一個漏洞！`)
        .setDescription(text)
        .setEmbedFooter(interaction);

    const error_analyze_embed = new EmbedBuilder()
        .setColor(embed_error_color)
        .setTitle("錯誤分析")
        .setEmbedFooter(interaction);

    const error_analyzes = error_analyze(text);
    for (const analyze of error_analyzes) {
        error_analyze_embed.addFields({
            name: analyze.title,
            value: analyze.description,
        });
    };

    return [embed, error_analyze_embed];
};

/**
 * 
 * @param {string} userId
 * @param {BaseInteraction | null} [interaction=null]
 * @param {DogClient | null} [client]
 * @returns {Promise<EmbedBuilder | null>}
 */
async function job_delay_embed(userId, interaction = null, client = global._client) {
    const rpg_data = await load_rpg_data(userId);
    const lastRunTimestamp = rpg_data.lastRunTimestamp ?? {};
    const setJobTime = convertToSecondTimestamp(lastRunTimestamp.job ?? 0);
    const waitUntil = setJobTime + setJobDelay;
    const now = DateNowSecond();

    if (waitUntil > now) {
        const emoji_cross = await get_emoji("crosS", client);
        const embed = new EmbedBuilder()
            .setColor(embed_error_color)
            .setTitle(`${emoji_cross} | 轉職後一個禮拜不能更動職業!`)
            .setDescription(`還需要等待到 <t:${waitUntil}:F>`)
            .setEmbedFooter(interaction);

        return embed;
    } else {
        return null;
    };
};

/**
 * Get the row of the "choose job"
 * @param {string} userid
 * @returns {Promise<[ActionRowBuilder<StringSelectMenuBuilder>, ActionRowBuilder<ButtonBuilder>]>}
 */
async function choose_job_row(userid) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`job_choose|${userid}`)
        .setPlaceholder("選擇職業")
        .addOptions(
            ...await Promise.all(
                Object.entries(jobs).map(async ([id, data]) => {
                    const emojiObject = await get_emoji_object(data.emoji || id);

                    return {
                        label: get_name_of_id(id),
                        description: data.desc,
                        value: id,
                        emoji: emojiObject ? {
                            id: emojiObject.id,
                            name: emojiObject.name,
                            animated: emojiObject.animated || false
                        } : "❓"
                    };
                }),
            ),
        );

    const cancel_button = new ButtonBuilder()
        .setCustomId(`cancel|${userid}`)
        .setLabel("取消")
        .setStyle(ButtonStyle.Danger);

    const row1 =
        /** @type {ActionRowBuilder<StringSelectMenuBuilder>} */
        (new ActionRowBuilder()
            .addComponents(selectMenu));

    const row2 =
        /** @type {ActionRowBuilder<ButtonBuilder>} */
        (new ActionRowBuilder()
            .addComponents(cancel_button));

    return [row1, row2];
};

/**
 * Checks if the given amount exceeds the maximum or minimum safe integer limit.
 * @param {number} amount
 * @returns {boolean}
 */
function amount_limit(amount) {
    return amount > Number.MAX_SAFE_INTEGER || amount < Number.MIN_SAFE_INTEGER;
};

/**
 * @overload
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} options.message
 * @param {import("./config.js").RpgDatabase} options.rpg_data
 * @param {1} options.mode
 * @param {boolean} [options.PASS=false]
 * @param {BaseInteraction | null} [options.interaction=null]
 * @returns {Promise<{ [k: string]: any }>}
 */
/**
 * @overload
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} options.message
 * @param {import("./config.js").RpgDatabase} options.rpg_data
 * @param {0 | 1} [options.mode=0]
 * @param {boolean} [options.PASS=false]
 * @param {BaseInteraction | null} [options.interaction=null]
 * @returns {Promise<Message | null>}
 */
/**
 * Handle &ls for open backpack interaction
 * @param {Object} options
 * @param {DogClient} options.client
 * @param {Message | import("../cogs/rpg/msg_handler.js").MockMessage} options.message
 * @param {import("./config.js").RpgDatabase} options.rpg_data
 * @param {0 | 1} [options.mode=0]
 * @param {boolean} [options.PASS=false]
 * @param {BaseInteraction | null} [options.interaction=null]
 */
async function ls_function({ client, message, rpg_data, mode = 0, PASS = false, interaction = null }) {
    if (!message.author) return mode === 0 ? null : {};

    if (!rpg_data.privacy.includes(PrivacySettings.Inventory) && !PASS) {
        if (!message.guild) throw new Error("Invalid Guild of the message");

        const [guildData, emoji_bag] = await Promise.all([
            loadData(message.guild?.id),
            get_emoji("bag", client),
        ]);

        const prefix = guildData?.prefix?.[0] ?? reserved_prefixes[0];


        let embed = new EmbedBuilder()
            .setTitle(`${emoji_bag} | 查看包包`)
            .setColor(embed_default_color)
            .setDescription(`為保護包包內容隱私權，戳這顆按鈕來看你的包包，隱私權設定可以透過 \`${prefix}privacy\` 指令更改`)
            .setEmbedFooter(interaction);

        const confirm_button = new ButtonBuilder()
            .setCustomId(`ls|${message.author.id}`)
            .setEmoji(emoji_bag)
            .setLabel("查看包包")
            .setStyle(ButtonStyle.Success);

        const row =
            /** @type {ActionRowBuilder<ButtonBuilder>} */
            (new ActionRowBuilder()
                .addComponents(confirm_button));

        if (mode === 1) return { embeds: [embed], components: [row] };
        return await message.reply({ embeds: [embed], components: [row] });
    };

    const [emoji_bag, ore_emoji, farmer_emoji, cow_emoji, swords_emoji, potion_emoji] = await get_emojis(["bag", "ore", "farmer", "cow", "swords", "potion"], client);

    // 分類物品
    /** @type {Object.<string, number>} */
    const ores = {};
    /** @type {Object.<string, number>} */
    const log_items = {};
    /** @type {Object.<string, number>} */
    const food_crops_items = {};
    /** @type {Object.<string, number>} */
    const food_meat_items = {}
    /** @type {Object.<string, number>} */
    const fish_items = {};
    /** @type {Object.<string, number>} */
    const weapons_armor_items = {};
    /** @type {Object.<string, number>} */
    const potions_items = {}
    /** @type {Object.<string, number>} */
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
        .setTitle(`${emoji_bag} | 你的背包`)
        .setTimestamp();

    // 使用循環添加各類物品欄位
    const categories = [
        { items: ores, name: `${ore_emoji} 礦物` },
        { items: log_items, name: "🪵 木材" },
        { items: food_crops_items, name: `${farmer_emoji} 農作物` },
        { items: food_meat_items, name: `${cow_emoji} 肉類` },
        { items: fish_items, name: `🐟 魚類` },
        { items: weapons_armor_items, name: `${swords_emoji} 武器 & 防具` },
        { items: potions_items, name: `${potion_emoji} 藥水` },
        { items: other_items, name: "📦 其他物品" }
    ];

    // 如果背包是空的
    if (Object.keys(rpg_data.inventory || {}).length === 0) {
        embed.setTitle(`${emoji_bag} | 你的背包裡沒有東西`);
    } else {
        for (const category of categories) {
            if (Object.keys(category.items).length > 0) {
                const itemsText = Object.entries(category.items)
                    .map(([item, amount]) => `${get_name_of_id(item)} \`x${amount.toLocaleString()}\``)
                    .join("\n");
                embed.addFields({ name: category.name, value: String(itemsText), inline: true });
            };
        };
    };

    if (mode === 1) return { embeds: [embed] };
    return await message.reply({ embeds: [embed] });
};

/**
 * Get the first prefix of a guild
 * @param {string} guildID
 * @returns {Promise<string>}
 */
async function firstPrefix(guildID) {
    const guildData = await loadData(guildID);

    const prefix = guildData?.prefix?.[0] ?? reserved_prefixes[0];

    return prefix;
};

/**
 * Check whether a prefix is included in the prefixes of the guild
 * @param {string} guildID
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function InPrefix(guildID, prefix) {
    const guildData = await loadData(guildID);

    const prefixes = (guildData.prefix ?? [])
        .concat(reserved_prefixes);

    return prefixes
        .map(p => {
            return prefix.includes(p)
                ? p
                : "";
        })
        .filter(Boolean);
};

/**
 * Check whether a string is starts with one of the prefixes of the guild
 * @param {string} guildID
 * @param {string} str
 * @returns {Promise<false | string>}
 */
async function startsWith_prefixes(guildID, str) {
    const guildData = await loadData(guildID);

    const prefixes = (guildData.prefix ?? [])
        .concat(reserved_prefixes);

    for (const p of prefixes) {
        if (str.startsWith(p)) {
            return p;
        };
    };

    return false;
};

/**
 * Get the translation of adventure job by its ID
 * @param {string} locale - the locale
 * @param {string} fj_id - ID of the fight job
 * @returns {string | undefined}
 */
function get_fightjob_name(locale, fj_id) {
    const key = "fightjob_name";

    return get_lang_data(locale, key, fj_id);
};

/**
 * Get the translation of a job by its ID
 * @param {string} locale - the locale
 * @param {string} job_id - ID of the job
 * @returns {string | undefined}
 */
function get_job_name(locale, job_id) {
    const key = "job_name";

    return get_lang_data(locale, key, job_id);
};

const oven_slots = 6;
const farm_slots = 4;
const smelter_slots = 6;

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
    smeltable_recipe,
    animals,
    animal_products,
    shop_lowest_price,
    brew,
    fish,
    wood_productions,
    weapons_armor,
    tags,
    bake,
    cook,
    sell_data,
    oven_slots,
    farm_slots,
    smelter_slots,
    check_item_data,
    get_name_of_id,
    get_id_of_name,
    get_number_of_items,
    userHaveNotEnoughItems,
    notEnoughItemEmbed,
    job_delay_embed,
    choose_job_row,
    get_emoji,
    get_emojis,
    get_emoji_object,
    get_emoji_objects,
    wrong_job_embed,
    BetterEval,
    chunkArray,
    get_cooldown_embed,
    get_cooldown_time,
    is_cooldown_finished,
    get_failed_embed,
    add_money,
    remove_money,
    get_loophole_embed,
    amount_limit,
    ls_function,
    firstPrefix,
    InPrefix,
    startsWith_prefixes,
    get_fightjob_name,
    get_job_name,
};
