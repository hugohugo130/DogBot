const args = process.argv.slice(2);
const all_args = args.includes("--all") || args.includes("-a");
const debug = args.includes("--debug") || all_args;
const isBeta = args.includes("--beta") || all_args;
const noCache = args.includes("--no-cache") || all_args;

global._cacheManager ??= null;
global._client ??= null;
global._areadline ??= null;
global._sc ??= null;
global.debug ??= debug;
global.isBeta ??= isBeta;
global.noCache ??= noCache;
global.sendQueue ??= [];

export { };
