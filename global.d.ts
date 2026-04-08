import { Interface } from "readline/promises";
import { Collection } from "discord.js";
import Soundcloud from "soundcloud.ts";

import { CacheManager } from "./utils/cache.js";
import DogClient from "./utils/customs/client.js";

declare global {
    var _cacheManager: CacheManager | null,
    var _client: DogClient | null,
    var _areadline: Interface | null,
    var _sc: Soundcloud | null,
    var sendQueue: any[],
    var preloadResponse: Collection | null,
};

export { };