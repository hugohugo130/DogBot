import { importModules } from "../customs/custom_import.js";
import { connectPool } from "./db.js";

export async function update_items(cache = true) {
    const { name, tags } = await importModules("../rpg.js", cache);

    const currentIds = Object.keys(name)
        .filter(e => !(e in tags)); // 排除 tags

    const currentIdSet = new Set(currentIds);

    const client = await connectPool();
    try {
        await client.init("items");
        await client.begin();

        // 從資料庫抓取所有item_id
        const { rows: dbRows } = /** @type {{rows: {item_id: string}[]}} */ (await client.get(["item_id"]));

        const dbIds = dbRows.map(row => String(row.item_id));
        const dbIdSet = new Set(dbIds);

        // 3. 需要 INSERT 的：目前有 & 資料庫沒有
        const toInsert = currentIds.filter(id => !dbIdSet.has(id));
        if (toInsert.length > 0) {
            // 動態生成占位符
            /** @type {string[]} */
            const flatParams = [];
            const placeholders = toInsert.map((_, i) => {
                flatParams.push(toInsert[i]);
                return `($${i + 1})`;
            }).join(', ');

            await client.query(
                `INSERT INTO items (item_id) VALUES ${placeholders} ON CONFLICT (item_id) DO NOTHING`,
                flatParams
            );
        };

        // 4. 需要 DELETE 的：資料庫有 & 目前沒有
        const toDelete = dbIds.filter(id => !currentIdSet.has(id));
        if (toDelete.length > 0) {
            await client.query(
                'DELETE FROM items WHERE item_id = ANY($1::text[])',  // 使用 ::text[] 來取得 text 類型的 item_id
                [toDelete]
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
