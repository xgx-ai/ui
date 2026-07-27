#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const target = resolve(process.argv[2] ?? ".");
const ignoredDirectories = new Set([
	".git",
	".agents",
	".direnv",
	"dist",
	"node_modules",
	"coverage",
]);
const sourceExtensions = new Set([".ts", ".tsx"]);
const findings = {
	legacyImports: [],
	compatibility: [],
	singlePhaseEffects: [],
	conciseApply: [],
	directApply: [],
	possibleApplyReads: [],
	untrack: [],
};

async function collectFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectFiles(path)));
		else if (sourceExtensions.has(extname(entry.name))) files.push(path);
	}

	return files;
}

function lineNumber(source, index) {
	let line = 1;
	for (let position = 0; position < index; position += 1) {
		if (source.charCodeAt(position) === 10) line += 1;
	}
	return line;
}

function skipQuoted(source, start) {
	const quote = source[start];
	let index = start + 1;
	while (index < source.length) {
		if (source[index] === "\\") {
			index += 2;
			continue;
		}
		if (source[index] === quote) return index + 1;
		index += 1;
	}
	return source.length;
}

function effectArguments(source, openParen) {
	const commas = [];
	let braces = 0;
	let brackets = 0;
	let parentheses = 0;
	let index = openParen + 1;

	while (index < source.length) {
		const char = source[index];
		const next = source[index + 1];
		if (char === '"' || char === "'" || char === "`") {
			index = skipQuoted(source, index);
			continue;
		}
		if (char === "/" && next === "/") {
			index = source.indexOf("\n", index + 2);
			if (index === -1) return null;
			continue;
		}
		if (char === "/" && next === "*") {
			index = source.indexOf("*/", index + 2);
			if (index === -1) return null;
			index += 2;
			continue;
		}
		if (char === "{") braces += 1;
		else if (char === "}") braces -= 1;
		else if (char === "[") brackets += 1;
		else if (char === "]") brackets -= 1;
		else if (char === "(") parentheses += 1;
		else if (char === ")") {
			if (parentheses === 0 && braces === 0 && brackets === 0) {
				const starts = [openParen + 1, ...commas.map((comma) => comma + 1)];
				const ends = [...commas, index];
				return starts.map((start, argumentIndex) =>
					source.slice(start, ends[argumentIndex]).trim(),
				);
			}
			parentheses -= 1;
		} else if (
			char === "," &&
			parentheses === 0 &&
			braces === 0 &&
			brackets === 0
		) {
			commas.push(index);
		}
		index += 1;
	}
	return null;
}

function record(findingsList, file, source, index, detail) {
	findingsList.push(
		`${relative(target, file)}:${lineNumber(source, index)} ${detail}`,
	);
}

for (const file of await collectFiles(target)) {
	const source = await readFile(file, "utf8");

	for (const match of source.matchAll(
		/import[\s\S]*?from\s+["'](solid-js\/web|solid-js\/store)["']/g,
	)) {
		record(
			findings.legacyImports,
			file,
			source,
			match.index,
			`legacy subpath import ${match[1]}`,
		);
	}

	for (const match of source.matchAll(
		/import\s*\{([^}]*)\}\s*from\s*["']solid-js["']/g,
	)) {
		const banned = match[1]
			.split(",")
			.map((name) => name.trim().split(/\s+as\s+/)[0])
			.filter((name) =>
				[
					"batch",
					"createComputed",
					"createResource",
					"Index",
					"mergeProps",
					"on",
					"onMount",
					"splitProps",
					"unwrap",
				].includes(name),
			);
		if (banned.length > 0) {
			record(
				findings.legacyImports,
				file,
				source,
				match.index,
				`review Solid 1 imports: ${banned.join(", ")}`,
			);
		}
	}

	for (const match of source.matchAll(/\b(onSignal|solidCompat|solid-compat)\b/g)) {
		record(
			findings.compatibility,
			file,
			source,
			match.index,
			`compatibility helper: ${match[1]}`,
		);
	}

	for (const match of source.matchAll(/\buntrack\s*\(/g)) {
		record(
			findings.untrack,
			file,
			source,
			match.index,
			"confirm this is an intentional snapshot",
		);
	}

	for (const match of source.matchAll(/\bcreate(?:Render)?Effect\s*\(/g)) {
		const openParen = source.indexOf("(", match.index);
		const args = effectArguments(source, openParen);
		if (!args) continue;
		if (args.length < 2) {
			record(
				findings.singlePhaseEffects,
				file,
				source,
				match.index,
				"single-phase effect",
			);
			continue;
		}

		const apply = args[1];
		const arrow = apply.indexOf("=>");
		if (arrow !== -1 && !apply.slice(arrow + 2).trimStart().startsWith("{")) {
			record(
				findings.conciseApply,
				file,
				source,
				match.index,
				"concise apply may return a non-cleanup value",
			);
		} else if (/^[A-Za-z_$][\w$]*$/.test(apply)) {
			record(
				findings.directApply,
				file,
				source,
				match.index,
				`direct apply callback '${apply}'; verify its return contract`,
			);
		}

		if (arrow !== -1) {
			const possibleReads = new Set(
				[...apply.slice(arrow + 2).matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(\s*\)/g)]
					.map((call) => call[1])
					.filter(
						(name) =>
							!name.startsWith("set") &&
							![
								"async",
								"catch",
								"for",
								"function",
								"if",
								"return",
								"switch",
								"while",
							].includes(name),
					),
			);
			if (possibleReads.size > 0) {
				record(
					findings.possibleApplyReads,
					file,
					source,
					match.index,
					`review zero-argument apply calls: ${[...possibleReads].join(", ")}`,
				);
			}
		}
	}
}

function printSection(title, items) {
	console.info(`\n${title} (${items.length})`);
	for (const item of items) console.info(`  ${item}`);
}

console.info(`SolidJS 2 heuristic audit: ${target}`);
printSection("Legacy imports/APIs", findings.legacyImports);
printSection("Compatibility helpers", findings.compatibility);
printSection("Single-phase effects", findings.singlePhaseEffects);
printSection("Concise apply callbacks", findings.conciseApply);
printSection("Direct apply callbacks", findings.directApply);
printSection("Possible hidden apply reads", findings.possibleApplyReads);
printSection("untrack review", findings.untrack);
console.info(
	"\nReview findings manually and verify affected routes with Solid dev diagnostics.",
);
