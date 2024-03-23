import { RefDocBuilder, PackageParser } from "@desk-framework/docgen";
import { readFileSync } from "node:fs";

// check if in correct folder
let name = JSON.parse(readFileSync("./package.json").toString()).name;
if (name !== "@desk-framework/docs") {
	console.error("ERROR: Running docs script from wrong folder");
	process.exit(1);
}

// parse packages and build doc items
const parse = (id, glob) =>
	new PackageParser(id, glob).enableWarnings(false).parse();
const builder = RefDocBuilder.fromPackages(
	parse("frame-core", "node_modules/@desk-framework/frame-core/dist/**/*.d.ts"),
	parse("frame-test", "node_modules/@desk-framework/frame-test/dist/**/*.d.ts"),
	parse("frame-web", "node_modules/@desk-framework/frame-web/dist/**/*.d.ts"),
);

// output generated content
builder.writeItems("./content/en/_generated_");
for (let warning of builder.getWarnings()) {
	console.error(`WARNING: ${warning}`);
}
