import tailwind from "bun-plugin-tailwind";
import solid from "../src/bun-plugins/solid.ts";

const result = await Bun.build({
  entrypoints: ["./demo/index.html"],
  outdir: "./demo/dist",
  plugins: [tailwind, solid],
});

if (!result.success) {
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Built ${result.outputs.length} demo assets.`);
