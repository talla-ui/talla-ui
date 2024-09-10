import { LazyString, StringConvertible } from "../base/index.js";

/**
 * A class that represents an application error, including a localizable message
 * - AppException classes should be created using the static {@link AppException.type()} factory method, which stores the error name and message format to be used by the new constructor.
 *
 * @online_docs Refer to the online documentation for more information on error handling and logging.
 * @docgen {hideconstructor}
 */
export class AppException extends Error {
	/**
	 * Creates a new AppException class with the provided error name and message format string
	 *
	 * @param name The error name, which should be unique to the type of application error
	 * @param format The format string that will be used to generate the error message, using constructor argument(s) as values for placeholders
	 * @returns A new AppException class, which itself can be instantiated using the `new` keyword.
	 *
	 * @example
	 * // Create a new error class and use it:
	 * const ValidationError = AppException.type(
	 *   "ValidationError", "Validation failed: %s");
	 *
	 * try {
	 *   throw new ValidationError("abc")
	 * } catch (err) {
	 *   if (err instanceof ValidationError) {
	 *     err.message // => "Validation failed: abc"
	 *     err.name // => "ValidationError"
	 *   }
	 * }
	 */
	static type(
		name: string,
		format: StringConvertible,
	): { new (...args: any[]): AppException } {
		let message = new LazyString(() => String(format));
		return class AppExceptionType extends this {
			constructor(...args: any[]) {
				super();

				// set name and message according to (static) arguments
				this.data = args;
				this.name = name;
				this.message = message
					.translate()
					.format(...args)
					.toString();

				// scan arguments for 'cause' property
				for (let arg of args) {
					if (arg && arg.cause instanceof Error) {
						(this as any).cause = arg.cause;
					}
				}
			}
		};
	}

	/** The name passed to the {@link AppException.type()} call */
	declare name: string;

	/** The error message, formatted using the format string passed to the {@link AppException.type()} call, and constructor arguments */
	declare message: string;

	/** The arguments passed to the AppException constructor */
	declare data: any[];
}
