import { Interface } from "readline/promises";
import { Collection } from "discord.js";
import Soundcloud from "soundcloud.ts";

import DogClient from "./utils/customs/client.js";

declare global {
    var _client: DogClient | null,
    var _areadline: Interface | null,
    var _sc: Soundcloud | null,
    var sendQueue: any[],
    var preloadResponse: Collection | null,
};

export { };