import * as esbuild from "esbuild";

let ctx = await esbuild.context({
	entryPoints: ["src/index.ts"],
	bundle: true,
	minify: true,
	sourcemap: "linked",
	sourceRoot: "../..",
	format: "esm",
	target: "es2015",
	outfile: "public/dist/bundle.js",
});

let { port } = await ctx.serve({ servedir: "public" });
console.log(`Serving http://localhost:${port}/index.html`);
