import { glob } from "glob";
import { readFileSync } from "node:fs";
import { DocBuilder } from "./DocBuilder.js";
import { DocItem } from "./DocItem.js";

export class SourceDocBuilder extends DocBuilder {
	static fromSource(inputGlob: string, codeLang: string) {
		let result = new SourceDocBuilder();
		let files = glob.sync(inputGlob);
		for (let file of files) {
			let sourceInput = readFileSync(file, "utf8");
			result.addSourceItems(file, sourceInput, codeLang);
		}
		return result;
	}

	addSourceItems(fileName: string, sourceInput: string, codeLang: string) {
		let lines = sourceInput.split("\n");
		let docId: string | undefined;
		let docLines: string[] = [];
		let docIndent = "";
		for (let line of lines) {
			line = line.replace(/\t/g, "  ");
			let startMatch = line.match(/@doc-start\s+(\S+)/);
			if (startMatch) {
				if (docId) this.warn("Missing @doc-end for", docId, "in", fileName);
				docId = startMatch[1]!;
				docLines.length = 0;
				docIndent = line.replace(/\S.*/, "");
			} else if (docId && line.indexOf("@doc-end") >= 0) {
				let docItem = new DocItem(
					docId,
					{ input_path: fileName },
					"```" + codeLang + "\n" + docLines.join("\n") + "\n```",
				);
				this.addItem(docItem);
				docId = undefined;
			} else if (docId && line.indexOf("@doc-ignore") < 0) {
				if (line.startsWith(docIndent)) {
					line = line.slice(docIndent.length);
				}
				docLines.push(line);
			}
		}
	}
}
