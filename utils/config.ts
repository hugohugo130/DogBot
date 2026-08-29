import {
    VoiceChannel,
} from "discord.js";
import {
    join,
} from "path";

// functions for config
const cwd = process.cwd;
const isBeta = (global.isBeta ?? process.argv.slice(2).includes("--beta"));


// Database
const INDENT = 4;
const database_folder = `${cwd()}/db`;

// #region [interfaces]

export interface MarryInfo {
    status: boolean;
    with: string | null;
    time: number;
};

export interface TransactionsInfo {
    timestamp: number;
    original_user: string;
    target_user: string;
    type: string;
    amount: number;
};

export interface RpgShop {
    status: boolean;
    items: { [k: string]: any; };
};

export interface RpgFarm {
    exp: number;
    lvl: number;
    waterAt: number;
    farms: Array<any>;
};

export interface CountingData {
    current: number;
    highest: number;
    channelId: string | null;
    last_counter: string | null;
};

export interface GuildDatabase {
    rpg: boolean;
    counting: CountingData;
    dynamicVoice: string | null;
    voiceNotification: boolean;
    prefix: string[];
};

export interface DvoiceData {
    owner: string;
    channel: VoiceChannel;
};

export interface MusicTrackData {
    id: string;
    title: string;
    url: string | null;
    duration: number;
    thumbnail: string | null;
    author: string;
    source: string;
};

export interface MusicStatus {
    channelId: string | null;
    textChannelId: string | null;
    currentTrack: MusicTrackData | null;
    queue: MusicTrackData[];
    loopStatus: number;
    paused: boolean;
};

// #endregion [interfaces]

const DATABASE_FILES = [
    "database.json",
    "rpg_database.json",
    "rpg_shop.json",
    "bake_db.json",
    "smelt_db.json",
    "dvoice_db.json",
    "rpg_farm.json",
    "music.json",
];

const DEFAULT_VALUES: {
    "user": {
        "rpg_database.json": any;
        "rpg_shop.json": RpgShop;
        "rpg_farm.json": RpgFarm;
        "bake_db.json": Array<any>;
        "smelt_db.json": Array<any>;
        [k: string]: object | Array<any>;
    };
    "single": {
        "dvoice_db.json": [[string], DvoiceData][];
        [k: string]: object | Array<any>;
    };
    "guild": {
        "database.json": GuildDatabase;
        [k: string]: object | Array<any>;
    };
    [k: string]: { [k: string]: object | Array<any>; };
} = {
    "user": {
        "rpg_database.json": {
            "money": 1000,
            "hunger": 20,
            "daily": 0,
            "daily_times": 0,
            "daily_msg": false,
            "job": null,
            "fightjob": null,
            "badge": null,
            "marry": {
                "status": false,
                "with": null,
                "time": 0,
            },
            "lastRunTimestamp": {},
            "inventory": {},
            "transactions": [],
            "count": {},
            "privacy": [],
        },
        "rpg_shop.json": {
            "status": true,
            "items": {},
        },
        "rpg_farm.json": {
            "exp": 0,
            "lvl": 0,
            "waterAt": 0,
            "farms": [],
        },
        "bake_db.json": [],
        "smelt_db.json": [],
    },
    "single": {
        "music.json": {},
        "dvoice_db.json": [],
    },

    "guild": {
        "database.json": {
            "rpg": true,
            "counting": {
                "current": 0,
                "highest": 0,
                "channelId": null,
                "last_counter": null,
            },
            "dynamicVoice": null,
            "voiceNotification": false,
            "prefix": ["&"],
        },
    },
};

const priorityUserIDs = ["898836485397180426", "1245902419750289538"];
const priorityGuildIDs = ["1422545977226690683", "1218367644307034112"];

// Folders & Files
const cogsFolder = `${cwd()}/cogs`;
const musicFileFolder = `${cwd()}/music`;
const scheduleEverysec = `${cwd()}/schedule/everysec`;
const scheduleEverymin = `${cwd()}/schedule/everymin`;
const scheduleEvery5min = `${cwd()}/schedule/every5min`;
const temp_folder = join(cwd(), "temp");

