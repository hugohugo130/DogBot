import {
    type APIEmbedField,
} from "discord.js";

import {
    get_emojis,
    get_name_of_id,
    mine_gets,
    ingots,
    logs,
    planks,
    wood_productions,
    foods_crops,
    foods_meat,
    fish,
    weapons_armor,
    brew,
    type ItemKey,
} from "../rpg.ts";
import {
    RPGInventory,
} from "../db/tables.ts";
import {
    wait_for_client,
} from "../wait_for_client.js";
import DogClient from "../customs/client.js";
import EmbedBuilder from "../customs/embedBuilder.js";

export interface CategoryDef<T = unknown> {
    /** 唯一鍵，用於參數指定 */
    key: string;
    /** 顯示名稱（可含靜態 emoji） */
    label: string;
    /** 需要動態取得的 emoji 鍵（對應 get_emojis 的參數），可省略 */
    emojiKey?: string;
    /** 判斷物品是否屬於此分類 */
    match: (item: string) => boolean;
    /** 自訂每個 item 的顯示文字；data 是原始 value；不給則預設 `名稱 \`xN\`` */
    formatItem?: (item: string, data: T) => string;
    /** 排序 key 擷取 */
    sortKey?: (item: string) => string;
    /** 是否要把 value 依 1024 字元自動分塊（超過就拆成多個 field） */
    chunk?: boolean;
};
interface AddInventoryFieldsOptions<T = number> {
    embed: EmbedBuilder;
    inventory: Record<string, T> | Map<string, T>;
    client: DogClient;
    /** 自訂分類；不給就用 default */
    categories: CategoryDef<T>[];
    /** 只顯示這些 key */
    include?: string[];
    /** 排除這些 key */
    exclude?: string[];
    /** Embed 的 inline: true */
    inline?: boolean;
};
interface CategorizeBackpackOptions {
    inventory: RPGInventory;
    client?: DogClient | null;
    limit?: number;
};
type CategoryDefKeys =
    | "inventory";

const categoryDef: Record<CategoryDefKeys, CategoryDef[]> = {
    "inventory": [
        { // ores
            key: "ores",
            label: "礦物",
            emojiKey: "ore",
            match: (i) => (mine_gets as readonly string[]).includes(i) || (ingots as readonly string[]).includes(i),
        },
        { // logs
            key: "logs",
            label: "🪵 木材",
            match: (i) => (logs as readonly string[]).includes(i) || (planks as readonly string[]).includes(i) || (wood_productions as readonly string[]).includes(i),
        },
        { // food_crops
            key: "food_crops",
            label: "農作物",
            emojiKey: "farmer",
            match: (i) => (foods_crops as readonly string[]).includes(i),
        },
        { // food_meat
            key: "food_meat",
            label: "肉類",
            emojiKey: "cow",
            match: (i) => (foods_meat as readonly string[]).includes(i) && !(fish as readonly string[]).includes(i),
        },
        { // fish
            key: "fish",
            label: "🐟 魚類",
            match: (i) => (fish as readonly string[]).includes(i),
        },
        { // weapons_armor
            key: "weapons_armor",
            label: "武器 & 防具",
            emojiKey: "swords",
            match: (i) => (weapons_armor as readonly string[]).includes(i),
        },
        { // potions
            key: "potions",
            label: "藥水",
            emojiKey: "potion",
            match: (i) => (brew as readonly string[]).includes(i),
        },
        { // other
            key: "other",
            label: "📦 其他物品",
            match: () => true, // 保底
        },
    ],
};

function chunkLines(lines: string[], maxLength = 1024): string[] {
    const chunks: string[] = [];
    let current = "";

    for (const line of lines) {
        const next = current ? `${current}\n${line}` : line;
        if (next.length > maxLength) {
            if (current) chunks.push(current);
            current = line;
        } else {
            current = next;
        };
    };

    if (current) chunks.push(current);
    return chunks;
};

export function getCategoryDef(key: CategoryDefKeys): CategoryDef[] {
    return categoryDef[key];
};

export function createDefaultCategories(): CategoryDef[] {
    return [
        { // ores
            key: "ores",
            label: "礦物",
            emojiKey: "ore",
            match: (i) =>
                (mine_gets as readonly string[]).includes(i)
                || (ingots as readonly string[]).includes(i),
        },
        { // logs
            key: "logs",
            label: "🪵 木材",
            match: (i) =>
                (logs as readonly string[]).includes(i)
                || (planks as readonly string[]).includes(i)
                || (wood_productions as readonly string[]).includes(i),
        },
        { // food_crops
            key: "food_crops",
            label: "農作物",
            emojiKey: "farmer",
            match: (i) => (foods_crops as readonly string[]).includes(i),
        },
        { // food_meat
            key: "food_meat",
            label: "肉類",
            emojiKey: "cow",
            match: (i) =>
                (foods_meat as readonly string[]).includes(i)
                && !(fish as readonly string[]).includes(i),
        },
        { // fish
            key: "fish",
            label: "🐟 魚類",
            match: (i) => (fish as readonly string[]).includes(i),
        },
        { // weapons_armor
            key: "weapons_armor",
            label: "武器 & 防具",
            emojiKey: "swords",
            match: (i) => (weapons_armor as readonly string[]).includes(i),
        },
        { // potions
            key: "potions",
            label: "藥水",
            emojiKey: "potion",
            match: (i) => (brew as readonly string[]).includes(i),
        },
        { // other
            key: "other",
            label: "📦 其他物品",
            match: () => true, // 保底
        },
    ];
};

