const cwd = process.cwd;

const INDENT = 4;
const database_folder = `${cwd()}/db`

const DATABASE_FILES = {
    "database.json": {},
    "rpg_database.json": {},
    "rpg_shop.json": {},
};

const DEFAULT_VALUES = {
    "user": {
        "database.json": {},
        "rpg_database.json": {},
        "rpg_shop.json": {},
    },
};

const BETA = false;
const DEFAULT_IP = "hugo.904037.xyz"

const cogsFolder = `${cwd()}/cogs`
const scheduleEverysec = `${cwd()}/schedule/everysec`
const scheduleEverymin = `${cwd()}/schedule/everymin`

const log_channel_id = "1423292323827159040"
const warn_channel_id = "1423292323827159040"
const error_channel_id = "1423292323827159040"

const BotID = "1422212094274830470";

module.exports = {
    INDENT,
    database_folder,
    DATABASE_FILES,
    DEFAULT_VALUES,
    BETA,
    DEFAULT_IP,
    cogsFolder,
    log_channel_id,
    warn_channel_id,
    error_channel_id,
    scheduleEverysec,
    scheduleEverymin,
    BotID,
};