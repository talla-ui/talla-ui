import type { I18nProvider } from "./I18nProvider.js";

/** Cache index; incremented by invalidateCache() */
let _cacheIdx = 0;

/** Current I18n provider */
let _i18n: I18nProvider | undefined;

/** Current error handler */
let _errorHandler: (error: unknown) => void = () => {};

/** Current decimal separator, changed when setting I18n provider */
let _decimalSeparator = ".";

/**
 * String type or object that has a toString method
 *
 * @description
 * This type is often used where an argument is expected that can be _converted_ to a string (i.e. using `String(...)`), hence doesn't necessarily need to be a `string` type itself. This includes strings and numbers, but also all objects that have a `toString` method — notably, object {@link LazyString} objects, the result of {@link strf()}.
 *
 * @see {@link LazyString}
 * @see {@link strf}
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
 * useString(strf("%.2f", 123));
 */
export type StringConvertible = string | { toString(): string };
export namespace StringConvertible {
	/**
	 * The empty string, typed as {@link StringConvertible}
	 * - This constant can be used in place of an empty string, forcing a property type to `StringConvertible`, e.g. for use with {@link UIComponent.define()}.
	 */
	export const EMPTY: StringConvertible = "";
}

/** Better toString method */
function _stringify(s: any) {
	switch (typeof s) {
		case "object":
			if (s.toString === Object.prototype.toString) {
				_errorHandler(Error("Invalid format value"));
				return "???";
			}
			if (
				s.toString === Array.prototype.toString &&
				s.map === Array.prototype.map
			) {
				return (s as any[])
					.map((s) => (s != null && String(s)) || "")
					.join(", ");
			}
			break;
		case "number":
			if (isNaN(s)) return "";
			break;
	}
	return String(s ?? "");
}

/**
 * Returns a (lazily) formatted string incorporating the provided values
 *
 * @summary This function creates a new instance of {@link LazyString} with the specified format string. When converted to a string, the text is translated, formatted (if arguments are provided), and cached using the following methods:
 * - {@link LazyString.translate()}
 * - {@link LazyString.format()}
 * - {@link LazyString.cache()}
 *
 * For format placeholder options and features such as pluralization, refer to the {@link LazyString.format format()} method.
 *
 * @param format The format string, which may include placeholders for dynamically formatted values; **or** an array passed by a template literal source
 * @param values Any number of values to include in the result; if no values are provided, the result is a {@link LazyString} instance that can be formatted later
 * @returns An instance of {@link LazyString}.
 *
 * @example
 * // Format a string including a single number:
 * let balance = 20.5;
 * let s = strf("Your balance: $%.2f", balance);
 * String(s) // => "Your balance: $20.50"
 *
 * @example
 * // Format a string including property values:
 * let s = strf("Hello, %[user]!", { user: "human" });
 * String(s) // => "Hello, human!"
 *
 * @example
 * // Use template literal notation (useful only with i18n):
 * let a = "world";
 * let s = strf`Hello, ${a}!`;
 * String(s) // => "Hello, world!"
 */
export function strf(
	format: StringConvertible | StringConvertible[],
	...values: any[]
) {
	// if invoked as template literal, convert to string
	if (Array.isArray(format)) format = format.join("%s");

	// check if already a LazyString, return directly if possible
	let result: LazyString;
	if (format instanceof LazyString) {
		if (!values.length) return format;
		result = format;
	} else {
		// translate first if not already a LazyString
		result = LazyString.prototype.translate.apply(format ?? "");
	}

	// format string if values are provided, then cache
	return values.length ? result.format(...values).cache() : result.cache();
}

/**
 * An object that encapsulates a string, evaluated only when needed
 *
 * @description
 * This class is primarily used for string formatting and localization, usually as the result of a call to {@link strf} or to process string-formatted bindings.
 *
 * @see {@link strf}
 * @see {@link $strf}
 */
export class LazyString extends String {
	/**
	 * Invalidates all string values cached by {@link LazyString.cache()}
	 * - This method is called automatically when the application I18n provider is changed (see {@link AppContext.i18n app.i18n}), so that all (localized) strings are re-evaluated when {@link LazyString.toString toString()} is called again on the same LazyString instance.
	 */
	static invalidateCache() {
		_cacheIdx++;
	}

