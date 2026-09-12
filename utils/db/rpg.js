import {
    get_logger,
} from "../logger.js";
import {
    connectPool,
    getPool,
} from "./db.js";
import {
    RPGData,
    RPGInventory,
} from "./tables.ts";

/** @import { TransactionsInfo } from '../config' */

// #region [rpg_users]

/**
 * @param {string} userid
 * @returns {Promise<RPGData>}
 */
export async function load_rpg_data(userid) {
    const table_name = /** @type {const} */ "rpg_users";

    const command = `
        SELECT *
        FROM ${table_name}
        WHERE user_id = $1
        LIMIT 1
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: (Omit<import("./tables").RPGUsersSQLRow, "user_id">)[] }} */ (await pool.query(
        command,
        [userid],
    ));

    if (!rows.length) {
        const rpg_data = new RPGData(null, userid);
        save_rpg_data(userid, rpg_data).catch((reason) => {
            const logger = get_logger();
            logger.error(`新建 ${userid} 的 RPG Data 時出現錯誤：\n${reason}`);
        });
        return rpg_data;
    };

    const rpgUserData = rows[0];

    return new RPGData({
        ...rpgUserData,
        money: Number(rpgUserData.money), // 把返回的 BigInt 轉換成 Number
    }, userid);
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
            married_at,
            autoeat
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
            $13::boolean,
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
            autoeat = EXCLUDED.autoeat,
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
        autoeat,
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
            autoeat,
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

    return new RPGInventory(data, userid);
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
 * @param {number} [amount]
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

// #region [rpg_auto_eat]

/**
 * 事務內版本：假設呼叫端已上 advisory lock，且處於 transaction 中。
 * @param {import("pg").PoolClient} client
 * @param {string} userid
 * @param {string} itemid
 * @returns {Promise<boolean>}
 */
async function _addAutoEatTx(client, userid, itemid) {
    const command = `
        INSERT INTO rpg_auto_eat (user_id, position, item_id)
        SELECT $1,
            COALESCE(MAX(position), 0) + 1,
            $2
        FROM rpg_auto_eat
        WHERE user_id = $1
            AND NOT EXISTS (
                SELECT 1 FROM rpg_auto_eat
                WHERE user_id = $1 AND item_id = $2
            )
        ON CONFLICT (user_id, item_id) DO NOTHING
        RETURNING position
    `;
    const { rowCount } = await client.query(command, [userid, itemid]);
    return (rowCount ?? 0) > 0;
};

/**
 * 事務內版本：假設呼叫端已上 advisory lock。
 * @param {import("pg").PoolClient} client
 * @param {string} userid
 * @param {string} itemid
 * @returns {Promise<boolean>}
 */
async function _removeAutoEatTx(client, userid, itemid) {
    const del = `
        DELETE FROM rpg_auto_eat
        WHERE user_id = $1 AND item_id = $2
        RETURNING position
    `;
    const { rows, rowCount } = await client.query(del, [userid, itemid]);
    if ((rowCount ?? 0) === 0) return false;

    const removedPosition = rows[0].position;

    await client.query(
        `
        UPDATE rpg_auto_eat
        SET position = position - 1
        WHERE user_id = $1 AND position > $2
        `,
        [userid, removedPosition],
    );

    return true;
};

/**
 * 將使用者的自動進食順序同步為 newOrder。
 *
 * - DB 有、newOrder 沒有 → 移除
 * - newOrder 有、DB 沒有 → 依 newOrder 順序追加到最後
 * - 已在 DB 且也在 newOrder → 原地保留（不重排，因為 add 只追加到最後）
 *
 * @param {string} userid
 * @param {import("../rpg").FoodKey[]} newOrder
 * @returns {Promise<{ added: import("../rpg").FoodKey[]; removed: import("../rpg").FoodKey[] }>}
 */
export async function syncAutoEatOrder(userid, newOrder) {
    // 1. 去重（避免 UNIQUE(user_id, item_id) 撞）
    //    Set 保序：以第一次出現為準
    const dedupedNew = [...new Set(newOrder)];

    const table_name = /** @type {const} */ "rpg_auto_eat";
    const client = await connectPool();

    await client.init(table_name);
    return await client.withTransaction(async () => {
        // 2. 上鎖：整個 sync 期間序列化同一 user 的 add/remove/reorder
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1)::int)",
            [userid],
        );

        // 3. 讀目前狀態
        const { rows } = await client.query(
            `
            SELECT item_id FROM rpg_auto_eat
            WHERE user_id = $1
            ORDER BY position ASC
            `,
            [userid],
        );
        const current = rows.map((r) => r.item_id);
        const currentSet = new Set(current);
        const newSet = new Set(dedupedNew);

        // 4. 計算 diff
        const toRemove = current.filter((id) => !newSet.has(id));
        const toAdd = dedupedNew.filter((id) => !currentSet.has(id));

        // 5. 先 remove
        for (const itemid of toRemove) {
            await _removeAutoEatTx(client, userid, itemid);
        };

        // 6. 再 add（依 newOrder 的相對順序追加到最後）
        for (const itemid of toAdd) {
            await _addAutoEatTx(client, userid, itemid);
        };

        return { added: toAdd, removed: toRemove };
    });
}

/**
 * @param {string} userid
 * @returns {Promise<import("../rpg").FoodKey[]>}
 */
export async function getAutoEatOrder(userid) {
    const table_name = /** @type {const} */ "rpg_auto_eat";

    const command = `
        SELECT item_id
        FROM ${table_name}
        WHERE user_id = $1
        ORDER BY position ASC
    `;

    const pool = getPool();
    const { rows } = /** @type {{ rows: { item_id: import("../rpg").FoodKey }[]} } */ (await pool.query(
        command,
        [userid],
    ));

    return rows.map((row) => row.item_id);
};

/**
 * @param {string} userid
 * @param {import("../rpg").FoodKey} itemid
 * @returns {Promise<boolean>}
 */
export async function hasAutoEat(userid, itemid) {
    const command = `
        SELECT 1
        FROM rpg_auto_eat
        WHERE user_id = $1 AND item_id = $2
        LIMIT 1
    `;

    const pool = getPool();
    const { rowCount } = await pool.query(
        command,
        [userid, itemid]
    );

    return !!rowCount;
};

/**
 * @param {string} userid
 * @param {import("../rpg").FoodKey} itemid
 * @returns {Promise<boolean>} Modified?
 */
export async function addAutoEat(userid, itemid) {
    const table_name = /** @type {const} */ "rpg_auto_eat";
    const client = await connectPool();

    await client.init(table_name);
    return await client.withTransaction(async () => {
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1)::int)",
            [userid],
        );
        return await _addAutoEatTx(client, userid, itemid);
    });
};

/**
 * @param {string} userid
 * @param {import("../rpg").FoodKey} itemid
 * @returns {Promise<boolean>} Modified?
 */
export async function removeAutoEat(userid, itemid) {
    const table_name = /** @type {const} */ "rpg_auto_eat";
    const client = await connectPool();

    await client.init(table_name);
    return await client.withTransaction(async () => {
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1)::int)",
            [userid],
        );
        return await _removeAutoEatTx(client, userid, itemid);
    });
};

/**
 * 將某個 item 移動到指定 position，其餘項目自動遞補/後移。
 *
 * - position 會被 clamp 到 [1, 目前總數]
 * - item 不存在 → 回傳 false
 * - 位置沒變 → 回傳 true（no-op）
 * - 其他正常情況 → 回傳 true
 *
 * @param {string} userid
 * @param {string} itemid
 * @param {number} position  目標位置（1-based）
 * @returns {Promise<boolean>} Modified?
 */
export async function reorderAutoEat(userid, itemid, position) {
    const table_name = /** @type {const} */ "rpg_auto_eat";
    const client = await connectPool();

    await client.init(table_name);
    return await client.withTransaction(async () => {
        // 1. 鎖該 user，序列化同一 user 的所有順序操作
        await client.query(
            "SELECT pg_advisory_xact_lock(hashtext($1)::int)",
            [userid],
        );

        // 2. 對這個 transaction 開啟 PK 延遲檢查
        //    這樣互推 position 的中間狀態撞 PK 也不會報錯
        await client.query("SET CONSTRAINTS rpg_auto_eat_pkey DEFERRED");

        // 3. 一次拿到目前所有 item 及數量
        const { rows } = await client.query(`
            SELECT item_id, position
            FROM rpg_auto_eat
            WHERE user_id = $1
            ORDER BY position ASC
            `,
            [userid],
        );

        const total = rows.length;
        if (total === 0) return false;

        const current = rows.find((r) => r.item_id === itemid);
        if (!current) return false;

        const oldPosition = current.position;

        // 4. clamp 目標位置到合法範圍
        const newPosition = Math.max(1, Math.min(position, total));

        // 5. 位置沒變 → 不用做任何事
        if (newPosition === oldPosition) return true;

        // 6. 把被擠開的區段整體平移
        if (newPosition < oldPosition) {
            // 往上移：newPosition .. oldPosition-1 全部 +1
            await client.query(`
                UPDATE rpg_auto_eat
                SET position = position + 1
                WHERE user_id = $1
                    AND position >= $2
                    AND position < $3
                `,
                [userid, newPosition, oldPosition],
            );
        } else {
            // 往下移：oldPosition+1 .. newPosition 全部 -1
            await client.query(`
                UPDATE rpg_auto_eat
                SET position = position - 1
                WHERE user_id = $1
                    AND position > $2
                    AND position <= $3`,
                [userid, oldPosition, newPosition],
            );
        }

        // 7. 把目標 item 放到新位置
        await client.query(`
            UPDATE rpg_auto_eat
            SET position = $3
            WHERE user_id = $1
                AND item_id = $2
            `,
            [userid, itemid, newPosition],
        );

        return true;
    });
};

/**
 * 整份覆寫自動進食順序
 * @param {string} userid
 * @param {import("../rpg").FoodKey[]} foodKeys 依序排列，index 0 = position 1
 * @returns {Promise<void>}
 */
export async function setAutoEatOrder(userid, foodKeys) {
    const table_name = /** @type {const} */ "rpg_auto_eat";

    // 應用層去重：保留第一次出現的位置（避免 (user_id, item_id) UNIQUE 衝突）
    const seen = new Set();
    const unique = [];
    for (const key of foodKeys) {
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(key);
    };

    const client = await connectPool();
    await client.init(table_name)
    try {
        await client.begin();

        await client.query(
            `DELETE FROM ${table_name} WHERE user_id = $1`,
            [userid],
        );

        if (unique.length) {
            await client.query(
                `
                INSERT INTO ${table_name} (user_id, item_id, position)
                SELECT $1, item_id, ord
                FROM unnest($2::text[]) WITH ORDINALITY AS t(item_id, ord)
                `,
                [userid, unique],
            );
        };

        await client.commit();
    } catch (err) {
        await client.rollback();
        throw err;
    } finally {
        client.release();
    };
};

// #endregion [rpg_auto_eat]