const database_file = join(database_folder, "database.json");
const rpg_database_file = join(database_folder, "rpg_database.json");
const rpg_shop_file = join(database_folder, "rpg_shop.json");
const rpg_farm_file = join(database_folder, "rpg_farm.json");
const bake_data_file = join(database_folder, "bake_db.json");
const smelt_data_file = join(database_folder, "smelt_db.json");
const dvoice_data_file = join(database_folder, "dvoice_db.json");
const music_status_file = join(database_folder, "music.json")
const auto_register_cmd_file = `${cwd()}/auto_register.cmd.data`;

// Logger
const backend_channel_id = "1430868819206864978";
const log_channel_id = "1430868778433904691";
const warn_channel_id = "1430868778433904691";
const error_channel_id = "1430868778433904691";
const dc_send_ignore_keywords = ["GuildMembersTimeout", "Missing Access", "Missing Permissions", "Unknown interaction"];
const console_ignore_keywords = ["GuildMembersTimeout"];

// Bot info
const BotID = !isBeta
    ? "1422212094274830470" // 狗狗機器犬
    : "1509140015534309386"; // 孵化中的幼犬

const BotName = "狗狗機器犬"; // 預設為 client.user.tag
const authorName = "哈狗";
const ownerID = "898836485397180426";
const adminIDs = [ownerID];

// RPG
const rpg_lvlUp_per = 50;
const setJobDelay = 604800 // 24 * 24 * 60 * 7 = 604800
const max_hunger = 20;
const default_prefix = "&";

const cannot_sell: string[] = [];

// counting
const counting_warning_cooldown = 3000; // ms

// #region [music]

// require(utils/music/musicsearchengine)
const musicSearchEngine = ["soundcloud"];

// 限制最多只能有 {musicPlayingPlayerLimit} 個正在播放的音樂播放器 (player)
const musicPlayingPlayerLimit = 50;

// #endregion

// link
const DOCS = "無";
const INVITE_LINK = "https://discord.gg/BfAbBSyUzf";
const STATUS_PAGE = "https://hugostatus.904037.xyz";

// cook
const cookBurntOverTime = 15000 // ms
const cookBurntWeight = 0.25 // 25%
const cookClickAmount = 10 // 10次

// misc
const daily_sign_guildIDs = ["1422545977226690683"];
const reserved_prefixes = [`<@${BotID}>`];
const enable_auto_register_cmd = true;

/*
type ColorResolvable =
  | keyof typeof Colors
  | 'Random'
  | readonly [red: number, green: number, blue: number]
  | number
  | HexColorString;
*/

// Embed colors
const embed_default_color: import("discord.js").ColorResolvable = "Random";
const embed_warn_color = 0xF0B90B;
const embed_error_color = 0xF04A47;
const embed_fell_color = 0x966e33;
const embed_job_color = 0x3498db;
const embed_sign_color = 0x3498db;
const embed_marry_color = 0x6bce99;

// Container colors
// No "random"
const container_default_color = Math.floor(Math.random() * 0xFFFFFF); // Random

// RPG
const failed = [
    "boom",
    "mouse",
    "collapse",
    "storm",
    "shark",
    // "acid_rain",
    "escape",
    "epidemic",
];

/**
 * Probabilities

 * the first number is weight

 * the second number is minimum gain amount

 * the third number is maximum gain amount
 */
