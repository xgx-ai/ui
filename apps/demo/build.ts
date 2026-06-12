import tailwind from "bun-plugin-tailwind";
import solid from "../../packages/ui/src/bun-plugins/solid.ts";

const result = await Bun.build({
  entrypoints: ["./apps/demo/index.html"],
  outdir: "./apps/demo/dist",
  plugins: [tailwind, solid],
});

if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Built ${result.outputs.length} demo assets.`);
