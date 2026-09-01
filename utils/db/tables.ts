import {
    Pool,
} from "pg";
import {
    Collection,
} from "discord.js";

import {
    add_transaction,
} from "./rpg.js";
import {
    get_id_of_name,
    get_name_of_id,
    type ItemKey,
} from "../rpg.ts";
import {
    max_hunger,
    type DailyInfo,
    type MarryInfo,
} from "../config.ts";
import {
    getPool,
} from "./db.js";
import type {
    JobNames,
    FightJobNames,
} from "../types.d.ts";
import {
    Mutex,
} from "./mutex.ts";
import { item_exists } from "../../cogs/rpg/msg_handler.js";

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

function assertValidAmount(amount: number): asserts amount is number {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new Error("Amount must be a positive safe integer");
    };
};

function assertValidHunger(hunger: number): asserts hunger is number {
    if (!Number.isInteger(hunger) || hunger < 0 || hunger > 20) {
        throw new Error("Hunger must be an integer between 0 and 20");
    };
};

function checkValidItemId(id: string): asserts id is ItemKey {
    const item_id = item_exists(id);
    if (!item_id) {
        throw new Error("unknown item id");
    };
};

function WithUserID<TBase extends Constructor>(Base: TBase) {
    return class extends Base {
        protected _userID: string | null = null;

        assertUserID(): asserts this is this & { _userID: string } {
            if (!this._userID) {
                throw new Error("User ID has not been set");
            };
        };

        setUserID(user_id: string) {
            this._userID = user_id;
        };

        protected getUserID(): string {
            this.assertUserID();
            return this._userID;
        };

        protected async poolWithUserID(callbackOrCommand: string): Promise<{ [k: string]: any }[]>
        protected async poolWithUserID<T>(callbackOrCommand: (pool: Pool, userID: string) => PromiseLike<T>): Promise<T>
        protected async poolWithUserID(callbackOrCommand: ((pool: Pool, userID: string) => PromiseLike<any>) | string): Promise<any | { [k: string]: any }[]> {
            const userID = this.getUserID();
            const pool = getPool();

            if (typeof callbackOrCommand === 'string') {
                const result = await pool.query(callbackOrCommand);
                return result.rows;
            } else {
                return await callbackOrCommand(pool, userID);
            };
        };
    };
};

type Constructor<T = {}> = new (...args: any[]) => T;
export type RPGUserData = Omit<RPGUsers, "user_id">;
export type RPGInventoryData = { [item_id: string]: number };
export type RPGCooldownsData = { [item_id: string]: Date };

class EmptyBase { };
class CollectionBase extends Collection<ItemKey, number> { }

const CollectionWithUserID = WithUserID(CollectionBase);
const UserDataBase = WithUserID(EmptyBase);

export class RPGData extends UserDataBase {
    private _mutex = new Mutex();
    money: number = 1000;
    hunger: number = 20;
    daily: Date | null = new Date(0);
    daily_times: number = 0;
    daily_msg: boolean = false;
    job: JobNames | null = null;
    fightjob: FightJobNames | null = null;
    badge: string | null = null;

    married: boolean = false;
    married_with: string | null = null;
    married_at: Date | null = null;

    constructor(data?: Partial<RPGUserData> | null, userid?: string | null) {
        super();

        if (data) Object.assign(this, structuredClone(data));
        if (userid) this._userID = userid;
    };

    concat(new_data: Partial<RPGUserData> | RPGData): RPGData {
        const data = new_data instanceof RPGData ? new_data.toJSON() : new_data;

        return new RPGData({ ...this.toJSON(), ...data }, this._userID);
    };

