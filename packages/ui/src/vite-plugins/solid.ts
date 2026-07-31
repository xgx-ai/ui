/// <reference path="../bun-plugins/babel.d.ts" />

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import tsPreset from "@babel/preset-typescript";
import solidPreset from "babel-preset-solid";

/**
 * The Solid 2 JSX transform for Vite.
 *
 * Deliberately the same Babel pipeline as `bun-plugins/solid.ts` — the same two
 * presets, the same renderer-import rewrite, the same lucide workaround — so
 * moving a project between the two bundlers cannot change how components
 * compile. What it does NOT carry across is the bespoke solid-refresh HMR
 * transform: Vite falls back to a full page reload instead, which is the whole
 * reason for switching bundlers, since Bun's dev server leaks and then
 * segfaults under repeated hot updates.
 *
 * Typed structurally rather than against `vite`, so `@xgx/ui` does not need
 * Vite as a dependency to export this.
 */

type TransformResult = { code: string; map?: unknown } | undefined;

type VitePluginLike = {
  config?: (config: unknown, env: { command: "build" | "serve"; mode: string }) => unknown;
  enforce?: "post" | "pre";
  name: string;
  transform?: (code: string, id: string) => Promise<TransformResult> | TransformResult;
};

export type SolidVitePluginOptions = {
  debug?: boolean;
  generate?: "dom" | "ssr" | "universal";
  hydratable?: boolean;
};

const require = createRequire(import.meta.url);
const rendererImportPattern = /(["'])solid-js\/web\1/g;
const transformable = /\.(?:ts|tsx|jsx)$/;

/**
 * Resolve the package entry and walk up to its root, rather than resolving
 * "<pkg>/package.json" directly: solid-js does not list ./package.json in its
 * exports map, so asking for it throws ERR_PACKAGE_PATH_NOT_EXPORTED under
 * Node's resolver. Bun's resolver allows it, which hid this until the dev
 * script ran Vite through `bunx`.
 */
function packageRoot(specifier: string, from: string): string {
  let directory = dirname(require.resolve(specifier, { paths: [from] }));

  while (!existsSync(join(directory, "package.json"))) {
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`Cannot locate the package root for "${specifier}".`);
    }
    directory = parent;
  }

  return directory;
}

/**
 * Solid 2 ships separate dev and production runtime builds, and the dev build
 * is what emits the strict-read and invalid-cleanup diagnostics this codebase
 * relies on. Pinning the exact file also collapses any duplicate copies, which
 * is what `bun-solid-dedupe` did on the Bun side.
 */
export function solidRuntimeEntrypoints(
  development: boolean,
  from: string = process.cwd(),
): Record<string, string> {
  const solidRoot = packageRoot("solid-js", from);
  const solidWebRoot = packageRoot("@solidjs/web", from);
  const signalsRoot = packageRoot("@solidjs/signals", solidRoot);

  return {
    "@solidjs/signals": join(signalsRoot, development ? "dist/dev.js" : "dist/prod/index.js"),
    "@solidjs/web": join(solidWebRoot, development ? "dist/dev.js" : "dist/web.js"),
    "solid-js": join(solidRoot, development ? "dist/dev.js" : "dist/solid.js"),
  };
}

function upgradeRendererImports(code: string): string {
  return code.replace(rendererImportPattern, `"@solidjs/web"`);
}

function upgradeLucideImports(code: string): string {
  // lucide-solid is still compiled against Solid 1. Remove this transform once
  // it publishes Solid 2 output.
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

export function SolidVitePlugin(options: SolidVitePluginOptions = {}): VitePluginLike {
  const { generate = "dom", hydratable = false, debug = false } = options;
  let babel: typeof import("@babel/core") | undefined;

  return {
    // Must beat Vite's own esbuild pass, which would otherwise try to handle
    // the JSX itself and produce React-shaped output.
    enforce: "pre",
    name: "xgx-solid-v2",

    config(_config, env) {
      const development = env.command === "serve";
      const entries = solidRuntimeEntrypoints(development);

      return {
        optimizeDeps: {
          // Pre-bundling would inline a second copy of the runtime and
          // undo the aliasing above.
          exclude: ["solid-js", "@solidjs/web", "@solidjs/signals", "lucide-solid"],
        },
        resolve: {
          alias: [
            { find: /^solid-js\/web$/, replacement: entries["@solidjs/web"] },
            { find: /^@solidjs\/web$/, replacement: entries["@solidjs/web"] },
            { find: /^solid-js$/, replacement: entries["solid-js"] },
            {
              find: /^@solidjs\/signals$/,
              replacement: entries["@solidjs/signals"],
            },
          ],
          dedupe: ["solid-js", "@solidjs/web", "@solidjs/signals"],
        },
      };
    },

    async transform(code, id) {
      const path = id.split("?")[0] ?? id;

      if (path.includes("/node_modules/lucide-solid/") && path.endsWith(".js")) {
        return { code: upgradeLucideImports(code) };
      }

      if (!transformable.test(path)) return;

      babel ??= await import("@babel/core");

      const result = await babel.transformAsync(code, {
        babelrc: false,
        configFile: false,
        filename: path,
        presets: [
          [tsPreset, {}],
          [solidPreset, { generate, hydratable }],
        ],
        sourceMaps: true,
      });

      if (!result?.code) {
        if (debug) console.warn(`[xgx-solid-v2] No code for ${path}`);
        return;
      }

      return {
        code: upgradeRendererImports(result.code),
        map: result.map,
      };
    },
  };
}

export default SolidVitePlugin();
