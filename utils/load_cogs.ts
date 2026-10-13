import fsp from "fs/promises";
import path from "path";
import util from "util";
import {
    type ClientEvents,
} from "discord.js";
import {
    pathToFileURL,
} from "node:url";

import {
    readdir,
} from "./file.js";
import {
    get_logger,
} from "./logger.js";
import {
    cogsFolder,
} from "./config.ts";
import DogClient from "./customs/client.js";

const extensions: string[] = [".js", ".ts"];
const load_skiplist: string[] = [];
const logger = get_logger();

type AsyncPredicate<T> = (
    value: T,
    index: number,
    array: readonly T[]
) => boolean | Promise<boolean>;

export const asyncFilter = async <T>(
    arr: readonly T[],
    predicate: AsyncPredicate<T>
): Promise<T[]> => {
    const results = await Promise.all(arr.map(predicate));
    return arr.filter((_value, index) => results[index]);
};

async function load_cog(
    client: DogClient,
    cog: {
        name: keyof ClientEvents;
        execute: (client: DogClient, ...args: unknown[]) => PromiseLike<unknown>;
        once?: boolean;
    },
    itemPath: string,
): Promise<number> {
    async function run_execute(...args: unknown[]): Promise<void> {
        try {
            await cog.execute(client, ...args);
        } catch (err) {
            const errorStack = util.inspect(err, { depth: null });
            if (errorStack.includes("Unknown Interaction")) return;

            logger.error(`執行 ${itemPath} 時發生錯誤: ${errorStack}`);
        };
    };

    if (!Object.hasOwn(cog, "execute")) {
        logger.warn(`找不到 cog ${itemPath} 的 execute 屬性`);
        return 0;
    };

    if (cog.name) {
        const event_name = cog.name;
        const once = cog.once ?? false;

        if (once) client.once(event_name, run_execute);
        else client.on(event_name, run_execute);

        if (!client.eventListeners.has(event_name)) {
            client.eventListeners.set(event_name, new Set());
        }
        client.eventListeners.get(event_name)!.add(run_execute);
    } else {
        await run_execute(client);
    };

    return 1;
};

export async function load_cogs(client: DogClient, quiet: boolean = false): Promise<number> {
    try {
        const items = await readdir(cogsFolder, {
            recursive: true,
            encoding: "utf-8",
        });

        let loaded = 0;

        for (const relativePath of items) {
            const parts = relativePath.split(path.sep);
            if (parts.some((p) => load_skiplist.includes(p))) continue;
            if (!extensions.some((ext) => relativePath.endsWith(ext))) continue;

            const itemPath = path.join(cogsFolder, relativePath);

            const stat = await fsp.stat(itemPath);
            if (!stat.isFile()) continue;

            try {
                const cog = await import(pathToFileURL(itemPath).href);
                const success = await load_cog(client, cog, itemPath);
                if (!success) continue;

                if (!quiet) logger.info(`✅ Loaded ${relativePath}`);
                loaded++;
            } catch (err) {
                logger.error(`加載 ${itemPath} 時發生錯誤: ${util.inspect(err, { depth: null })}`);
            };
        };

        return loaded;
    } catch (error) {
        logger.error(`加載程式碼(cogs)時出錯:\n${util.inspect(error, { depth: null })}`);
        return 0;
    };
};