	/**
	 * Sets the current I18n provider
	 * - This method is called automatically when the application I18n provider is changed (see {@link AppContext.i18n app.i18n}).
	 */
	static setI18nInterface(i18n?: I18nProvider) {
		_i18n = i18n;
		_decimalSeparator = String(i18n?.getAttributes().decimalSeparator || ".");
	}

	/**
	 * Sets the current error handler
	 * - This method is called automatically when the application initializes.
	 */
	static setErrorHandler(errorHandler: (error: unknown) => void) {
		_errorHandler = errorHandler;
	}

	/**
	 * Localizes a single value using the current I18n provider
	 * @summary This method calls {@link I18nProvider.format} on the current application I18n provider (see {@link AppContext.i18n app.i18n}), with a single value and format type.
	 *
	 * Typically, you don't need to call this method yourself. it's used automatically by {@link strf()}, {@link LazyString.format()}, and {@link Binding.local}.
	 * @param value The value to be localized
	 * @param type The format type, passed to {@link I18nProvider.format}
	 * @returns
	 */
	static local(value: any, ...type: string[]) {
		return _i18n ? String(_i18n.format(value, ...type)) : "???";
	}

	/**
	 * Creates a new lazily evaluated string instance
	 * - This method is used by {@link strf()}, {@link $strf()}, and other methods. Typically, you don't need to call this constructor yourself.
	 * @param get A function that returns the embedded string value
	 */
	constructor(get?: () => string) {
		super();
		if (get) this.toString = get;
	}

	/** Returns a string value, i.e. the result of evaluating the encapsulated string */
	declare toString: () => string;

	/** Returns the arguments that were (last) passed to `format`, or an empty array */
	getFormatArgs(): any[] {
		return this._formatArgs || [];
	}

	/** Returns the original (untranslated and unformatted) string or LazyString instance */
	getOriginal() {
		return this._orig;
	}

	/**
	 * Caches the result after evaluating it once
	 * - This method is called automatically by {@link strf()}.
	 * - The cache can be reset using {@link LazyString.invalidateCache()}, which is done automatically when changing the application I18n provider (see {@link AppContext.i18n app.i18n}).
	 * @returns A new LazyString instance.
	 */
	cache() {
		let cacheIdx = _cacheIdx;
		let result: string | undefined;
		let clone = new LazyString(() => {
			if (result != null && cacheIdx === _cacheIdx) return result;
			cacheIdx = _cacheIdx;
			return (result = String(this));
		});
		clone._orig = this._orig;
		clone._formatArgs = this._formatArgs;
		return clone;
	}

	/**
	 * Translates the string using the current I18n provider
	 * - This method is called automatically by {@link strf()}.
	 * - If no I18n provider (see {@link AppContext.i18n app.i18n}) is currently set, the current string value is used directly.
	 * - If the resulting string _starts with_ `##`, the translation marker and following space, OR optional description (between `:` characters) are removed: e.g. `##T_HELLO Hello, world` or `##T_HELLO:User greeting:Hello, world`. Spaces after the end of the description are not removed.
	 * @returns A new LazyString instance.
	 */
	translate() {
		let result = new LazyString(() =>
			(_i18n ? _i18n.getText(String(this)) : String(this)).replace(
				/^##[^ :]+(?: |\:[^:]*\:?|$)/,
				"",
			),
		);
		result._orig = this._orig || this;
		return result;
	}

