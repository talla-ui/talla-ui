import { LazyString } from "../base/index.js";
import { safeCall } from "../errors.js";
import { AppException } from "./AppException.js";

/** Helper function that puts together event data for a log message */
function makeEventData(
	level: number,
	source: unknown,
): LogWriter.LogMessageData {
	let data: any[];
	let message: string;
	let error: Error | undefined;
	if (source instanceof Error) {
		error = source;
		message = String(error.message || error.name || "Error");
		data = (error instanceof AppException && error.data) || [];
		data.push({
			error: true,
			name: error.name,
			stack: error.stack,
			cause: (error as any).cause ? (error as any).cause.stack : undefined,
		});
	} else {
		message = String(source);
		data = source instanceof LazyString ? source.getFormatArgs() : [];
	}
	return { message, level, error, data };
}

/**
 * A class that handles log messages, part of the global application context
 *
 * @description
 * An instance of this class is available as {@link GlobalContext.log app.log}. You can use methods on that instance to write messages to the application log.
 *
 * Different methods are available for different severity levels, ranging from `verbose` (level 0) to `fatal` (level 5).
 *
 * By default, log messages are written to the console. You can add custom log sink handlers to handle log messages in other ways, such as sending them to a server or writing them to a file.
 *
 * @online_docs Refer to the Desk website for more information on error handling and logging.
 */
export class LogWriter {
	/**
	 * Writes a log message with severity 'verbose' (0)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.verbose(strf("Logged in as %[name]", userData));
	 */
	verbose(message: unknown) {
		this._write(0, message);
	}

	/**
	 * Writes a log message with severity 'debug' (1)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.debug(strf("Logged in as %[name]", userData));
	 */
	debug(message: unknown) {
		this._write(1, message);
	}

	/**
	 * Writes a log message with severity 'information' (2)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.information(strf("Logged in as %[name]", userData));
	 */
	information(message: unknown) {
		this._write(2, message);
	}

	/**
	 * Writes a log message with severity 'warning' (3)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.warning(strf("User not found: %[name]", userData));
	 */
	warning(message: unknown) {
		this._write(3, message);
	}

	/**
	 * Writes a log message with severity 'error' (4)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.error(strf("User not found: %[name]", userData));
	 *
	 * @example
	 * // Catch an error and log it
	 * try {
	 *   doSomethingDangerous();
	 * } catch (err) {
	 *   app.log.error(err);
	 * }
	 */
	error(message: unknown) {
		this._write(4, message);
	}

	/**
	 * Writes a log message with severity 'fatal' (5)
	 * - The specified message may be a string, a {@link LazyString} (the result of {@link strf()}), an Error instance, or any other value that can be converted to a string.
	 * - For {@link LazyString} and {@link AppException} messages, placeholder values are included in the message data so that they can be stored separately in a structured log.
	 * @example
	 * // Write a formatted log message
	 * app.log.fatal(strf("User not found: %[name]", userData));
	 *
	 * @example
	 * // Catch an error and log it
	 * try {
	 *   doSomethingDangerous();
	 * } catch (err) {
	 *   app.log.fatal(err);
	 * }
	 */
	fatal(message: unknown) {
		this._write(5, message);
	}

	/**
	 * Adds a log sink handler for this log writer
	 * @param minLevel The minimum log level for which messages are passed to the handler function
	 * @param f A handler function, which should accept a single {@link LogWriter.LogMessageData} argument
	 */
	addHandler(minLevel: number, f: (message: LogWriter.LogMessageData) => void) {
		this._sink.push((m) => {
			if (m.level >= minLevel) safeCall(() => f(m));
		});
	}

	/** Private implementation to emit a log message event, or write to the console */
	private _write(level: number, message: unknown) {
		let data = makeEventData(level, message);
		if (this._sink.length) {
			for (let s of this._sink) s(data);
		} else if (level >= 4) {
			console.error(message);
			if (data.data.length) console.log(...data.data);
		} else {
			data.data.length
				? console.log(data.message, data.data)
				: console.log(data.message);
		}
	}

	/** A list of log sink handlers, if any */
	private _sink: Array<(data: LogWriter.LogMessageData) => void> = [];
}

export namespace LogWriter {
	/**
	 * An object containing log message data, as sent to log sink handlers
	 *
	 * @description
	 * Each log message written by {@link LogWriter} is handled by one or more log sink handlers. Each log message is represented by an object with the following properties:
	 * - `message` — A string representation of the log message.
	 * - `error` — The original error that was logged, if any.
	 * - `data` — Additional data, such as error details or format placeholder values.
	 * - `level` — A number indicating the severity level (0–5).
	 */
	export type LogMessageData = Readonly<{
		message: string;
		error?: Error;
		data: any[];
		level: number;
	}>;
}
