import {
    Collection,
} from "discord.js";

import {
    add_transaction,
} from "./rpg.js";
import {
    get_id_of_name,
    get_name_of_id,
} from "../rpg.js";
import type {
    MarryInfo,
} from "../config.ts";

// #region [SQL returned data]

type BaseData = {
    user_id: string, // -> rpg_users
    // created_at: Date,
    // updated_at: Date,
};

export type ItemsSQLRow = {
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

export type RPGTransactionsSQLRow = ({
    // id: string,
    timestamp: Date,
    original_user: string,
    target_user: string,
    type: string,
    amount: string,
});

export type RPGCooldownsSQLRow = (BaseData & {
    cooldown_key: string,
    last_run_at: Date,
    // primary key: (user_id, cooldown_key)
});

export type RPGUserCountsSQLRow = (BaseData & {
    count_key: string,
    count_value: number,
    // primary key: (user_id, count_key)
});

export type RPGUserPrivacySQLRow = (BaseData & {
    privacy_key: string,
    // primary key: (user_id, privacy_key)
});

// #endregion [SQL returned data]

function assertValidAmount(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error("Amount must be a positive safe integer");
    };
};

export type RPGUserData = Omit<RPGUsers, "user_id">;
export type RPGInventoryData = { [item_id: string]: number };
export type RPGCooldownsData = { [item_id: string]: Date };

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

    concat(new_data: Partial<RPGUserData> | RPGData): RPGData {
        const data = new_data instanceof RPGData ? new_data.toJSON() : new_data;

        return new RPGData({ ...this.toJSON(), ...data });
    };

    async add_money({ amount, original_user, target_user, type, record_transaction = true }: { amount: number; original_user: string; target_user: string; type: string; record_transaction?: boolean }): Promise<number> {
        this.money += amount;

        if (record_transaction) {
            await add_transaction({
                timestamp: Math.floor(Date.now() / 1000),
                original_user,
                target_user,
                amount,
                type
            });
        };

        return this.money;
    };

    async remove_money({ amount, original_user, target_user, type, record_transaction = true }: { amount: number; original_user: string; target_user: string; type: string; record_transaction?: boolean }): Promise<number> {
        this.money -= amount;

        if (record_transaction) {
            await add_transaction({
                timestamp: Math.floor(Date.now() / 1000),
                original_user,
                target_user,
                amount,
                type
            });
        };

        return this.money;
    };

    getMarryInfo(): MarryInfo {
        return {
            status: this.married,
            with: this.married_with,
            time: this.married_at?.getTime() ?? 0,
        };
    };

    setMarryInfo(data: MarryInfo): void {
        const { status: married, with: married_with, time: married_at } = data;

        this.married = married;
        this.married_with = married_with;
        this.married_at = new Date(married_at);
    };

    resetMarryInfo(): void {
        this.married = false;
        this.married_with = null;
        this.married_at = null;
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

export class RPGInventory extends Collection<string, number> {
    constructor(data?: RPGInventoryData | RPGInventory | null) {
        super();

        if (data instanceof RPGInventory) {
            for (const [key, value] of data) {
                if (value === 0) continue;
                if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
                    throw new Error("Amount must be a positive safe integer");
                };
                this.set(key, value);
            };
        } else if (data) {
            for (const [key, value] of Object.entries(data)) {
                if (value === 0) continue;
                if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
                    throw new Error("Amount must be a positive safe integer");
                };
                this.set(key, value);
            };
        };
    };

    add_item(item: string, amount: number) {
        assertValidAmount(amount);

        const item_id = get_id_of_name(item);

        if (!get_name_of_id(item_id, null)) {
            throw new Error("Item not found");
        };

        if (amount < 0) {
            throw new Error("Amount must be non-negative");
        };

        const current = this.get(item_id) ?? 0;
        this.set(item_id, current + amount);
    };

    subtract_item(item: string, amount: number) {
        assertValidAmount(amount);

        const item_id = get_id_of_name(item);

        if (!get_name_of_id(item_id, null)) {
            throw new Error("Item not found");
        };

        const current = this.get(item_id) ?? 0;
        if (current < amount) {
            throw new Error("Not enough item");
        };

        const next = current - amount;

        if (next === 0) {
            this.delete(item_id);
        } else {
            this.set(item_id, next);
        };
    };

    add_random_item({ item, amount }: { item: string, amount: number }) {
        assertValidAmount(amount);

        const item_name = get_name_of_id(item, null);

        if (!item_name) {
            throw new Error(`Item not found: ${item_name}`);
        };

        this.add_item(item, amount);
        return item_name;
    };

    toObject(): Record<string, number> {
        return Object.fromEntries(this.entries());
    };
};

