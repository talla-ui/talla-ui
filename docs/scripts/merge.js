import { DocBuilder, SourceDocBuilder } from "@desk-framework/docgen";
import { readFileSync } from "node:fs";

const VERSION = "4.0.0";

// check if in correct folder
let name = JSON.parse(readFileSync("./package.json").toString()).name;
if (name !== "@desk-framework/docs") {
	console.error("ERROR: Running docs script from wrong folder");
	process.exit(1);
}

// read files from different input folders to merge below
let builder = await new DocBuilder()
	.copyAssets("./content/index/*", "../_site")
	.copyAssets("./content/en/assets/**/*", "../_site/docs/en/assets")
	.copyAssets("../packages/frame-web/lib/**/*", "../_site/lib")
	.copyAssets("./app/dist/bundle.js", "../_site")
	.setTemplate("docs", await import("../templates/en/docs.js"))
	.setTemplate("ref", await import("../templates/en/ref.js"))
	.setTagText({
		VERSION,
		DOCS: "Documentation",
		CONSTRUCTOR: "Constructor",
		TYPEMEMBERS: "Type Members",
		STATICMEMBERS: "Static Members",
		INSTANCEMEMBERS: "Instance Members",
		INHERITED: "Inherited Members",
		RELATED: "Related",
	})
	.readItems("./content/en/_generated_/*.md")
	.merge(
		new DocBuilder().readItems("./content/en/docs/**/*.md", {
			lang: "en-US",
			template: "docs",
		}),
	)
	.merge(
		SourceDocBuilder.fromSource("./content/en/samples/**/*.{ts,tsx}", "ts"),
	)
	.buildMenu()
	.writeHtmlAsync("../_site/docs/en");

// write JSON index file for search app
await builder.writeJsonIndexAsync("../_site/docs/en/index.json", "/docs/en");

// display warnings (as errors)
let errors = builder.getWarnings();
if (errors.length > 0) {
	for (let msg of errors) {
		console.error(`ERROR: ${msg}`);
	}
	console.error("-- Completed with errors");
	process.exit(1);
} else {
	console.log("Docs merged successfully");
}