const probabilities: { [k: string]: { [k: string]: [number, number, number]; }; } = {
    "farm": {
        // "acid_rain": [2, 1, 1],
        "wheat": [30, 1, 2],
        "carrot": [20, 2, 3],
        "raw_potato": [15, 1, 2],
        "tomato": [10, 1, 1],
        "apple": [10, 1, 1],
        "corn": [10, 1, 2],
    },
    "fish": {
        "storm": [2, 1, 1],
        "shark": [3, 1, 1],
        "raw_shrimp": [35, 1, 2],
        "raw_salmon": [30, 1, 1],
        "raw_tuna": [30, 1, 1],
        "raw_anglerfish": [15, 1, 2],
        "raw_catfish": [15, 1, 2],
        "raw_clownfish": [15, 1, 2],
        "raw_cod": [15, 1, 2],
        "raw_crab": [15, 1, 2],
        "raw_eel": [15, 1, 2],
        "raw_goldfish": [15, 1, 2],
        "raw_jellyfish": [15, 1, 2],
        "raw_koi": [15, 1, 2],
        "raw_lobster": [15, 1, 2],
        "raw_octopus": [15, 1, 2],
        "raw_pufferfish": [15, 1, 2],
        "raw_squid": [15, 1, 2],
        "raw_swordfish": [15, 1, 2],
        "raw_tropical_fish": [15, 1, 2],
        "raw_whale": [15, 1, 2],
    },
    "herd": {
        "escape": [1.68, 1, 1],
        "epidemic": [1.68, 1, 1],
        "a_chicken": [20.99, 1, 2],
        "pig": [16.79, 1, 1],
        "cow": [16.79, 1, 1],
        "a_duck": [16.79, 1, 1],
        "a_sheep": [12.60, 1, 1],
        "a_hugo": [12.60, 1, 1],
        "a_dog": [0.08, 1, 1]
    },
    "mine": {
        "boom": [2, 1, 1],
        "collapse": [3, 1, 1],
        "stone": [15, 1, 3],
        "coal": [50, 2, 3],
        "iron_ore": [30, 2, 3],
        "diamond_ore": [8, 1, 3],
        "emerald_ore": [1, 1, 3],
        "gold_ore": [3, 1, 3],
        "ruby_ore": [5, 1, 3],
        "sapphire_ore": [6, 1, 3],
    },
    "fell": {
        "mouse": [10, 1, 1],
        "acacia_wood": [8, 1, 1],
        "birch_wood": [8, 1, 1],
        "crimson_wood": [8, 1, 1],
        "dark_oak_wood": [9, 1, 1],
        "god_wood": [3, 1, 1],
        "ha_wood": [9, 1, 1],
        "jungle_wood": [9, 1, 1],
        "oak_wood": [9, 1, 1],
        "spruce_wood": [9, 1, 1],
        "warped_wood": [9, 1, 1]
    },
    "brew": {
        "cough_potion": [8, 1, 1],
        "dizzy_potion": [8, 1, 1],
        "eye_potion": [8, 1, 1],
        "floating_potion": [8, 1, 1],
        "gold_potion": [8, 1, 1],
        "ha_potion": [8, 1, 1],
        "hair_growth_potion": [8, 1, 1],
        "invisibility_potion": [8, 1, 1],
        "jump_potion": [8, 1, 1],
        "lucky_potion": [8, 1, 1],
        "mystery_potion": [8, 1, 1],
        "nausea_potion": [8, 1, 1],
        "poison_potion": [8, 1, 1],
        "regen_potion": [8, 1, 1],
        "revive_potion": [8, 1, 1],
        "unlucky_potion": [8, 1, 1],
    },
};


// #region [job descriptions]

/*
農夫 和漁夫是差不多辛勤的職業，不過在這個世界，農夫的收益比漁夫還要高
使用 /farm 指令種田

獲得    機率    數量    飽食度
酸雨    2%    -    -
小麥    30%    1~2            麵包 x1 (2)
胡蘿蔔    20%    2~3    1
馬鈴薯    15%      1~2               1
番茄    10%            1                   1
蘋果    10%            1                   1
玉米    10%            1~2                 1
*/
/*


漁夫 是個需要勞力的職業，你必須要努力勤奮的抓魚，才會獲得收益
使用 &fish 指令捕魚

獲得         機率         數量          飽食度
暴風雨            2%                -                   -
釣到鯊魚    3%                -              -
生蝦            35%       1~2            1
生鮭魚            30%       1                    1
生鮪魚            30%       1                     1
*/
/*


廚師 跟農夫以及漁夫購買食材，再透過烘烤食物並轉賣來獲得收益
廚師可以透過 /bake 指令來烤生的食物，並且轉賣出去，

每次燒烤 2 個食物會花費 1 個煤炭。
*/
/*

礦工 在深不見底的洞窟裡挖礦，雖然可能沒有很好的收穫，不過有機會也可以挖到鑽石等好東西
使用 &mine 指令挖礦

獲得    機率    數量
炸彈    2%              -
坍塌    3%              -
石頭    20%    1~3
煤炭    40%    2~3
鐵            30%    2~3
鑽石    5%       1~3
*/
/*

牧農 飼養各類的禽類豬雞牛等還獲得肉類
使用 &herd 指令飼養禽類

獲得    機率    數量
跑掉了    2%               -
瘟疫    3%               -
雞肉    30%    1~2
豬肉    25%    1
牛肉    20%    1
鴨肉    20%    1
*/

// #endregion


