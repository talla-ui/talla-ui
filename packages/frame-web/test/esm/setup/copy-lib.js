const fs = require("fs");
const baseName = "lib/desk-framework-web.es2018.esm.min";

if (!fs.existsSync("lib")) fs.mkdirSync("lib");
fs.writeFileSync(
	baseName + ".js",
	fs.readFileSync("node_modules/@desk-framework/frame-web/" + baseName + ".js"),
);
fs.writeFileSync(
	baseName + ".js.map",
	fs.readFileSync(
		"node_modules/@desk-framework/frame-web/" + baseName + ".js.map",
	),
);
fs.writeFileSync(
	baseName + ".d.ts",
	'export * from "@desk-framework/frame-web"',
);
