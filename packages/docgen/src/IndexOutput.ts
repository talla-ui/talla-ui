import { DocsIndex, safeId } from "./DocsIndex.js";
import { log } from "./Log.js";
import { Output } from "./Output.js";

/** Encapsulation of the search index output formatter */
export class IndexOutput extends Output {
	/** Initializes search index output using the provided docs index */
	constructor(public docsIndex: DocsIndex) {
		super();
		if (docsIndex.config.output?.index) {
			this.fileName = docsIndex.config.output.index.file;
			this.urlPrefix = docsIndex.config.output.index.urlPrefix || "";
		}
	}

	/** The output file name, if any */
	fileName?: string;

	/** The prefix to add to each URL ID, i.e. root path of indexed pages */
	urlPrefix = "";

	/** Writes output to the index JSON file, if any was specified in the config */
	async writeAsync() {
		if (!this.fileName) return;

		// generate a flat index and write all data
		log.verbose("Creating search index file");
		let text = JSON.stringify(
			[...this.docsIndex.entries.values()].map((doc) => [
				doc.id,
				this.urlPrefix + safeId(doc.id, "", doc.folder),
				doc.title,
				doc.abstract,
			]),
		);
		this.writeFileAsync(".", this.fileName, text);
	}
}
