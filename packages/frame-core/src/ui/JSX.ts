import { err, ERROR } from "../errors.js";
import {
	Binding,
	LazyString,
	strf,
	StringFormatBinding,
	View,
	ViewClass,
	ViewComposite,
} from "../index.js";

/** Helper function to flatten component arrays */
function flatten(a: any[]): any {
	let result: any[] = [];
	a.forEach((it) => {
		Array.isArray(it) ? result.push(...flatten(it)) : result.push(it);
	});
	return result;
}

/**
 * JSX support for UI components
 *
 * @summary This function provides support for JSX elements, when used in `.jsx` or `.tsx` files. it's used by the TypeScript compiler (or any other JSX compiler) to convert JSX elements to function calls.
 *
 * @note This function is also available as `ui.JSX`. For TypeScript projects, set the `jsxFactory` configuration to `ui.JSX`, and import `ui` in each `.tsx` file to allow the compiler to access it.
 *
 * **Bindings in label text** — Several JSX elements accept text content, namely `<ui.label>`, `<ui.button>`, `<ui.toggle>`, and `<ui.textfield>` (for placeholder text). This text is assigned to the `text`, `label`, or `placeholder` properties, and may consist of plain text and bindings (i.e. the result of {@link bound()} functions, refer to {@link Binding} for more information).
 *
 * As a shortcut within JSX text content, bindings may also be specified directly using `%[...]` syntax, which are used with {@link bound.strf()}. In addition, this syntax may be used with aliases and default string values:
 *
 * - `Foo: %[foo]` — inserts a binding for `foo`
 * - `Foo: %[foo:.2f]` — inserts a binding for `foo`, and uses {@link bound.strf()} to format the bound value as a number with 2 decimals
 * - `Foo: %[foo=somePropertyName]` — inserts a binding for `somePropertyName`, but allows for localization of `Foo: %[foo]` instead
 * - `Foo: %[foo=another.propertyName:.2f]` — inserts a bindings for `another.propertyName`, but allows for localization of `Foo: %[foo:.2f]` instead.
 * - `Foo: %[foo=some.numProp:?||None]` — inserts a binding for `some.numProp`, but allows for localization of `Foo: %[foo:?||None]` instead (and inserts `None` if the value for `some.numProp` is undefined or an empty string).
 */
export function JSX(f: any, presets: any, ...rest: any[]): ViewClass {
	rest = flatten(rest);

	// use string content as 'text' property, if any
	let fmt = "";
	let nBindings = 0;
	let hasText: boolean | undefined;
	let bindings: any = {};
	let components: any[] = [];
	for (let r of rest) {
		if (r instanceof LazyString) {
			r = String(r.getOriginal());
		}
		if (typeof r === "string") {
			fmt += r.replace(
				/\%\[([^\]\:\s\=]+)(?:\=([^\]\:\s]*))?/g,
				(s, id, path) => {
					if (!bindings[id]) {
						bindings[id] = path || id;
						nBindings++;
					}
					return "%[" + id;
				},
			);
			hasText = true;
		} else if (r instanceof Binding) {
			bindings[nBindings] = r;
			fmt += "%[" + nBindings + "]";
			nBindings++;
		} else {
			components.push(r);
		}
	}

	// merge different types of content
	let merged = presets ? { ...presets } : {};
	if (fmt) {
		if (!nBindings) {
			// content is only text
			merged.text = strf(fmt);
		} else {
			if (!hasText && nBindings === 1) {
				// content is only one binding
				merged.text = bindings[0];
			} else {
				// content is mixed text and bindings
				merged.text = new StringFormatBinding(fmt, bindings);
			}
		}
	}

	// invoke function with merged presets and content
	if (typeof f !== "function") throw err(ERROR.JSX_InvalidTag, String(f));
	if (f.prototype instanceof ViewComposite) {
		return class extends f {
			constructor() {
				super(merged, ...components);
			}
		} as any;
	} else if (f.prototype instanceof View) {
		throw err(ERROR.JSX_InvalidTag, f.name);
	}
	return f(merged, ...components);
}

export namespace JSX {
	/** TypeScript JSX typing information */
	export namespace JSX {
		/**
		 * Type definition for intrinsic elements (used by TypeScript compiler)
		 * - Refer to {@link JSX} for more information.
		 */
		export type IntrinsicElements = {};

		/**
		 * Type definition for the result of a JSX call (used by TypeScript compiler)
		 * - Refer to {@link JSX} for more information.
		 */
		export type Element = ViewClass;
	}
}
