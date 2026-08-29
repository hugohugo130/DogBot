import { connectPool, getPool } from "./db.js";
import { RPGData, RPGInventory } from "./tables.ts";

/** @import { TransactionsInfo } from '../config' */

// #region [rpg_users]

/**
 * @param {string} userid
 * @returns {Promise<RPGData>}
 */
export async function load_rpg_data(userid) {
    const table_name = /** @type {const} */ "rpg_users";

    const command = `
        SELECT money, hunger, daily, daily_times, daily_msg, job, fightjob, badge, married, married_with, married_at
        FROM ${table_name}
        WHERE user_id = $1
        LIMIT 1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: (Omit<import("./tables").RPGUsersSQLRow, "user_id">)[] }} */ (await pool.query(
        command,
        [userid],
    ));

    if (!rows.length) return new RPGData(null);

    const rpgUserData = rows[0];

    return new RPGData({
        ...rpgUserData,
        money: Number(rpgUserData.money), // 把返回的 BigInt 轉換成 Number
    });
};

/**
 * @param {string} userid
 * @param {RPGData} rpg_data
 * @returns {Promise<void>}
 */
export async function save_rpg_data(userid, rpg_data) {
    const table_name = /** @type {const} */ "rpg_users";

    const command = `
        INSERT INTO ${table_name} (
            user_id,
            money,
            hunger,
            daily,
            daily_times,
            daily_msg,
            job,
            fightjob,
            badge,
            married,
            married_with,
            married_at
        )
        VALUES (
            $1::bigint,
            $2::bigint,
            $3::smallint,
            $4::timestamptz,
            $5::smallint,
            $6::boolean,
            $7::text,
            $8::text,
            $9::text,
            $10::boolean,
            $11::bigint,
            $12::timestamptz
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            money = EXCLUDED.money,
            hunger = EXCLUDED.hunger,
            daily = EXCLUDED.daily,
            daily_times = EXCLUDED.daily_times,
            daily_msg = EXCLUDED.daily_msg,
            job = EXCLUDED.job,
            fightjob = EXCLUDED.fightjob,
            badge = EXCLUDED.badge,
            married = EXCLUDED.married,
            married_with = EXCLUDED.married_with,
            married_at = EXCLUDED.married_at
    `;

    const {
        money,
        hunger,
        daily,
        daily_times,
        daily_msg,
        job,
        fightjob,
        badge,
        married,
        married_with,
        married_at,
    } = rpg_data;

    const pool = getPool();
    await pool.query(
        command,
        [
            userid,
            money,
            hunger,
            daily,
            daily_times,
            daily_msg,
            job,
            fightjob,
            badge,
            married,
            married_with,
            married_at,
        ],
    );
};

// #endregion [rpg_users]

// #region [inventory]

/**
 * 從 SQL 資料庫中 讀取 RPG 揹包資料
 * @param {string} userid
 * @returns {Promise<RPGInventory>}
 */
export async function load_inventory(userid) {
    const table_name = /** @type {const} */ "inventory";

    const command = `
        SELECT item_id, amount
        FROM ${table_name}
        WHERE user_id = $1;
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: import("./tables").InventorySQLRow[] }} */ (await pool.query(
        command,
        [userid],
    ));

    const data = rows.reduce((acc, row) => {
        acc[row.item_id] = Number(row.amount); // 預設返回字符串
        return acc;
    }, /** @type {{ [k: string]: number }} */({}));

    return new RPGInventory(data);
};

/**
 * 保存 RPG 揹包資料 到 SQL 資料庫
 * @param {string} userid
 * @param {RPGInventory} inventory
 * @returns {Promise<void>}
 */
export async function save_inventory(userid, inventory) {
    const table_name = /** @type {const} */ "inventory";

    const command = `
        WITH deleted AS (
            DELETE FROM ${table_name}
            WHERE user_id = $1::bigint
                AND item_id != ALL($2::text[])
        )
        INSERT INTO ${table_name} (user_id, item_id, amount)
        SELECT $1::bigint, item_id, amount
        FROM UNNEST($2::text[], $3::bigint[]) AS t(item_id, amount)
        ON CONFLICT (user_id, item_id)
            DO UPDATE SET amount = EXCLUDED.amount
    `;

    const entries = inventory
        .entries()
        .toArray()
        .filter(([, amount]) => amount > 0); // 不保存數量為 0 的物品

    // 拆分成兩個平行陣列
    const item_ids = entries.map(([item_id, _]) => item_id);
    const amounts = entries.map(([_, amount]) => amount);

    const pool = getPool();
    await pool.query(
        command,
        [userid, item_ids, amounts],
    );
};

