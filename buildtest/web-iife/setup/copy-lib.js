const fs = require("fs");
const baseName = "lib/desk-framework-web.es2015.iife.min";

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
	"site/lib/desk-framework-web.iife.d.ts",
	fs.readFileSync(
		"node_modules/@desk-framework/frame-web/lib/desk-framework-web.iife.d.ts",
	),
);
