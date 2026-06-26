import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import solidPlugin from "../src/bun-plugins/solid.ts";

const rootDir = path.resolve(import.meta.dir, "..");
const tmpDir = path.join(rootDir, ".tmp");
const outDir = path.join(tmpDir, "tests");
const entrypoints = [path.join(import.meta.dir, "flow.spec.ts")];

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

const result = await Bun.build({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  entrypoints,
  format: "esm",
  minify: false,
  outdir: outDir,
  plugins: [solidPlugin],
  target: "browser",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("Test build failed");
}

const bundles = result.outputs.filter((output) => output.path.endsWith(".js"));
if (bundles.length !== entrypoints.length) {
  throw new Error("Test build did not emit every JavaScript entrypoint");
}

try {
  for (const bundle of bundles) {
    const spec = await import(pathToFileURL(bundle.path).href);
    await spec.default();
  }
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
