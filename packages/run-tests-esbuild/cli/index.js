#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import esbuild from "esbuild";

// Check for the entry file, as specified on the command line
let entry = process.argv[2];
if (!entry) {
	console.error("Test runner: entry file not specified.");
	process.exit(1);
}
if (!fs.existsSync(entry)) {
	console.error(`Test runner: entry file not found: ${entry}`);
	process.exit(1);
}

// Check if need to watch for changes (default, unless running in CI)
let watch = !process.argv.includes("--ci");
if (process.env.CI) watch = false;

// Create a temporary directory for the transpiled test output
fs.mkdirSync(".test-run", { recursive: true });
fs.writeFileSync(
	".test-run/entry.js",
	`import "../${entry}";import "@talla-ui/run-tests-esbuild";`,
);

// Create the default esbuild config
/** @type import("esbuild").BuildOptions */
let config = {
	entryPoints: [".test-run/entry.js"],
	external: [],
	format: "esm",
	outfile: ".test-run/run.js",
	loader: { ".ts": "ts" },
	platform: "node",
	target: "esnext",
	sourcemap: true,
	bundle: true,
	plugins: [],
};

// Override the esbuild config from a file
if (fs.existsSync("./test-runner.config.js")) {
	let override = await import(
		"file://" + path.join(process.cwd(), "test-runner.config.js")
	);
	if (override.default) override = override.default;
	config = { ...config, ...override };
}

// Mark framework modules as external to avoid re-bundling
config.external.push("talla-ui", "@talla-ui/*");

// Add a plugin to run the tests after the build
config.plugins.push({
	name: "test-run",
	setup: (build) => {
		build.onEnd((result) => {
			if (result.errors.length > 0) return;
			if (watch) console.clear();
			const child = spawn(
				"node",
				["-r", "source-map-support/register", ".test-run/run.js"],
				{ stdio: "inherit" },
			);
			child.addListener("exit", (code) => {
				if (!watch) process.exit(code);
				child.unref();
			});
		});
	},
});

// Run esbuild in watch mode or build once
if (watch) {
	let ctx = await esbuild.context(config);
	await ctx.watch();
} else {
	await esbuild.build(config);
}
