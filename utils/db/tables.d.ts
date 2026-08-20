type BaseData = {
    user_id: string, // -> rpg_users
    created_at: Date,
    updated_at: Date,
};

export type Items = {
    item_id: string,
    created_at: Date
}[];

export type RPGUsers = (BaseData & {
    user_id: string,
    money: string,
    hunger: number, // 0~20
    daily: Date,
    daily_times: number,
    daily_msg: boolean,
    job: string,
    fightjob: string,
    badge: string,
    married: boolean,
    married_with: string,
    married_at: Date,
})[];

export type Inventory = (BaseData & {
    item_id: string,
    amount: string,
    // primary key: (user_id, item_id)
})[];

export type RPGTransactions = ({
    id: string,
    timestamp: Date,
    original_user: string,
    target_user: string,
    type: string,
    amount: string,
})[];

export type RPGCooldowns = (BaseData & {
    cooldown_key: string,
    last_run_at: Date,
    // primary key: (user_id, cooldown_key)
})[];

export type RPGUserCounts = (BaseData & {
    count_key: string,
    count_value: number,
    // primary key: (user_id, count_key)
})[];

export type RPGUserPrivacy = (BaseData & {
    privacy_key: string,
    // primary key: (user_id, privacy_key)
})[];
