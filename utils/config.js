const cwd = process.cwd;
const join = require("path").join;

const INDENT = 4;
const database_folder = `${cwd()}/db`

const BETA = false;
const DEFAULT_IP = "192.168.0.156"
const DEFAULT_PORT = 3003

const DATABASE_FILES = [
    "database.json",
    "rpg_database.json",
    "rpg_shop.json",
    "bake_db.json",
    "serverIP.json",
];

const DEFAULT_VALUES = {
    "user": {
        "rpg_database.json": {
            "money": 1000,
            "hungry": 20,
            "lastRunTimestamp": {},
            "inventory": {},
            "transactions": [],
            "count": {},
            "privacy": [],
        },
        "rpg_shop.json": {
            "status": false,
            "items": {},
        },
        "bake_db.json": [],
    },
    "single": {
        "serverIP.json": {
            IP: DEFAULT_IP,
            PORT: DEFAULT_PORT,
        },
    },
    "guild": {
        "database.json": {
            "rpg": false,
        },
    },
};

const onlineDB_Files = [
    "database.json",
    "rpg_database.json",
    "rpg_shop.json",
    "bake_db.json",
];

const database_file = join(database_folder, "database.json")
const rpg_database_file = join(database_folder, "rpg_database.json");
const rpg_shop_file = join(database_folder, "rpg_database.json");
const bake_data_file = join(database_folder, "./bake_db.json");
const serverIPFile = join(database_folder, "serverIP.json");

const cogsFolder = `${cwd()}/cogs`
const scheduleEverysec = `${cwd()}/schedule/everysec`
const scheduleEverymin = `${cwd()}/schedule/everymin`

const backend_channel_id = "1430868819206864978"
const log_channel_id = "1430868778433904691"
const warn_channel_id = "1430868778433904691"
const error_channel_id = "1430868778433904691"

const BotID = "1422212094274830470";
const BotName = "狗狗機器犬"; // 預設為 client.user.tag

const prefix = "&";

const enable_auto_register_cmd = true;
const auto_register_cmd_file = `${cwd()}/auto_register.cmd.data`;

const priorityUserIDs = ["898836485397180426", "1245902419750289538"];
const priorityGuildIDs = ["1422545977226690683", "1218367644307034112"];

/*
https://discord.js.org/docs/packages/discord.js/14.24.0/ColorResolvable:TypeAlias
- ColorResolvable -
1. 'Color'
2. 'Random'
3. readonly [red: number, green: number, blue: number]
4. number
5. HexColorString
*/
const embed_default_color = 0x00BBFF;
const embed_error_color = 0xF04A47;

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

const failed = [
    "boom",
    "collapse",
    "storm",
    "shark",
    // "acid_rain",
    "escape",
    "epidemic",
]

const probabilities = {
    "mine": {
        "boom": [2, 1, 1],
        "collapse": [3, 1, 1],
        "stone": [20, 1, 3],
        "coal": [40, 2, 3],
        "iron_ore": [30, 2, 3],
        "diamond_ore": [5, 1, 3],
    },
    "herd": {
        "escape": [2, 1, 1],
        "epidemic": [2, 1, 1],
        "a_chicken": [25, 1, 2],
        "pig": [20, 1, 1],
        "cow": [20, 1, 1],
        "a_duck": [20, 1, 1],
        "a_sheep": [15, 1, 1],
    },
    "farm": {
        // "acid_rain": [2, 1, 1],
        "wheat": [30, 1, 2],
        "carrot": [20, 2, 3],
        "potato": [15, 1, 2],
        "tomato": [10, 1, 1],
        "apple": [10, 1, 1],
        "corn": [10, 1, 2],
    },
    "fish": {
        "storm": [2, 1, 1],
        "shark": [3, 1, 1],
        "shrimp": [35, 1, 2],
        "salmon": [30, 1, 1],
        "tuna": [30, 1, 1],
    },
};

module.exports = {
    INDENT,
    database_folder,
    DATABASE_FILES,
    onlineDB_Files,
    database_file,
    rpg_database_file,
    rpg_shop_file,
    bake_data_file,
    serverIPFile,
    DEFAULT_VALUES,
    BETA,
    DEFAULT_IP,
    DEFAULT_PORT,
    cogsFolder,
    backend_channel_id,
    log_channel_id,
    warn_channel_id,
    error_channel_id,
    scheduleEverysec,
    scheduleEverymin,
    BotID,
    BotName,
    prefix,
    enable_auto_register_cmd,
    auto_register_cmd_file,
    embed_default_color,
    embed_error_color,
    priorityUserIDs,
    priorityGuildIDs,
    failed,
    probabilities,
};
