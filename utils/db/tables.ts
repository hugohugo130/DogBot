import {
    Pool,
} from "pg";
import {
    Collection,
} from "discord.js";

import {
    add_transaction,
} from "./rpg.ts";
import {
    get_id_of_name,
    get_name_of_id,
    type RPGPrivacy,
    type FoodKey,
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
import {
    item_exists,
} from "../../cogs/rpg/msg_handler.js";
import {
    TABLES,
} from "./config.ts";

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
    autoeat: boolean,
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
    privacy_key: RPGPrivacy,
    // primary key: (user_id, privacy_key)
});

export type RPGAutoEatSQLRow = (BaseData & {
    position: number,
    item_id: FoodKey,
    // primary key: (user_id, position)
    // unique: (user_id, item_id)
});

export type RPGPartnerSQLRow = ({
    boss_id: string,
    member_id: string,
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

        protected async poolWithUserID<T>(
            callback: (pool: Pool, userID: string) => PromiseLike<T>
        ): Promise<T> {
            const userID = this.getUserID();
            const pool = getPool();

            return await callback(pool, userID) as Awaited<ReturnType<typeof callback>>;
        };
    };
};

export type RPGPartnerReturnCode =
    | 1;

interface RPGPartnerReturnSuccess {
    ok: true;
    code?: undefined;
    ps?: undefined;
};
interface RPGPartnerReturnFailed {
    ok: false;
    code: RPGPartnerReturnCode;
    ps: string;
};

type RPGPartnerReturn =
    | RPGPartnerReturnSuccess
    | RPGPartnerReturnFailed;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T;
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
    autoeat: boolean = false;

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
                        married_with = $2::bigint,
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

    async set_autoeat(enabled: boolean) {
        await this._mutex.runExclusive(async () => {
            await this.poolWithUserID(async (pool, userID) => {
                await pool.query(`
                    UPDATE rpg_users
                    SET autoeat = $1::boolean
                    WHERE user_id = $2::bigint
                `,
                    [enabled, userID],
                );
            });

            this.autoeat = enabled;
        });
    }

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
            autoeat: this.autoeat,
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

export class RPGPartner {
    readonly #userId: string;
    #bossOf: Map<string, string> = new Map();          // memberId -> bossId
    #membersOf: Map<string, Set<string>> = new Map();  // bossId -> Set<memberId>
    #tableID = "rpg_partner" as const satisfies typeof TABLES[number];

    constructor(userId: string, rows?: readonly Pick<RPGPartnerSQLRow, "boss_id" | "member_id">[] | null) {
        this.#userId = userId;
        if (!rows) return;
        for (const { boss_id, member_id } of rows) {
            this.#link(boss_id, member_id);
        };
    };

    #link(bossId: string, memberId: string) {
        this.#bossOf.set(memberId, bossId);

        let set = this.#membersOf.get(bossId);
        if (!set) {
            set = new Set();
            this.#membersOf.set(bossId, set);
        };
        set.add(memberId);
    };

    #unlink(bossId: string, memberId: string) {
        this.#bossOf.delete(memberId);

        const set = this.#membersOf.get(bossId);
        if (!set) return;

        set.delete(memberId);
        if (set.size === 0) this.#membersOf.delete(bossId);
    };

    /** 邀請某人成為夥伴 */
    async addPartner(memberId: string): Promise<RPGPartnerReturn> {
        const bossId = this.#userId;

        // 1. 不能聘請自己
        if (bossId === memberId) throw new Error("不能成為自己的夥伴");

        // 2. 對方已經有老闆？
        const currentBossId = this.#bossOf.get(memberId);
        if (currentBossId) {
            return {
                ok: false,
                code: 1,
                ps: currentBossId,
            };
        };

        const pool = getPool();

        // 3. 保存到資料庫
        await pool.query(`
            INSERT INTO ${this.#tableID} (boss_id, member_id)
            VALUES ($1::bigint, $2::bigint)
            `,
            [bossId, memberId],
        );

        // 4. 建立關係
        this.#link(bossId, memberId);

        return { ok: true };
    };

    /** 解除夥伴關係（老闆和員工都能解除） */
    async removePartner(bossId: string, memberId: string) {
        if (this.#bossOf.get(memberId) !== bossId) {
            throw new Error(`member ${memberId} is not owned by boss ${bossId}`);
        };

        // 1. 保存到資料庫
        const pool = getPool();
        await pool.query(`
            DELETE FROM ${this.#tableID}
            WHERE boss_id = $1::bigint
                AND member_id = $2::bigint
            `,
            [bossId, memberId],
        );

        // 2. 解除關係
        this.#unlink(bossId, memberId);
    };

    hasRelationship(userId: string): boolean {
        return !!(
            this.getBoss() === userId ||
            this.getMembers().includes(userId)
        );
    };

    /** 查詢：這個人的老闆是誰 */
    getBoss() {
        return this.#bossOf.get(this.#userId) ?? null;
    };

    /** 查詢：這個老闆底下的所有夥伴 */
    getMembers() {
        return [...(this.#membersOf.get(this.#userId) ?? [])];
    };
};
