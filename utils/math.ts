import { Parser } from "expr-eval";

// 只允許四則、餘數、次方、括號；其餘全部關閉
const parser = new Parser({
    operators: {
        add: true,
        subtract: true,
        multiply: true,
        divide: true,
        remainder: true,
        power: true,

        concatenate: false,
        conditional: false,
        logical: false,
        comparison: false,
        in: false,
        assignment: false,
        factorial: false,
    },
});

// 禁用所有內建函數與常數，除了指定的
parser.functions = Object.create(null);
parser.consts = Object.create(null);
parser.consts.pi = Math.PI;

export function safeCalculate(input: string, defaultValue: unknown = null) {
    const EMPTY_SCOPE = Object.create(null);

    if (typeof input !== "string") return defaultValue;
    if (input.length > 1000) return defaultValue;

    try {
        const expr = parser.parse(input);

        // 不提供任何變數；有變數會拋錯
        const result = expr.evaluate(EMPTY_SCOPE);

        if (typeof result !== 'number' || !Number.isFinite(result)) {
            return defaultValue;
        };

        return result;
    } catch {
        return defaultValue;
    };
};
