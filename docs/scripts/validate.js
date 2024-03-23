import { RefDocBuilder, PackageParser } from "@desk-framework/docgen";
import { readFileSync } from "node:fs";

// check if in correct folder
let name = JSON.parse(readFileSync("./package.json").toString()).name;
if (name !== "@desk-framework/docs") {
	console.error("ERROR: Running docs script from wrong folder");
	process.exit(1);
}

// parse packages and build doc items
const parse = (id, glob) => new PackageParser(id, glob).parse();
const builder = RefDocBuilder.fromPackages(
	parse("frame-core", "node_modules/@desk-framework/frame-core/dist/**/*.d.ts"),
	parse("frame-test", "node_modules/@desk-framework/frame-test/dist/**/*.d.ts"),
	parse("frame-web", "node_modules/@desk-framework/frame-web/dist/**/*.d.ts"),
)
	.setTemplate("docs", { template: (html) => html })
	.setTemplate("ref", { template: (html) => html })
	.setTagText({
		VERSION: "0.0.0",
		DOCS: "Documentation",
		CONSTRUCTOR: "Constructor",
		TYPEMEMBERS: "Type Members",
		STATICMEMBERS: "Static Members",
		INSTANCEMEMBERS: "Instance Members",
		INHERITED: "Inherited Members",
		RELATED: "Related",
	});

// validate links
let errors = await builder.validateAsync();
if (errors.length > 0) {
	for (let msg of errors) console.error(`ERROR: ${msg}`);
	process.exit(1);
} else {
	console.log("Generated documentation validated successfully");
}
