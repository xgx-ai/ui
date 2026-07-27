import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SolidPlugin } from "../src/bun-plugins/solid.ts";
import runEditorSpec from "./editor.spec.ts";

const rootDir = path.resolve(import.meta.dir, "..");
const tmpDir = path.join(rootDir, ".tmp");
const outDir = path.join(tmpDir, "tests");
const ssrOutDir = path.join(tmpDir, "tests-ssr");
const solidServerPath = path.join(
  path.dirname(Bun.resolveSync("solid-js/package.json", rootDir)),
  "dist/server.js",
);
const solidWebServerPath = path.join(
  path.dirname(Bun.resolveSync("@solidjs/web/package.json", rootDir)),
  "dist/server.js",
);
const solidSsrRuntimePlugin: Bun.BunPlugin = {
  name: "xgx-solid-v2-ssr-runtime",
  setup(build) {
    build.onResolve({ filter: /^solid-js$/ }, () => ({ path: solidServerPath }));
    build.onResolve({ filter: /^@solidjs\/web$/ }, () => ({ path: solidWebServerPath }));
  },
};
const entrypoints = [
  path.join(import.meta.dir, "flow.spec.ts"),
  path.join(import.meta.dir, "map.spec.ts"),
];
const ssrEntrypoint = path.join(import.meta.dir, "map-ssr.spec.ts");

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
  plugins: [SolidPlugin({ hmr: false })],
  // Bun chunk splitting can evaluate Solid 2's scheduler cycle before GlobalQueue is initialised.
  // Re-enable this once Bun preserves the module order for that cycle.
  splitting: false,
  target: "browser",
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  throw new Error("Test build failed");
}

const ssrResult = await Bun.build({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  entrypoints: [ssrEntrypoint],
  format: "esm",
  minify: false,
  outdir: ssrOutDir,
  plugins: [solidSsrRuntimePlugin, SolidPlugin({ generate: "ssr", hmr: false })],
  target: "bun",
});

if (!ssrResult.success) {
  for (const log of ssrResult.logs) {
    console.error(log);
  }
  throw new Error("SSR test build failed");
}

const bundles = result.outputs.filter((output) => output.kind === "entry-point");
if (bundles.length !== entrypoints.length) {
  throw new Error("Test build did not emit every JavaScript entrypoint");
}

const ssrBundle = ssrResult.outputs.find((output) => output.path.endsWith(".js"));
if (!ssrBundle) {
  throw new Error("SSR test build did not emit a JavaScript entrypoint");
}

try {
  runEditorSpec();

  for (const bundle of bundles) {
    const spec = await import(pathToFileURL(bundle.path).href);
    await spec.default();
  }

  const ssrSpec = await import(pathToFileURL(ssrBundle.path).href);
  await ssrSpec.default();
} finally {
  await rm(tmpDir, { force: true, recursive: true });
}