// #endregion [inventory]

// #region [rpg_transactions]

/**
 * 從 SQL 資料庫中 讀取 RPG 交易資料
 * @param {string} userid
 * @param {number} [amount=10]
 * @returns {Promise<TransactionsInfo[]>}
 */
export async function load_transactions(userid, amount = 10) {
    const table_name = /** @type {const} */ "rpg_transactions";

    const command = `
        SELECT created_at as "timestamp", original_user, target_user, type, amount
        FROM ${table_name}
        WHERE original_user = $1
            OR target_user = $1
            OR target_user = '<@' || $1 || '>'
            OR original_user = '<@' || $1 || '>'
        ORDER BY created_at DESC
        ${amount ? `LIMIT ${amount}` : ""}
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: import("./tables").RPGTransactionsSQLRow[] }} */ (await pool.query(
        command,
        [userid],
    ));

    return rows.map(row => ({
        ...row,
        timestamp: Math.floor(row.timestamp.getTime() / 1000),
        amount: Number(row.amount),
    }));
};

/**
 * 增加一筆 RPG 交易資料 到 SQL 資料庫
 * @param {TransactionsInfo} transaction
 * @returns {Promise<void>}
 */
export async function add_transaction(transaction) {
    const table_name = /** @type {const} */ "rpg_transactions";
    const { timestamp, original_user, target_user, type, amount } = transaction;

    const command = `
        INSERT INTO ${table_name} (created_at, original_user, target_user, type, amount)
        VALUES ($1, $2, $3, $4, $5::bigint)
    `;

    const timestamptz = new Date(timestamp * 1000);

    const pool = getPool();
    await pool.query(
        command,
        [
            timestamptz,
            original_user,
            target_user,
            type,
            amount,
        ],
    );
};

// #endregion [rpg_transactions]

// #region [rpg_cooldowns]

/**
 * 讀取某個冷卻 key 的最後執行時間
 * @param {string} userid
 * @param {string} cooldown_key
 * @returns {Promise<Date | null>}
 */
export async function load_cooldown(userid, cooldown_key) {
    const table_name = /** @type {const} */ "rpg_cooldowns";

    const command = `
        SELECT last_run_at
        FROM ${table_name}
        WHERE user_id = $1 AND cooldown_key = $2
        LIMIT 1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: import("./tables").RPGCooldownsSQLRow[]} } */ (await pool.query(
        command,
        [userid, cooldown_key],
    ));

    return rows.length ? rows[0].last_run_at : null;
};

/**
 * 讀取所有冷卻的數據
 * @param {string} userid
 * @returns {Promise<{ [cooldown_key: string]: Date }>}
 */
export async function get_cooldowns(userid) {
    const table_name = /** @type {const} */ "rpg_cooldowns";

    const command = `
        SELECT cooldown_key, last_run_at
        FROM ${table_name}
        WHERE user_id = $1
        LIMIT 1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: import("./tables").RPGCooldownsSQLRow[]} } */ (await pool.query(
        command,
        [userid],
    ));

    return rows.reduce((acc, cooldowns) => {
        acc[cooldowns.cooldown_key] = cooldowns.last_run_at;
        return acc;
    }, /** @type {{ [cooldown_key: string]: Date }} */({}))
};

/**
 * 更新某個冷卻 key 的最後執行時間
 * @param {string} userid
 * @param {string} cooldown_key
 * @param {Date} last_run_at
 * @returns {Promise<void>}
 */
export async function set_cooldown(userid, cooldown_key, last_run_at) {
    const table_name = /** @type {const} */ "rpg_cooldowns";

    const command = `
        INSERT INTO ${table_name} (user_id, cooldown_key, last_run_at)
        VALUES ($1::bigint, $2::text, $3::timestamptz)
        ON CONFLICT (user_id, cooldown_key)
        DO UPDATE SET last_run_at = EXCLUDED.last_run_at
    `;

    const pool = getPool();
    await pool.query(
        command,
        [userid, cooldown_key, last_run_at],
    );
};

// #endregion [rpg_cooldowns]

// #region [rpg_user_counts]

/**
 * @param {string} count_key
 * @param {string} userid
 * @returns {Promise<number | null>}
 */
export async function get_count(count_key, userid) {
    const table_name = /** @type {const} */ "rpg_user_counts";

    const command = `
        SELECT count_value
        FROM ${table_name}
        WHERE user_id = $1 AND count_key = $2
        LIMIT 1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: {count_value: number}[] }} */ (await pool.query(
        command,
        [userid, count_key],
    ));

    return rows[0]?.count_value ?? null;
};