	/**
	 * Replaces placeholders in the string with string-formatted values
	 *
	 * @summary This method provides the core functionality for {@link strf()} and {@link $strf()}. It inserts the provided list of values (or properties of a single object) into the format string, formatted in a specific way, as determined by the placeholder.
	 *
	 * Placeholders are compatible with C-style _sprintf_, e.g. %s, %+8i, %.5f, etc., as well as the following custom placeholders:
	 *
	 * - `%[property]` placeholders take a property from the _first_ argument which must be an object
	 * - `%[property:format]` placeholders take a property and apply the specified format, e.g. `%[foo:s]` for string formatting, `%[foo:.2f]` for a number formatted in the same way as `%.2f`, etc.
	 * - `#{a/b}`, `#{a/b/c}` for pluralization: select an option based on the quantity (a number) from the _first_ value in the parameter list (e.g. `strf("%i file#{/s}", n)`)
	 * - `#n${a/b}`, `#n${a/b/c}` to select an option based on a quantity that's passed as a different argument, at position _n_ (1-based index, e.g. `strf("User %s has %i message#2${/s}", userName, nMessages)`)
	 * - `%[property:plural|a|b]` for pluralization based on a property from the first argument
	 * - `%n` (non-standard) general-purpose number format, avoids some rounding issues and turns NaN into blank string
	 * - `%_` to insert nothing at all (blank string)
	 * - `%{uc}`, `%{lc}` to convert strings to uppercase or lowercase
	 * - `%{s|abc}` to insert a string, or `abc` if the string is empty or not defined
	 * - `%{?|a}` to insert string a if the value `== true`, otherwise a blank string
	 * - `%{?|a|b}` to insert one of `a` or `b`: the first option if the value `== true`, the second if not
	 * - `%{plural|...|...}` for pluralization, but with its own quantity value in the argument list
	 * - `%{local|...}` for i18n-formatted values; the type part(s) are variable, and will need to be implemented by the {@link I18nProvider.format()} method of the current i18n provider, e.g. `strf("Today is %{local|date}", new Date())`.
	 *
	 * **Using arguments within placeholders** — Asterisks (`*`) anywhere in a placeholder are replaced by the next value in the parameter list (_before_ the value being represented itself), e.g. in `strf("%.*f", precision, number)` and `strf("%{local|currency:*}", currency, number)`.
	 *
	 * **Decimal separator** — Floating point numbers are formatted using the decimal separator specified by the `decimalSeparator` attribute of the currently registered i18n interface, if any. Number grouping separators aren't supported, and if necessary numbers will need to be formatted using %{local|...}.
	 *
	 * **Argument positions** — Use position specifiers (i.e. `n$`) to change the order of parameters used, e.g. `strf("A is %i and B is %i, so %1$i + %2$i equals %i", i1, i2, i1 + i2)`. This is mostly helpful for translations where the position of words or numbers is different.
	 *
	 * @returns A new LazyString instance.
	 */
	format(...args: any[]) {
		let clone = new LazyString(() => {
			// get format string
			let str = String(this);

			// replace pluralization placeholders
			str = str.replace(
				/\#(?:(\d+)\$)?\{([^}]*)\}/g,
				_i18n
					? (s, pos, opts) =>
							_i18n!.getPlural(+args[pos ? pos - 1 : 0] || 0, opts.split("/"))
					: (s, pos, opts) =>
							opts.split("/")[args[pos ? pos - 1 : 0] == 1 ? 0 : 1],
			);

			// replace all value placeholders
			let idx = 0;
			return str.replace(
				/\%\[([^\[\]\:\s,]+)(?:\:([^\]]*))?\]|\%(?:(\d+)\$)?(\{[^\}]*\}|[-+*.0-9 ]*[%_a-zA-Z])/g,
				(s, prop, propfmt, param, fmt) => {
					if (prop) {
						if (!args[0]) return "";
						fmt = propfmt || "s";
						if (!idx) idx++;
					}
					if (fmt === "%") return "%";

					// get value from property or index
					let value = prop
						? args[0][prop]
						: param
							? args[param - 1]
							: args[idx++];

					// special case plain strings
					if (fmt === "s" && typeof value === "string") return value;

					// return formatted result as a string
					fmt = fmt.replace(/\*/g, () => String(args[idx++]));
					return LazyString.formatValue(fmt, value);
				},
			);
		});
		clone._orig = this._orig || this;
		clone._formatArgs = args;
		return clone;
	}

	private _orig?: StringConvertible;
	private _formatArgs?: any[];
}

