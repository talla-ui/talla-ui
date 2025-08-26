/** Cache index; incremented by invalidateCache() */
let _cacheIdx = 1;

/** Current I18n provider, if set */
let _i18n: DeferredString.I18nProvider | undefined;

/** Current error handler */
let _errorHandler: (error: unknown) => void = (err) => {
	console.error(err);
};

/** Default precision for numbers */
const DEFAULT_PREC = 6;

/** Empty object used as default for args[0] */
const EMPTY_ARGS_OBJECT = Object.freeze({});

/**
 * String type or object that has a toString method
 *
 * @description
 * This type is often used where an argument is expected that can be _converted_ to a string (i.e. using `String(...)`), hence doesn't necessarily need to be a `string` type itself. This includes strings and numbers, but also all objects that have a `toString` method — notably, object {@link DeferredString} objects, the result of {@link fmt()}.
 *
 * @see {@link DeferredString}
 * @see {@link fmt}
 *
 * @example
 * // A function that uses a string
 * function useString(s: StringConvertible) {
 *   // ... do something with String(s) or use as string
 *   console.log("Foo: " + s);
 * }
 *
 * useString("abc");
 * useString(123);
 * useString(fmt("{:.2f}", 123));
 */
export type StringConvertible = string | { toString(): string };
export namespace StringConvertible {
	/**
	 * The empty string, typed as {@link StringConvertible}
	 * - This constant can be used in place of an empty string, forcing a property type to `StringConvertible`, e.g. for use with custom views.
	 */
	export const EMPTY: StringConvertible = "";
}

// Remember various prototype methods for the helper function below:
const OBJECT_TO_STRING = Object.prototype.toString;
const ARRAY_TO_STRING = Array.prototype.toString;
const ARRAY_MAP = Array.prototype.map;
const DATE_TO_STRING = Date.prototype.toString;

/**
 * Returns a (lazily) formatted string incorporating the provided values
 *
 * @param format The format string, which may include placeholders for dynamically formatted values; **or** an array passed by a template literal source
 * @param values Any number of values to include in the result; if no values are provided, the result is a {@link DeferredString} instance that can be formatted later
 * @returns An instance of {@link DeferredString}.
 *
 * @description
 * This function creates a new instance of {@link DeferredString} with the specified format string. When converted to a string, the text is translated, formatted, and cached (until the cache is invalidated, e.g. when the application I18n provider is changed).
 *
 * The syntax of placeholders is as follows:
 * - `{}`: inserts the value at the current position of the argument list.
 * - `{:f}`: inserts the value at the current position, formatted using the format `f` (see below).
 * - `{0}` or `{p}`: inserts the value at the position `0` (any number) in the argument list, OR a property `p` of the first argument as an object.
 * - `{0:f}` or `{p:f}`: inserts the value of argument `0` or property `p` as above, formatted using the format `f` (see below).
 * - `{#...}`: ignored (i.e. removed from the result). This can be used to insert a comment or a marker that may be used for translation.
 *
 * The following set of format specifiers can be used to format each value:
 * - `:s`: inserts the value as a string (default if the value is not a number).
 * - `:d`: inserts the value as a number (with at most 6 decimal places; default if the value is a number).
 * - `:.2d`: inserts the value as a number with at most 2 decimal places (or any number as specfied).
 * - `:.2f`: inserts the value as a fixed-point number, with 2 decimal places (or any number as specfied).
 * - `:i`: inserts the value as a rounded integer.
 * - `:x`: inserts the value as a hexadecimal number.
 * - `:X`: inserts the value as a hexadecimal number in uppercase.
 * - `:L...`: inserts the value as a localized string, using the current i18n provider and the type immediately following the `L` (e.g. `L`, `Ldate`, `Ltime`). The format string is split on `/` characters, with each part passed as a separate argument (e.g. `Ldate/short`).
 * - `:?/foo/bar`: inserts `foo` or `bar` if the value is equal to boolean true or false, respectively.
 * - `:+/foo/bar`: inserts one of the options, depending on the value and the current i18n pluralization rules; defaults to `foo` only if the value is 1, if no i18n provider is available.
 *
 * Within all format specifiers, additional placeholders such as `{0}` or `{p}` can be used to insert the value of another value from the argument list, or a property of the first argument as an object — e.g. for number of decimal places, or replacements passed to the `?` placeholder. Such nested placeholders cannot contain format specifiers themselves.
 *
 * @example
 * // Format a string including a single number:
 * let s = fmt("Package weight: {} kg", 75.5);
 * String(s) // => "Package weight: 75.5 kg"
 *
 * // Format a string including a single number:
 * let s = fmt("Package weight: {:.2f} kg", weight);
 * String(s) // => "Package weight: 75.50 kg"
 *
 * // Format a string with multiple values:
 * let s = fmt("Customer ID {}: {}", 123, "John Doe");
 * String(s) // => "Customer ID 123: John Doe"
 *
 * // or more explicitly:
 * let s = fmt("Customer ID {0}: {1}", 123, "John Doe");
 * String(s) // => "Customer ID 123: John Doe"
 *
 * // ...or using an object:
 * let s = fmt("Customer ID {id}: {name}", { id: 123, name: "John Doe" });
 * String(s) // => "Customer ID 123: John Doe"
 *
 * // Format a string with boolean check and pluralization:
 * let s = fmt("You have {:?/{0}/no} {0:+/message/messages}", 0);
 * String(s) // => "You have no messages"
 */
