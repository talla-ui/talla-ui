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
		entryPoints: ["dist/bundle.js"],
		target,
		write: false,
		plugins: [
			{
				name: "check import extensions",
				setup(build) {
					build.onResolve({ filter: /^\..*\/\w+$/ }, (args) => {
						throw Error("Import without extension: " + args.path);
					});
				},
			},
		],
	};
	return Promise.all([
		buildAndCompress({
			format: "esm",
			outfile: `lib/talla-web.${target}.esm.min.js`,
			...options,
		}),
		buildAndCompress({
			format: "iife",
			globalName: "tallaUI",
			outfile: `lib/talla-web.${target}.iife.min.js`,
			...options,
		}),
	]);
}

// Create the lib folder if it doesn't exist yet
if (!existsSync("lib")) await fs.mkdir("lib");

// Build ESM and IIFE bundles for all build targets
await Promise.all([buildTarget("es2022"), buildTarget("es2015")]);

// Create appropriate .d.ts files to reference dist folder
let exports = `
export * from "@talla-ui/core"
export * from "@talla-ui/web-handler";
`.trim();
let declareGlobal = `
declare global {
	const tallaUI:
		typeof import("talla-ui") &
		typeof import("@talla-ui/web-handler");
}
`;
await fs.writeFile(
	"lib/talla-web.es2015.iife.min.d.ts",
	exports + declareGlobal,
);
await fs.writeFile(
	"lib/talla-web.es2022.iife.min.d.ts",
	exports + declareGlobal,
);
await fs.writeFile("lib/talla-web.es2015.esm.min.d.ts", exports);
await fs.writeFile("lib/talla-web.es2022.esm.min.d.ts", exports);
