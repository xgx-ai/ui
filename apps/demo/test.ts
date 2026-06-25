import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import solid from "../../packages/ui/src/bun-plugins/solid.ts";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function walk(path: string): string[] {
  const absolute = join(root, path);
  if (!existsSync(absolute)) return [];

  return readdirSync(absolute).flatMap((entry) => {
    const child = join(path, entry);
    const stat = statSync(join(root, child));
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") return [];
      return walk(child);
    }
    return /\.(css|html|js|jsx|json|md|ts|tsx)$/.test(entry) ? [child] : [];
  });
}

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: boolean, message: string) {
  if (!condition) fail(message);
}

function assertNoMatch(files: string[], pattern: RegExp, label: string) {
  const hits = files.flatMap((file) => {
    const text = read(file);
    return pattern.test(text) ? [file] : [];
  });

  assert(hits.length === 0, `${label}: ${hits.join(", ")}`);
}

async function assertTreeShakenPrimitiveImport() {
  const scratchDir = join(root, "test-results", "tree-shake");
  mkdirSync(scratchDir, { recursive: true });

  const entrypoint = join(scratchDir, "primitive-import.ts");
  writeFileSync(
    entrypoint,
    'import { Button } from "../../packages/ui/src/index";\nconsole.log(Button);\n',
  );

  const result = await Bun.build({
    entrypoints: [entrypoint],
    write: false,
    minify: true,
    plugins: [solid],
    target: "browser",
  });

  assert(result.success, `Tree-shaking smoke build failed: ${result.logs.join("\n")}`);

  const bundled = await result.outputs[0]?.text();
  assert(bundled, "Tree-shaking smoke build produced no output");
  assert(!bundled.includes("chart.js"), "Primitive import pulled chart.js into the bundle");
  assert(
    !bundled.includes("@tiptap"),
    "Primitive import pulled rich-text editor code into the bundle",
  );
}

const sourceFiles = [
  "package.json",
  "bun.lock",
  "AGENTS.md",
  "packages/ui/package.json",
  "packages/query/package.json",
  "packages/prefabs/package.json",
  "apps/demo/package.json",
  ...walk("packages/ui/src"),
  ...walk("packages/query/src"),
  ...walk("packages/prefabs/src"),
  ...walk("apps/demo/src"),
  ...walk("docs"),
];

const runtimeFiles = [
  "package.json",
  "bun.lock",
  "packages/ui/package.json",
  "packages/query/package.json",
  "packages/prefabs/package.json",
  "apps/demo/package.json",
  ...walk("packages/ui/src"),
  ...walk("packages/query/src"),
  ...walk("packages/prefabs/src"),
  ...walk("apps/demo"),
].filter((file) => !file.startsWith("apps/demo/dist/") && file !== "apps/demo/test.ts");

const srcFiles = walk("packages/ui/src");
const packageSourceFiles = [
  ...srcFiles,
  ...walk("packages/query/src"),
  ...walk("packages/prefabs/src"),
];
const demoSourceFiles = walk("apps/demo/src");

assertNoMatch(
  srcFiles,
  /from\s+["']@xgx\/ui(?:\/[^"']*)?["']/,
  "Internal @xgx/ui self-import found",
);

assertNoMatch(srcFiles, /@xgx\/query|@xgx\/prefabs/, "UI package must not import query or prefabs");

assertNoMatch(
  sourceFiles,
  /@kobalte|vendor\/kobalte|kobalte|Kobalte|--kb-|kb-/,
  "Kobalte references found",
);

assertNoMatch(
  runtimeFiles,
  /(^|[^a-zA-Z])vite([^a-zA-Z]|$)|@tailwindcss\/vite|vite-plugin-solid/,
  "Vite runtime references found",
);

assertNoMatch(
  [...packageSourceFiles, ...demoSourceFiles],
  /bg-[a-z-]+-foreground\s+text-foreground|text-foreground\s+bg-[a-z-]+-foreground/,
  "Unsafe foreground/background pairing found",
);

assertNoMatch(
  [...packageSourceFiles, ...walk("apps/demo")].filter((file) => file !== "apps/demo/test.ts"),
  /file:\/\//,
  "file URL reference found",
);

assertNoMatch(srcFiles, /\binnerHTML\b/, "Unsafe innerHTML usage found");

assertNoMatch(
  srcFiles,
  /(?:class|style|fillStyle|strokeStyle|background|color|COLORS|palette|presets)[^;\n]{0,160}(?:#[0-9a-fA-F]{3,8}\b|\bblack\b|\bwhite\b)/,
  "Hardcoded color styling default found",
);

const demoSource = demoSourceFiles.map(read).join("\n");
const app = read("apps/demo/src/App.tsx");
for (const route of [
  "ai",
  "admin",
  "async",
  "auth",
  "controls",
  "data",
  "forms",
  "profile",
  "reporting",
  "settings",
]) {
  assert(
    app.includes(`id: "${route}"`) || app.includes(`case "${route}"`),
    `Missing route: ${route}`,
  );
}

for (const requiredCopy of [
  "AI Workspace",
  "AI Guardrails",
  "Generated answer",
  "Users And Roles",
  "Enterprise Controls",
  "Audit Log",
  "Async Runtime",
  "Async portal opened",
  "Deferred Select Options",
  "Optimistic Action",
  "SettingsPopoverContent",
  "AccountPopoverContent",
]) {
  assert(demoSource.includes(requiredCopy), `Missing demo coverage: ${requiredCopy}`);
}

const builtIndex = read("apps/demo/dist/index.html");
assert(
  builtIndex.toLowerCase().includes("<!doctype html>"),
  "Built demo index is missing HTML doctype",
);

await assertTreeShakenPrimitiveImport();

console.log("demo static tests passed");