export function fmt(
	format: StringConvertible | StringConvertible[],
	...values: any[]
) {
	// if invoked as template literal, convert to string
	if (Array.isArray(format)) {
		format = format.join("{}");
	} else if (format instanceof DeferredString) {
		return values.length ? format.format(...values) : format;
	}

	// return new instance, keeping track of format and values
	return new DeferredString(format, values);
}

/**
 * An object that encapsulates a string, evaluated only when needed
 *
 * @description
 * This class is primarily used for string formatting and localization, usually as the result of a call to {@link fmt} or to process string-formatted bindings.
 *
 * Each instance encapsulates an input string, possibly with format placeholders. The string is translated if possible, and cached until the cache is invalidated (e.g. when the application I18n provider is changed).
 *
 * The {@link format()} method returns a new instance, where the input string is formatted with the provided values before caching.
 *
 * @see {@link fmt}
 * @see {@link bind.fmt}
 */
export class DeferredString extends String {
	/**
	 * Sets the current I18n provider
	 * - This method is called automatically by `app` when setting the application I18n provider, and doesn't need to be called directly. It invalidates the cached result of all {@link DeferredString} instances.
	 */
	static setI18nInterface(i18n?: DeferredString.I18nProvider) {
		_i18n = i18n;
		_cacheIdx++;
	}

	/**
	 * Sets the current error handler
	 * - This method is called automatically when the application initializes.
	 */
	static setErrorHandler(errorHandler: (error: unknown) => void) {
		_errorHandler = errorHandler;
	}

	/**
	 * Creates a new lazily evaluated string instance
	 * - This method is used by {@link fmt()}, {@link bind.fmt()}, and other methods. Typically, you don't need to call this constructor yourself.
	 * @param str The string to be encapsulated (and translated, formatted, and cached on demand)
	 * @param args The arguments that were (last) passed to `format`, or an empty array
	 */
	constructor(str: StringConvertible = "", args?: any[]) {
		super();
		this._in = str;
		this._fmtArgs = args;
	}

	/** Returns a string value, i.e. the result of evaluating the encapsulated string */
	override toString() {
		// return cached value if available
		if (this._cacheIdx === _cacheIdx) return this._out as string;

		// translate input string first, then format
		let result = DeferredString._format(
			String(_i18n ? _i18n.getText(String(this._in)) : this._in),
			this._fmtArgs || [],
		);

		// update cache and return result
		this._cacheIdx = _cacheIdx;
		return (this._out = result);
	}

	/**
	 * Returns a (lazily) formatted string incorporating the provided values
	 * @note This method is used internally by {@link fmt()}, {@link bind.fmt()}, and doesn't need to be called directly unless an existing instance needs to be formatted using new placeholder values.
	 * @summary This method captures the provided values, and returns a new instance that will result in the input string with the values inserted and formatted.
	 * @returns A new DeferredString instance.
	 */
	format(...args: any[]) {
		let clone = new DeferredString(this._in);
		clone._fmtArgs = args;
		return clone;
	}

	/** Returns the arguments that were (last) passed to `format`, or an empty array */
	getFormatArgs(): any[] {
		return this._fmtArgs || [];
	}

	/** Returns the original (untranslated and unformatted) string or DeferredString instance */
	getOriginal() {
		return this._in;
	}

	private _in?: StringConvertible;
	private _out?: StringConvertible;
	private _fmtArgs?: any[];
	private _cacheIdx?: number;
}