export function addCategorizedFields<T>(
    embed: EmbedBuilder,
    source: Record<string, T> | Map<string, T>,
    categories: CategoryDef<T>[],
    emojiMap: Record<string, string>,
    inline = false,
): void {
    const entries: [string, T][] =
        source instanceof Map ? [...source] : Object.entries(source);

    const fallback = categories.find(c => c.key === "other");

    const buckets: Record<string, [string, T][]> = {};
    for (const c of categories) buckets[c.key] = [];

    for (const [item, data] of entries) {
        const def =
            // other 永遠放最後，避免提早吃掉所有物品 (有順序優先度)
            categories.find(c => c.key !== "other" && c.match(item))
            ?? fallback;
        if (!def) continue; // 沒指定 other 且沒人匹配 → 丟棄
        buckets[def.key].push([item, data]);
    };

    for (const cat of categories) {
        const list = buckets[cat.key];
        if (!list.length) continue;

        if (cat.sortKey) list.sort((a, b) => cat.sortKey!(a[0]).localeCompare(cat.sortKey!(b[0])));

        const prefix = cat.emojiKey ? emojiMap[cat.emojiKey] : "";
        const name = prefix ? `${prefix} ${cat.label}` : cat.label;

        const format = cat.formatItem ?? ((id, d) => {
            const amt = typeof d === "number" ? d : (d as { amount?: number })?.amount ?? 0;
            return `${get_name_of_id(id)} \`x${amt.toLocaleString()}\``;
        });

        const lines = list.map(([id, d]) => format(id, d));

        if (cat.chunk) {
            for (const c of chunkLines(lines, 1024)) embed.addFields({ name, value: c, inline });
        } else {
            embed.addFields({ name, value: lines.join("\n"), inline });
        };
    };
};

/** 把分類欄位加進 embed */
export async function addInventoryFields<T = number>(
    opts: AddInventoryFieldsOptions<T>,
): Promise<void> {
    const { embed, inventory, client, inline = true, include, exclude } = opts;

    let selected = opts.categories;
    if (include?.length) selected = selected.filter((c) => include.includes(c.key));
    if (exclude?.length) selected = selected.filter((c) => !exclude.includes(c.key));
    if (!selected.length) return;

    // 一次把所有需要的 emoji 抓回來
    const emojiKeys = [...new Set(selected)] // 去重
        .map((c) => c.emojiKey)
        .filter((k): k is string => Boolean(k));

    const emojis = emojiKeys.length ? await get_emojis(emojiKeys, client) : [];
    const emojiMap = Object.fromEntries(
        emojiKeys.map((k, i) => [k, emojis[i] ?? ""]),
    );

    addCategorizedFields(embed, inventory, selected, emojiMap, inline);
};

/** 整理背包 → 回傳可直接 addFields 的欄位陣列 */
export async function categorize_backpack(
    opts: CategorizeBackpackOptions,
): Promise<APIEmbedField[]> {
    const {
        inventory,
        client = await wait_for_client(),
        limit = 25,
    } = opts;
    const categories: CategoryDef[] = getCategoryDef("inventory");

    // 1. 分桶
    const entries = inventory.entries().toArray();

    const buckets: Record<string, Partial<Record<ItemKey, number>>> = {};
    for (const c of categories) buckets[c.key] = {};

    const fallback = categories.find((c) => c.key === "other")!;

    for (const [item, amount] of entries) {
        if (!amount) continue;
        const def =
            categories.find((c) => c.key !== "other" && c.match(item))
            ?? fallback;
        buckets[def.key][item] = amount;
    };

    // 2. 只保留有東西的分類
    const nonEmpty = categories.filter(
        (c) => Object.keys(buckets[c.key]).length > 0,
    );
    if (nonEmpty.length === 0) return [];

    // 3. 一次抓齊 emoji
    const emojiKeys = nonEmpty
        .map((c) => c.emojiKey)
        .filter((k): k is string => Boolean(k));
    const emojis = emojiKeys.length ? await get_emojis(emojiKeys, client) : [];
    const emojiMap = Object.fromEntries(
        emojiKeys.map((k, i) => [k, emojis[i] ?? ""]),
    );

    // 4. 產生欄位
    return nonEmpty
        .map((cat) => {
            const prefix = cat.emojiKey ? emojiMap[cat.emojiKey] : "";
            const name = prefix ? `${prefix} ${cat.label}` : cat.label;

            const value = Object.entries(buckets[cat.key])
                .map(([id, amt]) => `${get_name_of_id(id)} \`x${amt.toLocaleString()}\``)
                .join("\n");

            return { name, value, inline: true };
        })
        .slice(0, limit);
};
