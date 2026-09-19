export const TABLES = [
    "items",
    "rpg_users",
    "inventory",
    "rpg_transactions",
    "rpg_cooldowns",
    "rpg_user_counts",
    "rpg_user_privacy",
    "rpg_auto_eat",
    "rpg_partner",
] as const;

export const TABLES_METADATA: Record<typeof TABLES[number], { CREATE?: string; }> = {
    "items": {
        "CREATE":
            `
            CREATE TABLE items (
                item_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now(),

                CONSTRAINT item_pkey primary key (item_id),
                -- 限制只能有小寫字母和底線，且長度在 1 到 100 個字元之間
                CONSTRAINT chk_item_id_format
                    CHECK (item_id ~ '^[a-z_]+$' AND length(item_id) <= 100)
            );
            `,
    },
    "rpg_users": {
        "CREATE": `
            CREATE TABLE rpg_users (
                user_id BIGINT NOT NULL,
                money BIGINT NOT NULL DEFAULT 1000,
                hunger SMALLINT NOT NULL DEFAULT 20,
                daily TIMESTAMPTZ NULL DEFAULT to_timestamp(0),
                daily_times SMALLINT NOT NULL DEFAULT 0,
                daily_msg BOOLEAN NOT NULL DEFAULT false,
                job TEXT NULL,
                fightjob TEXT NULL,
                badge TEXT NULL,
                married BOOLEAN NOT NULL DEFAULT false,
                married_with BIGINT NULL,
                married_at TIMESTAMPTZ NULL,
                autoeat BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                CONSTRAINT rpg_users_pkey PRIMARY KEY (user_id),
                CONSTRAINT chk_hunger_range CHECK (hunger BETWEEN 0 AND 20),
                CONSTRAINT chk_marriage_consistency CHECK (
                    (married = false AND married_with IS NULL AND married_at IS NULL)
                    OR
                    (married = true AND married_with IS NOT NULL AND married_at IS NOT NULL)
                ),
                CONSTRAINT rpg_users_married_with_fkey FOREIGN KEY (married_with)
                    REFERENCES rpg_users (user_id) ON DELETE SET NULL
            );
        `,
    },
    "inventory": {
        "CREATE":
            `
            CREATE TABLE inventory (
                user_id BIGINT NOT NULL,
                item_id TEXT NOT NULL,
                amount BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                CONSTRAINT inventory_pkey primary key (user_id, item_id),
                CONSTRAINT inventory_user_id_fkey foreign key (user_id)
                    REFERENCES rpg_users(user_id),
                CONSTRAINT inventory_item_id_fkey foreign KEY (item_id)
                    REFERENCES items (item_id) ON DELETE CASCADE
            );
            `,
    },
    "rpg_transactions": {
        "CREATE":
            `
            CREATE TABLE rpg_transactions (
                id BIGSERIAL PRIMARY KEY,
                created_at TIMESTAMPTZ NOT NULL,
                original_user TEXT NOT NULL,
                target_user TEXT NOT NULL,
                type TEXT NOT NULL,
                amount BIGINT NOT NULL
            );

            -- 建立索引以優化常見的查詢情境
            CREATE INDEX idx_transactions_users ON rpg_transactions (original_user, target_user);
            CREATE INDEX idx_transactions_timestamp ON rpg_transactions (created_at DESC);
            `,
    },
    "rpg_cooldowns": {
        "CREATE": `
            CREATE TABLE rpg_cooldowns (
                user_id BIGINT NOT NULL,
                cooldown_key TEXT NOT NULL,
                last_run_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                CONSTRAINT rpg_cooldowns_pkey PRIMARY KEY (user_id, cooldown_key),
                CONSTRAINT rpg_cooldowns_user_id_fkey FOREIGN KEY (user_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE
            );
        `,
    },
    "rpg_user_counts": {
        "CREATE": `
            CREATE TABLE rpg_user_counts (
                user_id BIGINT NOT NULL,
                count_key TEXT NOT NULL,
                count_value INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                CONSTRAINT rpg_user_counts_pkey PRIMARY KEY (user_id, count_key),
                CONSTRAINT rpg_user_counts_user_id_fkey FOREIGN KEY (user_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE,
                CONSTRAINT chk_count_value_nonnegative CHECK (count_value >= 0)
            );
        `,
    },
    "rpg_user_privacy": {
        "CREATE": `
            CREATE TABLE rpg_user_privacy (
                user_id BIGINT NOT NULL,
                privacy_key TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

                CONSTRAINT rpg_user_privacy_pkey PRIMARY KEY (user_id, privacy_key),
                CONSTRAINT rpg_user_privacy_user_id_fkey FOREIGN KEY (user_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE
            );
        `,
    },
    "rpg_auto_eat": {
        "CREATE": `
            CREATE TABLE rpg_auto_eat (
                user_id  BIGINT  NOT NULL,
                position INTEGER NOT NULL,       -- 自動進食順序
                item_id  TEXT    NOT NULL,

                CONSTRAINT rpg_auto_eat_pkey
                    PRIMARY KEY (user_id, position)
                    DEFERRABLE INITIALLY IMMEDIATE,

                CONSTRAINT rpg_auto_eat_user_item_key
                    UNIQUE (user_id, item_id),   -- 防止同一 user 重複加入同一個 item

                CONSTRAINT rpg_auto_eat_user_id_fkey FOREIGN KEY (user_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE,

                CONSTRAINT chk_auto_eat_position CHECK (position > 0)
            );
        `,
    },
    "rpg_partner": {
        "CREATE": `
            CREATE TABLE rpg_partner (
                boss_id     BIGINT      NOT NULL,
                member_id   BIGINT      NOT NULL,
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                last_fed_at TIMESTAMPTZ NULL,

                CONSTRAINT rpg_partner_pkey
                    PRIMARY KEY (member_id),

                CONSTRAINT rpg_partner_boss_id_fkey FOREIGN KEY (boss_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE,

                CONSTRAINT rpg_partner_member_id_fkey FOREIGN KEY (member_id)
                    REFERENCES rpg_users (user_id) ON DELETE CASCADE,

                CONSTRAINT rpg_partner_no_self
                    CHECK (boss_id <> member_id)
            );

            -- 老闆要查「我底下有誰」時會用到
            CREATE INDEX rpg_partner_boss_idx ON rpg_partner (boss_id);
        `,
    }
};
