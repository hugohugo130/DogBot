const cwd = process.cwd;
const join = require("path").join;

const INDENT = 4;
const database_folder = `${cwd()}/db`

const BETA = false;
const DEFAULT_IP = "hugo.904037.xyz"
const DEFAULT_PORT = 3003

const DATABASE_FILES = [
    "database.json",
    "rpg_database.json",
    "rpg_shop.json",
    "serverIP.json",
];

const DEFAULT_VALUES = {
    "user": {
        "rpg_database.json": {
            "money": 1000,
            "hungry": 20,
            "lastRunTimestamp": 0,
            "inventory": {},
            "transactions": [],
            "count": {},
            "privacy": [],
        },
        "rpg_shop.json": {
            "status": false,
            "items": {},
        },
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
];

const database_file = join(database_folder, "database.json")
const rpg_database_file = join(database_folder, "rpg_database.json");
const rpg_shop_file = join(database_folder, "rpg_database.json");
const serverIPFile = join(database_folder, "serverIP.json");

const cogsFolder = `${cwd()}/cogs`
const scheduleEverysec = `${cwd()}/schedule/everysec`
const scheduleEverymin = `${cwd()}/schedule/everymin`

const log_channel_id = "1423292323827159040"
const warn_channel_id = "1423292323827159040"
const error_channel_id = "1423292323827159040"

const BotID = "1422212094274830470";
const BotName = "狗狗機器犬"; // 預設為 client.user.tag

const prefix = "!";

module.exports = {
    INDENT,
    database_folder,
    DATABASE_FILES,
    onlineDB_Files,
    database_file,
    rpg_database_file,
    rpg_shop_file,
    serverIPFile,
    DEFAULT_VALUES,
    BETA,
    DEFAULT_IP,
    DEFAULT_PORT,
    cogsFolder,
    log_channel_id,
    warn_channel_id,
    error_channel_id,
    scheduleEverysec,
    scheduleEverymin,
    BotID,
    BotName,
    prefix,
};