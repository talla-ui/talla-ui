import { GlobalEmitter, LazyString, ManagedEvent } from "../base/index.js";
import { AppException } from "./AppException.js";

/** Helper function that puts together event data for a log message */
function makeEventData(
	severity: number,
	message: unknown,
): LogWriter.LogMessageData {
	let data: any[] | undefined;
	let error: Error | undefined;
	if (message instanceof Error) {
		error = message;
		message = error.message || error.name || "Error";
		data = (error instanceof AppException && error.data) || [];
		data.push({
			error: true,
			name: error.name,
			stack: error.stack,
			cause: (error as any).cause ? (error as any).cause.stack : undefined,
		});
	} else if (message instanceof LazyString) {
		data = message.getFormatArgs();
	}
	return {
		severity,
		message: String(message),
		error,
		data: data || [],
	};
}

/**
 * A class that handles log messages, part of the global application context
 *
 * @description
 * An instance of this class is available as {@link GlobalContext.log app.log}. You can use methods on that instance to write messages to the application log.
 *
 * Different methods are available for different 'severity' levels, ranging from `verbose` (level 0) to `fatal` (level 5).
 *
 * Log messages are emitted as events on {@link LogWriter.emitter}. A listener can be added there, or using {@link GlobalContext.addLogHandler app.addLogHandler()} to add a log 'sink' for a minimum severity level. If no listeners have been added, log messages are written to the console.
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

	/** An event emitter for all log messages, emits events of type {@link LogWriter.LogMessageEvent} */
	emitter = new GlobalEmitter<LogWriter.LogMessageEvent>();

	/** Private implementation to emit a log message event, or write to the console */
	private _write(severity: number, message: unknown) {
		let data = makeEventData(severity, message);
		if (this.emitter.isObserved()) {
			this.emitter.emit("LogMessage", data);
		} else if (severity >= 4) {
			console.error(message);
			if (data.data.length) console.log(...data.data);
		} else {
			data.data.length
				? console.log(data.message, data.data)
				: console.log(data.message);
		}
	}
}

export namespace LogWriter {
	/**
	 * The data structure contained by each {@link LogMessageEvent}
	 *
	 * @description
	 * Each log message written by {@link LogWriter} is emitted as an event on {@link LogWriter.emitter}. The data contained by the event contains the following properties:
	 * - `message` — A string representation of the log message.
	 * - `error` — The original error that was logged, if any.
	 * - `data` — Additional data, such as error details or format placeholder values.
	 * - `severity` — A number indicating the severity level (0–5).
	 */
	export type LogMessageData = Readonly<{
		message: string;
		error?: Error;
		data: any[];
		severity: number;
	}>;

	/**
	 * An event that's emitted by the application log writer for each log message
	 */
	export type LogMessageEvent = ManagedEvent<
		GlobalEmitter<LogMessageEvent>,
		LogMessageData,
		"LogMessage"
	>;
}
