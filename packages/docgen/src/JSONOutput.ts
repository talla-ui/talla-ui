import { DocsIndex } from "./DocsIndex.js";
import { log } from "./Log.js";
import { Output } from "./Output.js";

/** Encapsulation of the JSON output formatter */
export class JSONOutput extends Output {
	/** Initializes JSON output using the provided index */
	constructor(public docsIndex: DocsIndex) {
		super();
		if (docsIndex.config.output?.json) {
			this.fileName = docsIndex.config.output.json.file;
			this.pretty = !!docsIndex.config.output.json.pretty;
		}
	}

	/** The output file name, if any */
	fileName?: string;

	/** True if output should be pretty-printed using spaces */
	pretty?: boolean;

	/** Writes output to the JSON file, if any was specified in the config */
	async writeAsync() {
		if (!this.fileName) return;

		// generate a flat list and write all data
		log.verbose("Creating JSON file");
		let text = JSON.stringify(
			[...this.docsIndex.entries.values()],
			undefined,
			this.pretty ? "  " : undefined,
		);
		await this.writeFileAsync(".", this.fileName, text);
	}
}
