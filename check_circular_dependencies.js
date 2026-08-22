import {
    readFileSync,
    existsSync,
    readdirSync,
    statSync,
} from "fs";
import {
    dirname,
    resolve,
    extname,
    join,
} from "path";

/**
 * 循環依賴檢測工具
 * 掃描所有 JS 檔案並檢測循環依賴問題
 */

const analyzed = new Map(); // 已分析的檔案

/** @type {Map<string, string[]>} */
const dependencies = new Map(); // 檔案依賴圖

/** @type {string[][]} */
const circularDeps = []; // 循環依賴列表

/**
 * 提取檔案中的所有**頂層** require 語句和 import 語句（排除函數內的動態載入）
 * @param {string} filePath
 */
function extractRequires(filePath) {
    try {
        const content = readFileSync(filePath, {
            encoding: "utf-8",
        });

        // 移除註解，但**保留**字串字面量（因為 import 的檔案路徑就寫在字串中）
        const commentClean = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行註解
            .replace(/\/\/.*/g, ''); // 移除單行註解

        const requires = [];

        // 提取所有靜態 import 的 `from "..."` 語句
        // 涵蓋：`import { x } from "./foo.js"` 以及多行寫法的續行 `} from "./foo.js"`
        const fromPattern = /\bfrom\s+['"](\.\.?\/[^'"]+)['"]/g;
        let match;
        while ((match = fromPattern.exec(commentClean)) !== null) {
            requires.push(match[1]);
        }

        // 提取裸 import 語句：`import "./foo.js"`
        const bareImportPattern = /import\s+['"](\.\.?\/[^'"]+)['"]/g;
        while ((match = bareImportPattern.exec(commentClean)) !== null) {
            requires.push(match[1]);
        }

        const lines = commentClean.split('\n');

        let braceDepth = 0; // 追蹤大括號深度
        let parenDepth = 0; // 追蹤小括號深度
        let inFunction = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // 跳過註解
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
                continue;
            }

            // 檢測函數定義
            if (/\bfunction\s+\w+\s*\(/.test(line) ||
                /\w+\s*:\s*function\s*\(/.test(line) ||
                /\w+\s*=\s*function\s*\(/.test(line) ||
                /\w+\s*=>\s*{/.test(line) ||
                /\basync\s+function\s+\w+\s*\(/.test(line)) {
                inFunction = true;
            }

            // 計算大括號深度
            for (const char of line) {
                if (char === '{') braceDepth++;
                if (char === '}') {
                    braceDepth--;
                    if (braceDepth === 0) inFunction = false;
                }
                if (char === '(') parenDepth++;
                if (char === ')') parenDepth--;
            }

            // 只在頂層（不在函數內）時才提取 require 和動態 import
            if (!inFunction && braceDepth === 0) {
                // require()
                const requirePattern = /require\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
                let reqMatch;
                while ((reqMatch = requirePattern.exec(line)) !== null) {
                    requires.push(reqMatch[1]);
                }

                // 動態 import()
                const dynImportPattern = /import\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
                let dynMatch;
                while ((dynMatch = dynImportPattern.exec(line)) !== null) {
                    requires.push(dynMatch[1]);
                }
            }
        }

        return requires;
    } catch (error) {
        if (error instanceof Error) console.error(`無法讀取檔案 ${filePath}:`, error.message);
        return [];
    }
}

/**
 * 解析相對路徑為絕對路徑
 * @param {string} fromFile
 * @param {string} requirePath
 */
function resolvePath(fromFile, requirePath) {
    const dir = dirname(fromFile);
    let resolved = resolve(dir, requirePath);

    // 如果沒有副檔名，嘗試加上 .js
    if (!extname(resolved)) {
        if (existsSync(resolved + '.js')) {
            resolved += '.js';
        } else if (existsSync(resolved + '/index.js')) {
            resolved = join(resolved, 'index.js');
        }
    }

    return resolved.replace(/\\/g, '/');
}

/**
 * 遞迴掃描所有 JS 檔案
 * @param {string} dir
 * @param {string[]} fileList
 */
function scanDirectory(dir, fileList = []) {
    const files = readdirSync(dir, {
        encoding: "utf-8",
    });

    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            // 忽略 node_modules 和 .git
            if (file !== 'node_modules' && file !== '.git' && file !== 'db') {
                scanDirectory(filePath, fileList);
            }
        } else if (file.endsWith('.js')) {
            fileList.push(filePath.replace(/\\/g, '/'));
        }
    });

    return fileList;
}

