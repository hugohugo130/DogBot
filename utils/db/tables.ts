// #region [SQL returned data]

type BaseData = {
    user_id: string, // -> rpg_users
    // created_at: Date,
    // updated_at: Date,
};

export type Items = {
    item_id: string,
    created_at: Date
};

export type RPGUsersSQLRow = (BaseData & {
    money: string,  // BIGINT 在 pg 中回傳為 string
    hunger: number, // 0~20
    daily: Date | null,
    daily_times: number,
    daily_msg: boolean,
    job: string | null,
    fightjob: string | null,
    badge: string | null,
    married: boolean,
    married_with: string | null,
    married_at: Date | null,
});

export type RPGUsers = Omit<RPGUsersSQLRow, "money"> & {
    money: number;
};

export type InventorySQLRow = (BaseData & {
    item_id: string,
    amount: string,
    // primary key: (user_id, item_id)
});

export type Inventory = Omit<InventorySQLRow, "amount"> & {
    amount: number,
};

export type RPGTransactions = ({
    // id: string,
    timestamp: Date,
    original_user: string,
    target_user: string,
    type: string,
    amount: string,
});

export type RPGCooldowns = (BaseData & {
    cooldown_key: string,
    last_run_at: Date,
    // primary key: (user_id, cooldown_key)
});

export type RPGUserCounts = (BaseData & {
    count_key: string,
    count_value: number,
    // primary key: (user_id, count_key)
});

export type RPGUserPrivacy = (BaseData & {
    privacy_key: string,
    // primary key: (user_id, privacy_key)
});

// #endregion [SQL returned data]

export type RPGUserData = Omit<RPGUsers, "user_id">;

export class RPGData {
    money: number = 1000;
    hunger: number = 20;
    daily: Date | null = new Date(0);
    daily_times: number = 0;
    daily_msg: boolean = false;
    job: string | null = null;
    fightjob: string | null = null;
    badge: string | null = null;

    married: boolean = false;
    married_with: string | null = null;
    married_at: Date | null = null;

    constructor(data?: RPGUserData | null) {
        if (data) {
            Object.assign(this, structuredClone(data));
        };
    };

    static isRPGData(obj: any): obj is RPGData {
        return obj instanceof RPGData;
    };

    /**
     * Merge two objects
     */
    concat(new_data: Partial<RPGUserData> | RPGData): RPGData {
        const data = new_data instanceof RPGData ? new_data.toJSON() : new_data;

        return new RPGData({ ...this.toJSON(), ...data });
    };

    toJSON(): RPGUserData {
        return {
            money: this.money,
            hunger: this.hunger,
            daily: this.daily,
            daily_times: this.daily_times,
            daily_msg: this.daily_msg,
            job: this.job,
            fightjob: this.fightjob,
            badge: this.badge,
            married: this.married,
            married_with: this.married_with,
            married_at: this.married_at,
        };
    };
};