export namespace DeferredString {
	/**
	 * An interface that provides functionality for translating and formatting strings
	 * - This interface is used by {@link DeferredString} to translate and format strings. The application context provides an implementation of this interface as `app.i18n`.
	 */
	export interface I18nProvider {
		/**
		 * Translates the provided text to the current locale, if necessary
		 * @summary This method is called by {@link DeferredString} (the result of {@link fmt()}), for each string that should be translated.
		 * @note The input string may include formatting and plural form placeholders; translated text should include the same placeholders.
		 */
		getText(text: string): string;

		/**
		 * Chooses a plural form based on a specific quantity
		 * @summary This method is called by {@link DeferredString} (the result of {@link fmt()}), for each plural form placeholder in a format string.
		 * @param n The quantity on which to base the plural form
		 * @param forms The list of plural forms from which to choose
		 */
		getPlural(n: number, forms: string[]): string;

		/**
		 * Formats a value according to the specified type
		 * @summary This method is called by {@link DeferredString} (the result of {@link fmt()}), for each `L...` placeholder in a format string.
		 * @param value The value to be formatted
		 * @param type The type of formatting to be performed, possibly with further options
		 */
		format(value: any, ...type: string[]): string;

		/** Returns true if the current locale uses right-to-left script */
		isRTL(): boolean;
	}

	/** @internal Format string with given values */
	export function _format(str: StringConvertible, args: any[]) {
		let idx = 0;
		let obj = args[0] || EMPTY_ARGS_OBJECT;
		function getValue(pos?: string, prop?: string) {
			if (prop && !idx) idx++;
			return prop ? obj[prop] : args[pos ? (pos as any) : idx++];
		}
		return String(str).replace(
			// literal OR {   (pos) (  prop   )      :(   format    nested {...} )   }
			/(\{\{|\}\})|\{(?:(\d+)|([^\{\}:]+)?)(?:\:((?:[^\{\}]+|\{[^\{\}]*\})*))?\}/g,
			(_, literal, pos, prop, format: string = "") => {
				if (literal) return literal[0];
				let [f, ...opts] = format
					.split("/")
					.map((s) =>
						s.replace(/\{(?:(\d+)|([^\{\}:]+)?)\}/g, (_, pos, prop) =>
							_stringify(getValue(pos, prop)),
						),
					);
				return _formatValue(getValue(pos, prop), f!, opts);
			},
		);
	}

	/** Format given value according to fmt-style spec */
	function _formatValue(value: unknown, f: string, opts: string[]) {
		if (!f) return _stringify(value);
		let precision = -1;
		f = String(f).replace(/^\.(\d+)/, (_, p) => ((precision = +p), ""));
		if (f[0] === "#") return "";
		if (f[0] === "L") {
			// localized value, or use default string value for `L` only
			return _i18n
				? String(_i18n.format(value, f.slice(1), ...opts))
				: f[1]
					? "???"
					: _stringify(value);
		}
		switch (f) {
			case "i":
				// integer value
				return String(Math.round(Number(value)) || 0);
			case "f":
				// fixed-point number
				return (Number(value) || 0).toFixed(
					precision >= 0 ? precision : DEFAULT_PREC,
				);
			case "x":
				// hexadecimal number
				return (Math.trunc(value as any) || 0).toString(16);
			case "X":
				// hexadecimal number in uppercase
				return (Math.trunc(value as any) || 0).toString(16).toUpperCase();
			case "?":
				// boolean value
				return (value ? opts[0] : opts[1]) || "";
			case "+":
				// plural value, or use default rule
				return _i18n
					? _i18n.getPlural(Number(value), opts)
					: opts[value == 1 ? 0 : 1] || "";
			case "d":
			case "g":
			case "G":
			case "e":
			case "E":
				// number value, and backwards compat; fall-through below
				value = parseFloat(value as any);
			default:
				// case "s":
				// case "d":
				// any other format, just stringify
				return _stringify(value, precision);
		}
	}

	/** Better toString method */
	function _stringify(v: any, p?: number) {
		switch (typeof v) {
			case "object":
				if (v == null) return "";
				if (v.toString === OBJECT_TO_STRING) {
					_errorHandler(Error("Invalid format value"));
					return "???";
				}
				if (v.toString === ARRAY_TO_STRING && v.map === ARRAY_MAP) {
					return (v as any[])
						.map((s) => (s != null && String(s)) || "")
						.join(", ");
				}
				if (v.toString === DATE_TO_STRING) {
					return v.toLocaleString();
				}
				break;
			case "number":
				let n = Number(v);
				if (isNaN(n)) return "";
				if (n === 0) return "0";
				return n.toFixed(p! >= 0 ? p : DEFAULT_PREC).replace(/\.?0+$/, "");
		}
		return String(v ?? "");
	}
}
