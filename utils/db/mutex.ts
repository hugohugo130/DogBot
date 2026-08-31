export class Mutex {
    private _queue: Promise<void> = Promise.resolve();

    /**
     * 在獨佔鎖內執行非同步操作
     */
    async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
        // 創建一個用於解鎖的 promise
        let release: () => void;
        const next = new Promise<void>((resolve) => {
            release = resolve;
        });

        // 把操作插入到隊列中
        const previous = this._queue;
        this._queue = previous.then(() => next);

        // 等待前一個操作結束
        await previous;

        try {
            return await fn();
        } finally {
            // 釋放鎖
            release!();
        };
    };
};
