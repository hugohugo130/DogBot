import {
    Interface,
} from "readline/promises";
import {
    Collection,
} from "discord.js";
import Soundcloud from "soundcloud.ts";

import {
    CacheManager,
} from "./utils/cache.js";
import DogClient from "./utils/customs/client.js";

declare global {
    var _cacheManager: CacheManager | null | undefined;
    var _client: DogClient | null | undefined;
    var _areadline: Interface | null | undefined;
    var _sc: Soundcloud | null | undefined;
    var debug: boolean | undefined;
    var isBeta: boolean | undefined;
    var sendQueue: any[] | undefined;
    var preloadResponse: Collection | null | undefined;
};

export { };