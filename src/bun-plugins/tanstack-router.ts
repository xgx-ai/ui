import { Generator, getConfig } from "@tanstack/router-generator";
import type { BunPlugin } from "bun";

const plugin: BunPlugin = {
	name: "bun-plugin-tanstack",
	setup(builder) {
		const root = process.cwd();
		const config = getConfig(
			{
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
				target: "solid",
			},
			root,
		);

		const generator = new Generator({ config, root });

		builder.onStart(async () => {
			await generator.run();
		});
	},
};

export default plugin;
