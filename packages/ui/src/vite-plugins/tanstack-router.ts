import { Generator, getConfig } from "@tanstack/router-generator";

/**
 * Route-tree generation for Vite, mirroring `bun-plugins/tanstack-router.ts`.
 *
 * Kept here rather than using `@tanstack/router-plugin` so the generator stays
 * pinned to the version already proven against this repo's
 * `@tanstack/solid-router` beta — the published Vite plugin tracks the 1.x
 * router line and would be a second, unverified moving part.
 *
 * Unlike the Bun version this also watches the routes directory in dev, so
 * adding a route regenerates the tree without restarting the server.
 */

type VitePluginLike = {
  buildStart?: () => Promise<void> | void;
  configureServer?: (server: {
    watcher: {
      on: (event: string, handler: (path: string) => void) => void;
    };
  }) => void;
  enforce?: "post" | "pre";
  name: string;
};

export type TanstackRouterVitePluginOptions = {
  generatedRouteTree?: string;
  root?: string;
  routesDirectory?: string;
  target?: "react" | "solid";
};

export function TanstackRouterVitePlugin(
  options: TanstackRouterVitePluginOptions = {},
): VitePluginLike {
  const {
    generatedRouteTree = "./src/routeTree.gen.ts",
    root = process.cwd(),
    routesDirectory = "./src/routes",
    target = "solid",
  } = options;

  const config = getConfig({ generatedRouteTree, routesDirectory, target }, root);
  const generator = new Generator({ config, root });

  // The generator is not re-entrant; overlapping runs make it throw a
  // "modified by another process" rerun error.
  let inFlight: Promise<void> = Promise.resolve();
  const run = () => {
    inFlight = inFlight
      .catch(() => undefined)
      .then(() => generator.run())
      .catch((error) => {
        console.error("[tanstack-router] route generation failed:", error);
      });
    return inFlight;
  };

  return {
    enforce: "pre",
    name: "xgx-tanstack-router",

    async buildStart() {
      await run();
    },

    configureServer(server) {
      const isRouteFile = (path: string) => path.replaceAll("\\", "/").includes("/src/routes/");

      for (const event of ["add", "change", "unlink"]) {
        server.watcher.on(event, (path) => {
          if (isRouteFile(path)) void run();
        });
      }
    },
  };
}

export default TanstackRouterVitePlugin();