export namespace LazyString {
	/** @internal Format given value according to spec (part after %-sign of sprintf formatter, e.g. s, 08i, {uc}, {local|date}) */
	export function formatValue(format: string, value: any): string {
		if (format[0] === "{") format = format.slice(1, -1);

		// parse formatting spec or use formatter function
		let match = format.match(/^([-0+ ]+)?(\d+)?(\.\d+)?([%diunNfFeEgGxXsc])$/);
		if (!match) {
			// use special format
			let split = format.split("|");
			switch (split[0]!) {
				case "local":
					return LazyString.local.call(undefined, value, ...split.splice(1));
				case "plural":
					return _i18n
						? String(_i18n.getPlural(value, split.splice(1)))
						: split[value == 1 ? 1 : 2] || "";
				case "s":
					return _stringify(value) || (split[1] ?? "");
				case "?":
					return value ? (split[1] ?? "") : (split[2] ?? "");
				case "uc":
					return _stringify(value ?? "").toUpperCase();
				case "lc":
					return _stringify(value ?? "").toLowerCase();
				case "_":
					return "";
				default:
					_errorHandler(Error("Invalid format type: " + format));
					return "???";
			}
		} else {
			let [, flags, width, dotprec, type] = match;
			if (type === "%") return "%";

			// parse flags, if any
			let leftAlign: boolean | undefined;
			let positivePrefix: string | undefined;
			let padPrefix: string | undefined;
			if (flags) {
				for (let f of flags) {
					if (f === "-") leftAlign = true;
					else if (f === "0") padPrefix = "0";
					else if (f === "+") positivePrefix = "+";
					else if (f === " ") positivePrefix = " ";
				}
			}

			// parse width and precision, if any
			let w = +width! || 0;
			let p = dotprec ? +dotprec.slice(1) || 0 : undefined;

			// format string
			let s: string;
			if (type === "c") {
				s = value == null ? "" : String.fromCharCode(+value);
				if (w > 0) s = _align(leftAlign, "", s, w, " ");
				return s;
			}
			if (type === "s") {
				s = _stringify(value);
				if (p! > 0) s = s.slice(0, p);
				if (w > 0) s = _align(leftAlign, "", s, w, " ");
				return s;
			}

			// format number
			let v = Math.abs(+value);
			let p6 = p ?? 6;
			switch (type) {
				case "d":
				case "i":
				case "u":
					s = String(Math.round(v) || 0);
					break;
				case "n":
				case "N":
					s = isNaN(v) ? "" : v.toFixed(p6);
					if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
					break;
				case "f":
				case "F":
					s = v.toFixed(p6);
					break;
				case "e":
				case "E":
					s = v.toExponential(p6);
					if (type === "E") s = s.toUpperCase();
					break;
				case "g":
				case "G":
					p = p6 || 1;
					s = Math.abs(+value)
						.toExponential(p - 1)
						.replace(/\.?0+e/, "e");
					let gExp = +s.split("e")[1]!;
					if (gExp >= -4 && gExp < p) {
						s = v.toFixed(p - gExp - 1);
						if (s.indexOf(".") >= 0) s = s.replace(/\.?0+$/, "");
					} else {
						s = v.toExponential(p - 1).replace(/\.?0+e/, "e");
						if (type === "G") s = s.toUpperCase();
					}
					break;
				case "x":
				case "X":
					s = (v || 0).toString(16);
					if (type === "X") s = s.toUpperCase();
					break;
			}
			return _alignFmtNum(
				s!,
				value < 0,
				w,
				leftAlign,
				positivePrefix,
				padPrefix,
			);
		}
	}

	/** Return a fully formatted string containing given number */
	function _alignFmtNum(
		s: string,
		neg: boolean,
		width: number,
		leftAlign?: boolean,
		positivePrefix?: string,
		padPrefix?: string,
	) {
		let sign = neg ? "-" : positivePrefix || "";
		if (leftAlign) return _align(true, sign, s, width);
		if (!padPrefix || !/^[\da-f]/.test(s)) padPrefix = " ";
		if (_decimalSeparator !== ".") {
			s = s.replace(".", _decimalSeparator);
		}
		return _align(false, sign, s, width, padPrefix);
	}

	/** Left- or right-align given text */
	function _align(
		alignLeft: boolean | undefined,
		sign: string,
		str: string,
		width: number,
		prefix?: string,
	) {
		if (alignLeft) {
			str = sign + str;
			if (str.length >= width) return str;
			for (let i = str.length; i < width; i++) str += " ";
		} else if (prefix) {
			if (str.length >= width) return sign + str;
			let frontSign = sign && prefix === "0" ? sign : "";
			if (!frontSign) str = sign + str;
			for (let i = str.length + frontSign.length; i < width; i++)
				str = prefix + str;
			str = frontSign + str;
		}
		return str;
	}
}