const jobs: { [k in import("./types").JobNames]: { command: string[]; emoji: string; desc: string; name: string; }; } = {
    "fisher": { // fisher 漁夫
        "command": ["fish"],
        "emoji": "fisher",
        "desc": "是個需要勞力的職業，你必須要努力勤奮的抓魚，才會獲得收益",
        "name": "漁夫",
    },
    "pharmacist": { // pharmacist 藥劑師
        "command": ["brew"],
        "emoji": "potion",
        "desc": "這個世界神秘力量的來源，製作藥水以及科學實驗來幫助成長",
        "name": "藥劑師",
    },
    "farmer": { // farmer 農夫
        "command": ["/farm"],
        "emoji": "farmer",
        "desc": "和漁夫是差不多辛勤的職業，只是會遇到颱風之類的災難",
        "name": "農夫",
    },
    "cook": { // cook 廚師
        "command": ["/bake", "/cook"],
        "emoji": "cook",
        "desc": "需購買食材，烘烤食物並轉賣來獲得收益 (新手不建議)",
        "name": "廚師",
    },
    "miner": { // miner 礦工
        "command": ["mine"],
        "emoji": "ore",
        "desc": "這個世界各類金屬的來源，挖取原礦並轉賣給鐵匠",
        "name": "礦工",
    },
    "herder": { // herder 牧農
        "command": ["herd"],
        "emoji": "cow",
        "desc": "肉類的來源，養殖各類動物",
        "name": "牧農",
    },
    "blacksmith": { // blacksmith 鐵匠
        "command": ["/smelt"],
        "emoji": "anvil",
        "desc": "熔煉各類原礦轉換成有價值的礦物 (新手不建議)",
        "name": "鐵匠",
    },
    "lumberjack": { // lumberjack 伐木工
        "command": ["fell"],
        "emoji": "wood",
        "desc": "在森林中砍伐木頭，是木頭的來源",
        "name": "伐木工",
    },
};

const fightjobs: { [k: string]: { emoji: string; HP: number; ATK: number; name: string; }; } = {
    "soldier": { // 戰士
        "emoji": "soldier",
        "HP": 135,
        "ATK": 15,
        "name": "戰士",
    },
    "magician": { // 戰士
        "emoji": "mage",
        "HP": 100,
        "ATK": 10,
        "name": "魔法師",
    },
    "ninja": { // 刺客
        "emoji": "ninja",
        "HP": 85,
        "ATK": 20,
        "name": "刺客",
    },
    "tank": { // 坦克
        "emoji": "shield",
        "HP": 175,
        "ATK": 7,
        "name": "坦克",
    },
};

const workCmdJobs: { [k: string]: [string, { command: string[]; emoji: string; desc: string; name: string; }]; } = Object.fromEntries(
    Object.entries(jobs)
        .filter(([_, value]) => value.command?.length)
        .flatMap(([key, value]) => value.command.map(cmd => [cmd, [key, value]]))
);

const PrivacySettings = Object.freeze({
    Inventory: "backpack",
    Money: "money",
    Partner: "partner",
});

export {
    INDENT,
    database_folder,

    DATABASE_FILES,
    DEFAULT_VALUES,

    priorityUserIDs,
    priorityGuildIDs,

    database_file,
    rpg_database_file,
    rpg_shop_file,
    rpg_farm_file,
    bake_data_file,
    smelt_data_file,
    dvoice_data_file,
    music_status_file,

    cogsFolder,
    musicFileFolder,
    scheduleEverysec,
    scheduleEverymin,
    scheduleEvery5min,

    backend_channel_id,
    log_channel_id,
    warn_channel_id,
    error_channel_id,
    dc_send_ignore_keywords,
    console_ignore_keywords,

    BotID,
    BotName,
    authorName,
    ownerID,
    adminIDs,

    enable_auto_register_cmd,
    auto_register_cmd_file,

    rpg_lvlUp_per,
    setJobDelay,
    max_hunger,
    default_prefix,
    cannot_sell,

    // counting
    counting_warning_cooldown,

    // music
    musicSearchEngine,
    musicPlayingPlayerLimit,

    DOCS,
    INVITE_LINK,
    STATUS_PAGE,

    cookBurntOverTime,
    cookBurntWeight,
    cookClickAmount,

    daily_sign_guildIDs,
    reserved_prefixes,
    temp_folder,

    embed_default_color,
    embed_warn_color,
    embed_error_color,
    embed_fell_color,
    embed_job_color,
    embed_sign_color,
    embed_marry_color,

    container_default_color,

    failed,
    probabilities,
    jobs,
    fightjobs,
    workCmdJobs,
    PrivacySettings,
};
