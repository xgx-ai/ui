import { expect, test } from "bun:test";
import { join } from "node:path";

/**
 * Executes the shipped Grit rules against the fixtures.
 *
 * `test/grit/invalid.tsx` must produce exactly the diagnostics listed below and
 * `test/grit/valid.tsx` must produce none — the second half is what stops a rule from
 * being written so broadly that it flags correct code.
 *
 * The fixtures are linted through `test/grit-config`, a standalone root config, so they
 * are never swept into the repository's own lint run.
 */

const repoRoot = join(import.meta.dir, "../../..");

type Finding = { line: number; rule: string; severity: string };

/** Identifies which rule fired, so a reordered fixture cannot silently pass. */
function ruleOf(message: string): string {
  if (message.includes("Destructured props")) return "no-destructured-props";
  if (message.includes("two callbacks")) return "no-single-callback-effect";
  if (message.includes("Sampling a prop")) return "initial-prop-contract/prop";
  if (message.includes("Raw `untrack`")) return "initial-prop-contract/raw";
  return `unknown: ${message.slice(0, 40)}`;
}

function lintFixture(fixture: string): Finding[] {
  const result = Bun.spawnSync({
    cmd: [
      join(repoRoot, "node_modules/.bin/biome"),
      "lint",
      "--config-path=packages/solid/test/grit-config",
      "--reporter=json",
      `packages/solid/test/grit/${fixture}`,
    ],
    cwd: repoRoot,
    env: { ...process.env, NO_COLOR: "1" },
  });

  const report = JSON.parse(result.stdout.toString()) as {
    diagnostics: {
      category: string;
      location: { start?: { line: number } };
      message: string;
      severity: string;
    }[];
  };

  return report.diagnostics
    .filter((diagnostic) => diagnostic.category === "plugin")
    .map((diagnostic) => ({
      line: diagnostic.location.start?.line ?? 0,
      rule: ruleOf(diagnostic.message),
      severity: diagnostic.severity,
    }))
    .sort((a, b) => a.line - b.line);
}

test("the Grit rules flag every violation in the invalid fixture", () => {
  expect(lintFixture("invalid.tsx")).toEqual([
    { line: 4, rule: "no-destructured-props", severity: "error" },
    { line: 7, rule: "no-destructured-props", severity: "error" },
    { line: 11, rule: "no-single-callback-effect", severity: "error" },
    { line: 14, rule: "no-single-callback-effect", severity: "error" },
    { line: 21, rule: "initial-prop-contract/prop", severity: "error" },
    { line: 27, rule: "initial-prop-contract/raw", severity: "warning" },
  ]);
});

test("the Grit rules leave correct code alone", () => {
  expect(lintFixture("valid.tsx")).toEqual([]);
});
