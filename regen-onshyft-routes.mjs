import { Generator, getConfig } from "@tanstack/router-generator";
const root = process.cwd();
const config = getConfig({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts", target: "solid" }, root);
await new Generator({ config, root }).run();
console.log("route tree regenerated");
