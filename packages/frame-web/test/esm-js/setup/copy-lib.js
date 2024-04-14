const fs = require("fs");
const baseName = "lib/desk-framework-web.es2018.esm.min";

if (!fs.existsSync("site/lib")) fs.mkdirSync("site/lib");
fs.writeFileSync(
	"site/" + baseName + ".js",
	fs.readFileSync("node_modules/@desk-framework/frame-web/" + baseName + ".js"),
);
fs.writeFileSync(
	"site/" + baseName + ".js.map",
	fs.readFileSync(
		"node_modules/@desk-framework/frame-web/" + baseName + ".js.map",
	),
);
fs.writeFileSync(
	"site/" + baseName + ".d.ts",
	'export * from "@desk-framework/frame-web"',
);
