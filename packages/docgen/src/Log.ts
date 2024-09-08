const verbose = process.argv.some((p) => p === "-v" || p === "--verbose");

/** Encapsulation of the output log */
export class Log {
	/** Writes a message to the log, if the program is running with verbose logging enabled */
	verbose(...msg: any[]) {
		if (verbose) console.log(...msg);
	}

	/** Writes a message to the log */
	info(...msg: any[]) {
		console.log(...msg);
	}

	/**
	 * Writes an error message to the log, and remembers the error status
	 * @see hasError();
	 */
	error(...msg: any[]) {
		console.log(...msg);
		this._error = true;
	}

	/** Returns true if any error messages were written to the log */
	hasErrors() {
		return !!this._error;
	}

	_error = false;
}

/** A singleton instance of the output log class */
export const log = new Log();
