// eslint.config.ts
import path from "node:path";
import globals from "globals";
import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import command from "eslint-plugin-command/config";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { includeIgnoreFile } from "@eslint/config-helpers";

const gitignorePath = path.join(process.cwd(), ".gitignore");

export default defineConfig([
    command(),
    includeIgnoreFile(gitignorePath),
    eslint.configs.recommended,
    jsdoc.configs["flat/recommended"],
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx,mts,cts}"],
        languageOptions: {
            globals: globals.node,
            parserOptions: {
                project: "./jsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
        },
        settings: {
            "jsdoc": {
                mode: "typescript",
            },
        },
        rules: {
            "no-unused-vars": "off",
            'jsdoc/tag-lines': "off",
            "jsdoc/require-param": "warn",
            "jsdoc/require-returns": "off",
            "jsdoc/check-param-names": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/require-property-description": "off",
            "jsdoc/require-returns-check": "warn",
            "jsdoc/check-tag-names": ["error", {
                definedTags: [
                    "warning",
                ],
            }],
            "jsdoc/no-undefined-types": ["warn", {
                definedTypes: [
                    "NodeJS",
                    "NodeJS.Timeout",
                    "NodeJS.CallSite",
                    "NodeJS.ArrayBufferView",
                    "BufferEncoding",
                    "NonSharedBuffer",
                ],
            }],
            // "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/no-unused-vars": ["error", {
                "argsIgnorePattern": "^[_]+$",
                "varsIgnorePattern": "^[_]+$",
                "caughtErrorsIgnorePattern": "^[_]+$"
            }]
        }
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",
            "jsdoc/check-param-names": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/require-property-description": "off",
        }
    },
]);