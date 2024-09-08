import { mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import * as path from "path";
import { log } from "./Log.js";
import { glob } from "glob";
import * as htmlMinifier from "html-minifier-terser";
import CleanCss from "clean-css";
import * as terser from "terser";

/** Base class for various output formatters */
export class Output {
	private static _assetOutput = new Output();

	/** Copy files from the specified directory to the target directory under the current directory */
	static async copyAssetsAsync(dir: string, target: string) {
		log.verbose("*** Copying assets from " + dir);
		let found = glob.sync(dir + "/**/*", { nodir: true });
		if (!found.length) {
			log.info("WARNING: No asset input files in " + dir);
		}
		for (let file of found) {
			let isUp = path.relative("..", file).includes("..");
			if (isUp) throw Error("Aborted: will not read asset file " + file);
			log.verbose("Copying asset " + file);
			let content = readFileSync(file);
			let outFile = path.relative(dir, file);
			await this._assetOutput.writeFileAsync(target, outFile, content);
		}
	}

	/** Write safely to the specified file, creating a directory under the current directory if needed */
	protected async writeFileAsync(dir: string, fileName: string, content: any) {
		if (fileName.endsWith(".html")) {
			content = await htmlMinifier.minify(String(content), {
				collapseWhitespace: true,
			});
		}
		if (fileName.endsWith(".css")) {
			let css = new CleanCss().minify(String(content));
			if (css.errors.length) log.error(...css.errors);
			content = css.styles;
		}
		if (fileName.endsWith(".js")) {
			content = (await terser.minify(String(content), {})).code;
		}
		let dest = path.resolve(dir, fileName);
		dir = path.dirname(dest);
		let isUp = path.relative(".", dest).includes("..");
		if (isUp) throw Error("Aborted: will not write to file " + dest);
		if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
			log.verbose("(Creating directory " + dir + ")");
			mkdirSync(dir, { recursive: true });
		}
		let lc = dest.toLowerCase();
		if (this._written.has(lc)) {
			log.error("Overwriting file: " + dest);
		} else {
			log.verbose("Writing file " + dest);
		}
		this._written.add(lc);
		writeFileSync(dest, content);
	}

	private _written = new Set<string>();
}
