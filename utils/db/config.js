export const TABLES = ["items", "inventory"];

/**
 * @type {{ [k in typeof TABLES[number]]: { CREATE?: string } }}
 */
export const TABLES_METADATA = {
    "items": {
        "CREATE":
            `
            CREATE TABLE item (
                item_id TEXT PRIMARY KEY,
                -- 限制只能有小寫字母和底線，且長度在 1 到 100 個字元之間
                CONSTRAINT chk_item_id_format
                    CHECK (item_id ~ '^[a-z_]+$' AND length(item_id) <= 100),

                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            `,
    },
    "inventory": {

    },
};