    async add_money({ amount, original_user, target_user, type, record_transaction = true }: { amount: number; original_user: string; target_user: string; type: string; record_transaction?: boolean }): Promise<number> {
        assertValidAmount(amount);

        return await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET money = money + $1::bigint
                    WHERE user_id = $2::bigint
                `,
                    [amount, userID],
                );
            });

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
        });
    };

    async remove_money({ amount, original_user, target_user, type, record_transaction = true }: { amount: number; original_user: string; target_user: string; type: string; record_transaction?: boolean }): Promise<number> {
        assertValidAmount(amount);

        return await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET money = money - $1::bigint
                    WHERE user_id = $2::bigint
                `,
                    [amount, userID],
                );
            });

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
        });
    };

    async set_money(money: number): Promise<void> {
        assertValidAmount(money);

        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET money = $1::bigint
                    WHERE user_id = $2::bigint
                `,
                    [money, userID],
                );
            });

            this.money = money;
        });
    };

    getMarryInfo(): MarryInfo {
        return {
            status: this.married,
            with: this.married_with,
            time: this.married_at?.getTime() ?? 0,
        };
    };

    async setMarryInfo(data: MarryInfo): Promise<void> {
        const { status: married, with: married_with, time: married_at_timestamp } = data;

        const married_at = married_at_timestamp ? new Date(married_at_timestamp) : null;
        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                UPDATE rpg_users
                SET married = $1::boolean,
                    married_with = $2::text,
                    married_at = $3::timestamptz
                WHERE user_id = $4::bigint
            `,
                    [married, married_with, married_at, userID],
                );
            });

            this.married = married;
            this.married_with = married_with;
            this.married_at = married_at;
        });
    };

    async resetMarryInfo(): Promise<void> {
        await this.setMarryInfo({
            status: false,
            with: null,
            time: null
        });
    };

    getDailyInfo(): DailyInfo {
        return {
            daily: this.daily,
            daily_times: this.daily_times,
            daily_msg: this.daily_msg,
        };
    };

    async setDailyInfo(data: DailyInfo): Promise<void> {
        const { daily, daily_times, daily_msg } = data;

        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET daily = $1::timestamptz,
                            daily_times = $2::smallint,
                            daily_msg = $3::boolean
                    WHERE user_id = $4::bigint
                `,
                    [daily, daily_times, daily_msg, userID],
                );
            });

            this.daily = daily;
            this.daily_times = daily_times;
            this.daily_msg = daily_msg;
        });
    };

    async resetDailyInfo(): Promise<void> {
        await this.setDailyInfo({
            daily: new Date(0),
            daily_times: 0,
            daily_msg: false,
        });
    };

    async set_hunger(hunger: number): Promise<void> {
        assertValidHunger(hunger);

        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET hunger = $1::smallint
                    WHERE user_id = $2::bigint
                `,
                    [hunger, userID],
                );
            });

            this.hunger = hunger;
        });
    };

    async add_hunger(amount: number): Promise<void> {
        const hunger = Math.min(this.hunger + amount, max_hunger);
        await this.set_hunger(hunger);
    };

    async subtract_hunger(amount: number): Promise<void> {
        const hunger = Math.max(this.hunger - amount, 0);
        await this.set_hunger(hunger);
    };

    async set_job(job: JobNames | null) {
        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET job = $1::text
                    WHERE user_id = $2::bigint
                `,
                    [job, userID],
                );
            });

            this.job = job;
        });
    };

    async set_fightjob(fightjob: FightJobNames | null) {
        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET fightjob = $1::text
                    WHERE user_id = $2::bigint
                `,
                    [fightjob, userID],
                );
            });

            this.fightjob = fightjob;
        });
    };

    async set_badge(badge: string | null) {
        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET badge = $1::text
                    WHERE user_id = $2::bigint
                `,
                    [badge, userID],
                );
            });

            this.badge = badge;
        });
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

export class RPGInventory extends CollectionWithUserID {
    private _mutex = new Mutex();

    constructor(data?: RPGInventoryData | RPGInventory | null, userid?: string) {
        super();

        if (data) {
            const _data = data instanceof RPGInventory
                ? data
                : Object.entries(data);

            for (const [key, value] of _data) {
                this.#add_item(key, value);
            };
        };
        if (userid) {
            this.setUserID(userid);
        };
    };

    #add_item(key: string, value: number) {
        if (!key || !value || !item_exists(key)) return;
        assertValidAmount(value);
        this.set(key, value);
    }

    async add_item(item: string, amount: number) {
        assertValidAmount(amount);

        checkValidItemId(item);
        const item_id = get_id_of_name(item);

        return await this._mutex.runExclusive(async () => {
            const result = await this.poolWithUserID(async (pool, userID) => {
                const res = await pool.query(`
                    INSERT INTO inventory (user_id, item_id, amount)
                    VALUES ($1::bigint, $2::text, $3::bigint)
                    ON CONFLICT (user_id, item_id)
                        DO UPDATE SET amount = inventory.amount + EXCLUDED.amount
                    RETURNING amount
                `,
                    [userID, item_id, amount],
                );
                return res.rows[0].amount;
            });

            this.set(item_id, result);
            return result;
        });
    };

    async subtract_item(item: string, amount: number) {
        assertValidAmount(amount);

        checkValidItemId(item);
        const item_id = get_id_of_name(item);

        return await this._mutex.runExclusive(async () => {
            const result = await this.poolWithUserID(async (pool, userID) => {
                const res = await pool.query(`
                    UPDATE inventory
                    SET amount = amount - $3
                    WHERE user_id = $1::bigint
                        AND item_id = $2::text
                        AND amount >= $3
                    RETURNING amount
                `,
                    [userID, item_id, amount],
                );

                if (res.rowCount === 0) {
                    throw new Error("Not enough item");
                };

                return res.rows[0].amount;
            });

            this.set(item_id, result);
            return result;
        });
    };

    async add_random_item({ item, amount }: { item: string, amount: number }) {
        await this.add_item(item, amount);
        return get_name_of_id(item);
    };

    async delete_item(item: string) {
        checkValidItemId(item);
        const item_id = get_id_of_name(item);

        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    DELETE FROM inventory
                    WHERE user_id = $1::bigint
                        AND item_id = $2::text
                `,
                    [userID, item_id],
                );
            });

            this.delete(item_id);
        });
    };

    toObject(): Record<string, number> {
        return Object.fromEntries(
            this
                .entries()
                .filter(([_, amount]) => !!amount),
        );
    };
};
