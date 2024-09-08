// NOTE: samples are read from source files.
// Sample code has an ID which can be used to insert the code into docs text.
// Samples start _after_ a line with @doc-start (e.g. in a comment),
// and end _before_ a line with @doc-end.
// All indentation that was on the start line, is removed from next lines.

/** Sample data read from a source file */
export type CodeSample = {
	id: string;
	file: string;
	code: string;
};

/** A class that encapsulates a samples source file reader */
export class SamplesReader {
	/** Creates a new reader for the specified file */
	constructor(
		public fileName: string,
		public fileContent: string,
	) {
		// nothing here
	}

	/** Reads the source file and returns a list of samples */
	readSamples() {
		let results: CodeSample[] = [];
		let current: CodeSample | undefined;
		let indent = "";
		for (let line of this.fileContent.split(/\n/)) {
			let match = line.match(/^(\s*).*@doc-start\s+(\S+)/);
			if (match && match[2]) {
				// add a sample with this ID
				current = { id: match[2], file: this.fileName, code: "" };
				results.push(current);
				indent = match[1] || "";
				continue;
			}
			if (/@doc-end/.test(line)) {
				// stop reading the current sample, if any
				current = undefined;
				continue;
			}
			if (current) {
				// add line to the current sample
				if (line.startsWith(indent)) line = line.slice(indent.length);
				current.code += (current.code ? "\n" : "") + line;
			}
		}
		return results;
	}
}
