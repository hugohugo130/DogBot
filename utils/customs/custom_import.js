import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getCallerModuleName } from "../logger.js";

/**
 * @param {string} module
 * @param {boolean} [cache=true]
 * @returns {Promise<any>}
 */
export async function importModules(module, cache = true) {
    if (!(URL.canParse(module) && new URL(module).protocol === 'file:')) {
        let caller_path = getCallerModuleName()
            .split('?expire')[0];

        try {
            new URL(caller_path);
        } catch {
            caller_path = pathToFileURL(resolve(caller_path)).href;
        };

        module = new URL(module, caller_path).href;
    };

    module = cache
        ? module
        : `${module}?update=${Date.now()}`;

    return await import(module);
};
