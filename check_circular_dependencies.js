import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { resolve, join, relative, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();

function walk(dir, acc = []) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return acc;
    }

    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, acc);
        } else {
            acc.push(full);
        }
    }

    return acc;
}

const ALL_FILES = walk(root);

function isIgnored(absPath) {
    const rel = relative(root, absPath).split("\\").join("/");
    try {
        execFileSync("git", ["check-ignore", "-q", "--", rel], { stdio: "pipe", cwd: root });
        return true;
    } catch {
        return false;
    }
}

const CODE_EXT = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx", ".d.ts"];
const EXTS = [".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx", ".mts", ".cts"];

function stripComments(code) {
    let out = "";
    let i = 0;
    const n = code.length;
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;
    let inLine = false;
    let inBlock = false;

    while (i < n) {
        const c = code[i];
        const next = code[i + 1];

        if (inLine) {
            if (c === "\n") { inLine = false; out += c; }
            i++;
            continue;
        }

        if (inBlock) {
            if (c === "*" && next === "/") { inBlock = false; i += 2; continue; }
            i++;
            continue;
        }

        if (inSingle) {
            if (c === "\\") { out += c + (code[i + 1] || ""); i += 2; continue; }
            if (c === "'") { inSingle = false; }
            out += c;
            i++;
            continue;
        }

        if (inDouble) {
            if (c === "\\") { out += c + (code[i + 1] || ""); i += 2; continue; }
            if (c === "\"") { inDouble = false; }
            out += c;
            i++;
            continue;
        }

        if (inTemplate) {
            if (c === "\\") { out += c + (code[i + 1] || ""); i += 2; continue; }
            if (c === "`") { inTemplate = false; }
            out += c;
            i++;
            continue;
        }

        if (c === "/" && next === "/") { inLine = true; i += 2; continue; }
        if (c === "/" && next === "*") { inBlock = true; i += 2; continue; }
        if (c === "'") { inSingle = true; out += c; i++; continue; }
        if (c === "\"") { inDouble = true; out += c; i++; continue; }
        if (c === "`") { inTemplate = true; out += c; i++; continue; }

        out += c;
        i++;
    }

    return out;
}

const FROM_RE = /\b(import|export)\b([\s\S]*?)\bfrom\s*(["'])([^"']+)\3/g;
const SIDE_RE = /\bimport\s+(["'])([^"']+)\1/g;

function isTypeOnly(stmt) {
    const fromMatch = stmt.match(/\bfrom\s*(["'])/);
    if (!fromMatch) return false;
    const head = stmt.slice(0, fromMatch.index).replace(/^(import|export)\b\s*/, "").trim();
    if (head.startsWith("\"") || head.startsWith("'")) return false;
    if (/^type\b/.test(head)) return true;
    const braceMatch = head.match(/^\{([\s\S]*)\}\s*$/);
    if (braceMatch) {
        const bindings = braceMatch[1].split(",").map(s => s.trim()).filter(Boolean);
        return bindings.length > 0 && bindings.every(b => /^type\s+/.test(b));
    }
    return false;
}

function resolveLocal(fromDir, spec) {
    let p;
    if (spec.startsWith("file:")) {
        try {
            p = fileURLToPath(spec);
        } catch {
            return null;
        }
    } else {
        if (!(spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === ".." || spec.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(spec))) {
            return null;
        }
        p = resolve(fromDir, spec);
    }

    if (!p.startsWith(root)) return null;

    if (existsSync(p) && statSync(p).isFile()) return p;
    if (!extname(p)) {
        for (const ext of EXTS) {
            const c = p + ext;
            if (existsSync(c) && statSync(c).isFile()) return c;
        }
    }
    if (existsSync(p) && statSync(p).isDirectory()) {
        for (const ext of EXTS) {
            const c = join(p, `index${ext}`);
            if (existsSync(c) && statSync(c).isFile()) return c;
        }
    }
    return null;
}

function normalize(p) {
    return resolve(p).split("\\").join("/");
}

const graph = new Map(); // node -> Set<target>
const nodeSet = new Set();
const ignoredSet = new Set();
const fileContent = new Map();

for (const abs of ALL_FILES) {
    if (isIgnored(abs)) ignoredSet.add(normalize(abs));
    if (!CODE_EXT.some(e => abs.toLowerCase().endsWith(e))) continue;
    const node = normalize(abs);
    nodeSet.add(node);
    const code = readFileSync(abs, "utf8");
    fileContent.set(node, code);
}

for (const node of nodeSet) {
    const code = fileContent.get(node);
    const src = stripComments(code);
    const fromDir = dirname(node);
    const edges = graph.get(node) ?? new Set();
    graph.set(node, edges);

    for (const m of src.matchAll(FROM_RE)) {
        const spec = m[4];
        if (isTypeOnly(m[0])) continue;
        const target = resolveLocal(fromDir, spec);
        if (target) edges.add(normalize(target));
    }
    for (const m of src.matchAll(SIDE_RE)) {
        const spec = m[2];
        const target = resolveLocal(fromDir, spec);
        if (target) edges.add(normalize(target));
    }
}

function canonicalCycle(path) {
    const rels = path.map(n => relative(root, n).split("\\").join("/"));
    let best = rels.join(" -> ");
    for (let i = 1; i < rels.length; i++) {
        const rotated = [...rels.slice(i), ...rels.slice(0, i)].join(" -> ");
        if (rotated < best) best = rotated;
    }
    return best;
}

// Tarjan SCC to summarize the real circular clusters
let indexCounter = 0;
const indices = new Map();
const lowlink = new Map();
const stack = [];
const onStack = new Set();
const sccs = [];

function strongconnect(node) {
    indices.set(node, indexCounter);
    lowlink.set(node, indexCounter);
    indexCounter++;
    stack.push(node);
    onStack.add(node);

    for (const t of graph.get(node) ?? new Set()) {
        if (!indices.has(t)) {
            strongconnect(t);
            lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(t)));
        } else if (onStack.has(t)) {
            lowlink.set(node, Math.min(lowlink.get(node), indices.get(t)));
        }
    }

    if (lowlink.get(node) === indices.get(node)) {
        const scc = [];
        let w;
        do {
            w = stack.pop();
            onStack.delete(w);
            scc.push(w);
        } while (w !== node);
        sccs.push(scc);
    }
}

for (const node of nodeSet) {
    if (!indices.has(node)) strongconnect(node);
}

const rel = n => relative(root, n).split("\\").join("/");

const circular = [];
for (const scc of sccs) {
    const hasSelfLoop = scc.some(n => (graph.get(n) ?? new Set()).has(n));
    if (scc.length > 1 || hasSelfLoop) circular.push(scc);
}

if (circular.length === 0) {
    console.log("未偵測到任何循環依賴 (掃描 %d 個檔案)。", nodeSet.size);
} else {
    console.log("偵測到 %d 個循環依賴群組 (共 %d 個檔案，涉及 %d 個直接循環邊):\n",
        circular.length,
        circular.reduce((a, s) => a + s.length, 0),
        circular.reduce((a, s) => a + s.reduce((aa, n) => aa + [...(graph.get(n) ?? new Set())].filter(t => s.includes(t)).length, 0), 0));

    for (const scc of circular.sort((a, b) => b.length - a.length)) {
        console.log("── 群組 (%d 個檔案) ──", scc.length);
        for (const n of [...scc].sort()) {
            console.log("  " + rel(n));
        }
        console.log("");
    }
}