/**
 * 建立依賴圖
 * @param {string[]} files
 */
function buildDependencyGraph(files) {
    files.forEach(file => {
        const requires = extractRequires(file);

        /** @type {string[]} */
        const deps = [];

        requires.forEach(req => {
            const resolved = resolvePath(file, req);
            if (existsSync(resolved)) {
                deps.push(resolved);
            }
        });

        dependencies.set(file, deps);
    });
}

/**
 * 檢測循環依賴 (DFS)
 * @param {string} file
 * @param {Set<string>} [visiting]
 * @param {Set<string>} [visited]
 * @param {string[]} [path]
 */
function detectCircular(file, visiting = new Set(), visited = new Set(), path = []) {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
        // 發現循環
        const circleStart = path.indexOf(file);
        const circle = path.slice(circleStart).concat(file);
        circularDeps.push(circle);
        return;
    }

    visiting.add(file);
    path.push(file);

    const deps = dependencies.get(file) || [];
    deps.forEach(dep => {
        detectCircular(dep, visiting, visited, [...path]);
    });

    visiting.delete(file);
    visited.add(file);
}

/**
 * 格式化輸出路徑
 * @param {string} fullPath
 */
function formatPath(fullPath) {
    return fullPath.replace(process.cwd().replace(/\\/g, '/'), '.');
}

/**
 * 主函數
 */
function main() {
    console.log('🔍 開始掃描專案中的循環依賴...\n');

    const projectRoot = process.cwd();
    const allFiles = scanDirectory(projectRoot);

    console.log(`📁 找到 ${allFiles.length} 個 JS 檔案\n`);

    // 建立依賴圖
    buildDependencyGraph(allFiles);

    // 檢測循環依賴
    allFiles.forEach(file => {
        detectCircular(file, new Set(), new Set(), []);
    });

    // 去重循環依賴
    /** @type {string[][]} */
    const uniqueCircles = [];
    const circleSignatures = new Set();

    circularDeps.forEach(circle => {
        const signature = circle.sort().join('->');
        if (!circleSignatures.has(signature)) {
            circleSignatures.add(signature);
            uniqueCircles.push(circle);
        }
    });

    // 輸出結果
    console.log('\n⚠️  注意：此工具只檢測**頂層的循環依賴**');
    console.log('函數內部的 require() 不會被視為循環依賴（因為是延遲載入）\n');

    if (uniqueCircles.length === 0) {
        console.log('✅ 沒有發現頂層循環依賴！');
    } else {
        console.log(`❌ 發現 ${uniqueCircles.length} 個頂層循環依賴：\n`);

        uniqueCircles.forEach((circle, index) => {
            console.log(`\n循環 ${index + 1}:`);
            circle.forEach((file, i) => {
                const formatted = formatPath(file);
                if (i === circle.length - 1) {
                    console.log(`  └─→ ${formatted}`);
                } else {
                    console.log(`  ${i === 0 ? '┌─→' : '├─→'} ${formatted}`);
                }
            });
        });

        console.log('\n\n⚠️  循環依賴分析：');
        console.log('===================================');

        // 分析最常出現的檔案
        const fileCount = new Map();
        uniqueCircles.forEach(circle => {
            circle.forEach(file => {
                const count = fileCount.get(file) || 0;
                fileCount.set(file, count + 1);
            });
        });

        const sorted = [...fileCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        console.log('\n最常出現在循環依賴中的檔案：');
        sorted.forEach(([file, count]) => {
            console.log(`  • ${formatPath(file)} (出現 ${count} 次)`);
        });
    }
}

// 執行
main();