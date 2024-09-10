import * as path from "path";
import * as yaml from "js-yaml";
import { Entry, EntryType } from "./Entry.js";

/** A class that encapsulates a file reader for plain markdown files */
export class MarkdownReader {
	/** Creates a new reader for the specified file */
	constructor(
		public fileName: string,
		public fileContent: string,
	) {
		let id = path.basename(fileName).replace(/(\.md|\.txt)$/, "");
		this.entry = {
			location: fileName,
			id,
			name: id,
			title: id,
			type: EntryType.Document,
		};
	}

	/** Entry data */
	entry: Entry;

	/** Reads the source file and updates the entry data */
	read() {
		let text = this.fileContent.trimStart();
		if (text.startsWith("---\n")) {
			let yamlText = text.slice(4).replace(/\n---\n.*/s, "");
			text = text.slice(yamlText.length + 8).trimStart();
			let props = yaml.load(yamlText);
			Object.assign(this.entry, props);
		}
		if (text.startsWith("# ")) {
			let title = (this.entry.title = text.slice(2, text.indexOf("\n")));
			text = text.slice(title.length + 2).trimStart();
		}
		this.entry.content = text;
		return this.entry;
	}
}
