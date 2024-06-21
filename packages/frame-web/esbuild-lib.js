import * as esbuild from "esbuild";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as zlib from "zlib";

async function buildAndCompress(options) {
	let build = await esbuild.build(options);
	for (let file of build.outputFiles) {
		fs.writeFile(file.path, file.contents);
		if (file.path.endsWith(".js")) {
			zlib.gzip(file.contents, (err, result) => {
				if (err) {
					console.error(err);
					process.exit(1);
				}
				fs.writeFile(file.path + ".gz", result);
			});
		}
	}
}

function buildTarget(target) {
	let options = {
		bundle: true,
		minify: true,
		mangleProps: /^_/,
		sourcemap: true,
		entryPoints: ["dist/index.js"],
		target,
		write: false,
		plugins: [
			{
				name: "check import extensions",
				setup(build) {
					build.onResolve({ filter: /\/\w+$/ }, (args) => {
						throw Error("Import without extension: " + args.path);
					});
				},
			},
		],
	};
	return Promise.all([
		buildAndCompress({
			format: "esm",
			outfile: `lib/desk-framework-web.${target}.esm.min.js`,
			...options,
		}),
		buildAndCompress({
			format: "iife",
			globalName: "desk",
			outfile: `lib/desk-framework-web.${target}.iife.min.js`,
			...options,
		}),
	]);
}

// Create the lib folder if it doesn't exist yet
if (!existsSync("lib")) await fs.mkdir("lib");

// Build ESM and IIFE bundles for all build targets
await Promise.all([buildTarget("es2022"), buildTarget("es2015")]);

// Create appropriate .d.ts files to reference dist folder
let exportLine = 'export * from "@desk-framework/frame-web";';
await fs.writeFile(
	"lib/desk-framework-web.iife.d.ts",
	exportLine +
		'\ndeclare global { const desk: typeof import("@desk-framework/frame-web") }',
);
await fs.writeFile("lib/desk-framework-web.es2015.esm.min.d.ts", exportLine);
await fs.writeFile("lib/desk-framework-web.es2022.esm.min.d.ts", exportLine);
