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
};
