import * as fs from "fs";
import * as path from "path";

let mainPackageJson = JSON.parse(fs.readFileSync("package.json").toString());
let version = mainPackageJson.version;
console.log("Setting package versions: " + version);

let dirs = fs.readdirSync("packages");
for (let d of dirs) {
	if (!fs.statSync(path.join("packages", d)).isDirectory()) throw Error();
	let packagePath = path.join("packages", d, "package.json");
	let dirPackageJson = JSON.parse(fs.readFileSync(packagePath).toString());
	dirPackageJson.version = version;
	if (dirPackageJson.peerDependencies?.["talla-ui"]) {
		dirPackageJson.peerDependencies["talla-ui"] = version;
	}
	fs.writeFileSync(
		packagePath,
		JSON.stringify(dirPackageJson, undefined, "\t") + "\n",
	);
}