/**
 * 設定某個key的計數
 * @param {string} userid
 * @param {string} count_key
 * @param {number} count
 */
export async function set_count(userid, count_key, count) {
    const table_name = /** @type {const} */ "rpg_user_counts";

    const command = `
        INSERT INTO ${table_name} (user_id, count_key, count_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, count_key)
        DO UPDATE SET
            count_value = EXCLUDED.count_value
    `;

    const pool = getPool();
    await pool.query(
        command,
        [userid, count_key, count],
    );
};

/**
 * 讀取使用者的所有計數
 * @param {string} userid
 * @returns {Promise<Record<string, number>>}
 */
export async function load_user_counts(userid) {
    const table_name = /** @type {const} */ "rpg_user_counts";

    const command = `
        SELECT count_key, count_value
        FROM ${table_name}
        WHERE user_id = $1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: import("./tables.ts").RPGUserCountsSQLRow[] }} */ (await pool.query(
        command,
        [userid],
    ));

    return rows.reduce((acc, row) => {
        acc[row.count_key] = Number(row.count_value);
        return acc;
    }, /** @type {Record<string, number>} */({}));
};

/**
 * 保存使用者的所有計數
 * @param {string} userid
 * @param {Record<string, number>} counts
 * @returns {Promise<void>}
 */
export async function save_user_counts(userid, counts) {
    const table_name = /** @type {const} */ "rpg_user_counts";

    const command = `
        WITH deleted AS (
            DELETE FROM ${table_name}
            WHERE user_id = $1::bigint
                AND count_key != ALL($2::text[])
        )
        INSERT INTO ${table_name} (user_id, count_key, count_value)
        SELECT $1::bigint, count_key, count_value::int
        FROM UNNEST($2::text[], $3::int[]) AS t(count_key, count_value)
        ON CONFLICT (user_id, count_key)
            DO UPDATE SETcount_value = EXCLUDED.count_value
    `;

    const entries = Object.entries(counts);

    const keys = entries.map(([key]) => key);
    const values = entries.map(([, value]) => value);

    const pool = getPool();
    await pool.query(
        command,
        [userid, keys, values],
    );
};

// #endregion [rpg_user_counts]

// #region [rpg_user_privacy]

/**
 * 讀取使用者的隱私設定
 * @param {string} userid
 * @returns {Promise<string[]>}
 */
export async function load_user_privacy(userid) {
    const table_name = /** @type {const} */ "rpg_user_privacy";

    const command = `
        SELECT privacy_key
        FROM ${table_name}
        WHERE user_id = $1
    `;

    const pool = getPool();
    const { rows } = await pool.query(
        command,
        [userid],
    );

    return rows.map(row => row.privacy_key);
};

/**
 * 保存使用者的隱私設定
 * @param {string} userid
 * @param {string[]} privacy
 * @returns {Promise<void>}
 */
export async function save_user_privacy(userid, privacy) {
    const table_name = /** @type {const} */ "rpg_user_privacy";

    const client = await connectPool();
    await client.begin();

    try {
        // 先清空該使用者的所有隱私設定
        await client.query(`
            DELETE FROM ${table_name}
            WHERE user_id = $1`,
            [userid],
        );

        if (privacy.length) {
            const command = `
                INSERT INTO ${table_name} (user_id, privacy_key)
                SELECT $1::bigint, privacy_key
                FROM UNNEST($2::text[]) AS t(privacy_key)
            `;

            await client.query(
                command,
                [userid, privacy],
            );
        };

        await client.commit();
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    };
};

/**
 * 刪除使用者的所有隱私設定
 * @param {string} userid
 * @returns {Promise<void>}
 */
export async function delete_user_privacy(userid) {
    const table_name = /** @type {const} */ "rpg_user_privacy";

    const command = `
        DELETE FROM ${table_name}
        WHERE user_id = $1
    `;

    const pool = getPool();
    await pool.query(
        command,
        [userid],
    );
};

// #endregion [rpg_user_privacy]
