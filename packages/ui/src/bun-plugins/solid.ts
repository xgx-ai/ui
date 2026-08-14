import { dirname, join } from "node:path";
import remapping from "@ampproject/remapping";
import { transform, transformRefresh } from "@dom-expressions/compiler";

type SolidPluginOptions = {
  generate?: "dom" | "ssr" | "universal";
  hydratable?: boolean;
  hmr?: boolean;
  sourceMaps?: boolean | "inline";
  debug?: boolean;
};

const rendererImportPattern = /(["'])solid-js\/web\1/g;

/**
 * The renderer every emitted `_$template`/`_$insert` import points at. Solid 2
 * serves both the DOM and the SSR runtime from this one package.
 */
const MODULE_NAME = "@solidjs/web";

function packageRoot(specifier: string): string {
  return dirname(Bun.resolveSync(`${specifier}/package.json`, process.cwd()));
}

/**
 * Bun resolves bare specifiers without the `development` export condition, so
 * every Solid entry is pinned to an explicit dist file instead. `solid-js/refresh`
 * has to be pinned alongside the core: its development build warns and disables
 * itself if it finds the production core next to it, and the refresh runtime
 * imports bare `solid-js`, so both must land on the same generation.
 */
function solidRuntimeEntrypoints(development: boolean): Record<string, string> {
  const solidRoot = packageRoot("solid-js");
  const solidWebRoot = packageRoot("@solidjs/web");
  const signalsRoot = dirname(Bun.resolveSync("@solidjs/signals/package.json", solidRoot));

  return {
    "@solidjs/signals": join(signalsRoot, development ? "dist/dev.js" : "dist/prod/index.js"),
    "@solidjs/web": join(solidWebRoot, development ? "dist/dev.js" : "dist/web.js"),
    "solid-js": join(solidRoot, development ? "dist/dev.js" : "dist/solid.js"),
    "solid-js/refresh": join(solidRoot, development ? "dist/refresh.dev.js" : "dist/refresh.js"),
  };
}

function upgradeRendererImports(code: string): string {
  return code.replace(rendererImportPattern, `"${MODULE_NAME}"`);
}

function upgradeLucideImports(code: string): string {
  // lucide-solid is still compiled against Solid 1. Remove this transform once it publishes Solid 2 output.
  return upgradeRendererImports(code)
    .replace(
      /import\s+\{\s*splitProps\s*,\s*For\s*\}\s+from\s+["']solid-js["'];/g,
      'import { For, omit } from "solid-js";',
    )
    .replace(
      /const\s+\[([A-Za-z_$][\w$]*),\s*([A-Za-z_$][\w$]*)\]\s*=\s*splitProps\(([^,\n]+),\s*\[([^\]]*)\]\);/g,
      (_match, local, rest, props, keys) =>
        `const ${local} = ${props};\nconst ${rest} = omit(${props}, ${keys});`,
    );
}

function shouldApplyHmr(path: string, enabled: boolean): boolean {
  return enabled && !path.includes("/node_modules/") && !path.endsWith(".d.ts");
}

/**
 * `bundler: "esm"` hands the whole `import.meta.hot` object to the refresh
 * runtime, and Bun rejects that: it resolves `import.meta.hot.data` statically
 * and fails the module with "import.meta.hot.data cannot be used indirectly".
 * There is no Bun target in the compiler, so the call site is rewritten to pass
 * a shim whose every access is a direct member expression Bun can see.
 *
 * `invalidate` is feature-detected because Bun does not declare it. It is the
 * path we want when it exists — a bare `location.reload()` races the rebuild and
 * can land the page on a bundle generation the server already discarded.
 */
const hotArgumentPattern = /(\b[A-Za-z_$][\w$]*)\((["'])esm\2,\s*import\.meta\.hot,/g;

const HOT_SHIM =
  "{" +
  "get data() { return import.meta.hot.data; }," +
  "accept: (cb) => import.meta.hot.accept(cb)," +
  "decline: () => import.meta.hot.decline()," +
  'invalidate: () => (typeof import.meta.hot.invalidate === "function"' +
  " ? import.meta.hot.invalidate()" +
  " : location.reload())" +
  "}";

function bridgeHotToBun(code: string): string {
  return code.replace(hotArgumentPattern, (_match, callee, quote) =>
    [callee, "(", quote, "esm", quote, ", ", HOT_SHIM, ","].join(""),
  );
}

type SourceMap = string | null | undefined;

/**
 * Chains the JSX map onto the refresh map so a browser frame still resolves to
 * the original `.tsx`. Without this the second pass' map would point at the
 * output of the first.
 */
function composeMaps(source: string, filename: string, maps: SourceMap[]): string | undefined {
  const chain = maps.filter(Boolean).map((map) => JSON.parse(String(map)));
  if (chain.length === 0) return undefined;

  // Every pass names the same file as its source, so the loader has to hand each
  // earlier map back exactly once — returning it again would make `remapping`
  // walk the same link forever.
  const pending = chain.slice(0, -1).reverse();
  const remapped =
    chain.length === 1
      ? chain[0]
      : remapping(chain[chain.length - 1], (file) =>
          file === filename ? (pending.shift() ?? null) : null,
        );

  const merged = { ...remapped, sourcesContent: [source] };
  return `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(
    JSON.stringify(merged),
  ).toString("base64")}`;
}

export function SolidPlugin(options: SolidPluginOptions = {}): Bun.BunPlugin {
  const {
    generate = "dom",
    hmr = true,
    hydratable = false,
    sourceMaps = "inline",
    debug = false,
  } = options;

  return {
    name: "xgx-solid-v2",
    setup(build) {
      // `dev` selects Solid's development builds, which carry the diagnostics and
      // the `$DEVCOMP` marker the refresh runtime keys off. Only the DOM renderer
      // hot-reloads, so an SSR or production pass stays on the production core.
      const development = hmr && generate === "dom";
      const solidEntrypoints = solidRuntimeEntrypoints(development);
      const wantsSourceMap = sourceMaps !== false;

      build.onResolve({ filter: /^solid-js$/ }, () => ({
        path: solidEntrypoints["solid-js"],
      }));

      build.onResolve({ filter: /^solid-js\/refresh$/ }, () => ({
        path: solidEntrypoints["solid-js/refresh"],
      }));

      build.onResolve({ filter: /^@solidjs\/(?:signals|web)$/ }, (args) => ({
        path: solidEntrypoints[args.path],
      }));

      build.onLoad({ filter: /node_modules\/lucide-solid\/.*\.js$/ }, async ({ path }) => ({
        contents: upgradeLucideImports(await Bun.file(path).text()),
        loader: "js",
      }));

      build.onLoad({ filter: /\.(?:ts|tsx|jsx)$/ }, async ({ path }) => {
        const source = await Bun.file(path).text();

        try {
          const compiled = transform(source, {
            filename: path,
            moduleName: MODULE_NAME,
            generate,
            hydratable,
            dev: development,
            sourceMap: wantsSourceMap,
          });

          let code = compiled.code;
          const maps: SourceMap[] = [compiled.map];

          if (shouldApplyHmr(path, development)) {
            // `jsx: false` because the pass above already lowered it. `bundler: "esm"`
            // drives the module through `hot.data` / `hot.accept(mod)` / `hot.invalidate()`,
            // which is the subset of the HMR API Bun implements.
            const refreshed = transformRefresh(code, {
              filename: path,
              bundler: "esm",
              importSource: "solid-js/refresh",
              granular: true,
              fixRender: true,
              jsx: false,
              sourceMap: wantsSourceMap,
            });

            code = bridgeHotToBun(refreshed.code);
            maps.push(refreshed.map);
          }

          const inlineMap = wantsSourceMap ? composeMaps(source, path, maps) : undefined;

          return {
            // The compiler lowers JSX but leaves TypeScript in place; `ts` hands the
            // residual annotations to Bun, which strips them natively.
            contents: upgradeRendererImports(code) + (inlineMap ?? ""),
            loader: "ts",
          };
        } catch (error) {
          if (debug) console.warn(`[xgx-solid-v2] ${path}: ${(error as Error).message}`);
          throw error;
        }
      });
    },
  };
}

export default SolidPlugin();
