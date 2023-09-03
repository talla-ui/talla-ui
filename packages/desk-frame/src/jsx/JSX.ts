import { err, ERROR } from "../errors.js";
import { Binding, StringFormatBinding, strf, ViewClass } from "../index.js";
import * as intrinsics from "./intrinsics.js";

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
 * @summary This function provides support for intrinsic JSX elements, when used in `.jsx` or `.tsx` files. it's used by the TypeScript compiler (or any other JSX compiler) to convert JSX elements to function calls.
 *
 * @note For TypeScript projects, set the `jsxFactory` configuration to `JSX`, and import this function in each `.tsx` file to allow the compiler to access it (see example).
 *
 * **Bindings in label text** — Several JSX elements accept text content, namely `<label>`, `<button>` (and all their variants), `<toggle>`, and `<textfield>` (for placeholder text). This text is assigned to the `text`, `label`, or `placeholder` properties, and may consist of plain text and bindings (i.e. the result of {@link bound()} functions, refer to {@link Binding} for more information).
 *
 * As a shortcut within JSX text content, bindings may also be specified directly using `%[...]` syntax, which are used with {@link bound.strf()}. In addition, this syntax may be used with aliases and default string values:
 *
 * - `Foo: %[foo]` — inserts a binding for `foo`
 * - `Foo: %[foo:.2f]` — inserts a binding for `foo`, and uses {@link bound.strf()} to format the bound value as a number with 2 decimals
 * - `Foo: %[foo=somePropertyName]` — inserts a binding for `somePropertyName`, but allows for localization of `Foo: %[foo]` instead
 * - `Foo: %[foo=another.propertyName:.2f]` — inserts a bindings for `another.propertyName`, but allows for localization of `Foo: %[foo:.2f]` instead.
 * - `Foo: %[foo=some.numProp:?||None]` — inserts a binding for `some.numProp`, but allows for localization of `Foo: %[foo:?||None]` instead (and inserts `None` if the value for `some.numProp` is undefined or an empty string).
 *
 * **Elements**
 *
 * |Element |Class
 * |:-------|:-----|
 * |`<cell>` |{@link UICell}
 * |`<form>` |{@link UIForm}
 * |`<row>` |{@link UIRow}
 * |`<centerrow>` |{@link UICenterRow}
 * |`<oppositerow>` |{@link UIOppositeRow}
 * |`<column>` |{@link UIColumn}
 * |`<scrollcontainer>` |{@link UIScrollContainer}
 * |`<animatedcell>` |{@link UIAnimatedCell}
 * |`<button>` |{@link UIButton}
 * |`<iconbutton>` |{@link UIIconButton}
 * |`<linkbutton>` |{@link UILinkButton}
 * |`<outlinebutton>` |{@link UIOutlineButton}
 * |`<borderlessbutton>` |{@link UIBorderlessButton}
 * |`<primarybutton>` |{@link UIPrimaryButton}
 * |`<label>` |{@link UILabel}
 * |`<closelabel>` |{@link UICloseLabel}
 * |`<expandedlabel>` |{@link UIExpandedLabel}
 * |`<p>` |{@link UIParagraph}
 * |`<h1>` |{@link UIHeading1}
 * |`<h2>` |{@link UIHeading2}
 * |`<h3>` |{@link UIHeading3}
 * |`<textfield>` |{@link UITextField}
 * |`<borderlesstextfield>` |{@link UIBorderlessTextField}
 * |`<img>` |{@link UIImage}
 * |`<toggle>` |{@link UIToggle}
 * |`<separator>` |{@link UISeparator}
 * |`<spacer>` |{@link UISpacer}
 * |`<conditional>` |{@link UIConditional}
 * |`<formcontext>` |{@link UIFormController}
 * |`<list>` |{@link UIList}
 * |`<selection>` |{@link UISelectionController}
 * |`<style>` |{@link UIStyleController}
 * |`<animation>` |{@link UIAnimationController}
 * |`<render>` |{@link UIViewRenderer}
 *
 * @example
 * // example.tsx
 * import { JSX } from "desk-frame";
 *
 * export default (
 *   <cell background={UIColor.Background}>
 *     <label>Hello, world!</label>
 *     <label>Today is %[weekDay]</label>
 *     <primarybutton onClick="DoSomething">
 *       Continue
 *     </primarybutton>
 *   </cell>
 * );
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
		if (typeof r === "string") {
			fmt += r.replace(
				/\%\[([^\]\:\s\=]+)(?:\=([^\]\:\s]*))?/g,
				(s, id, path) => {
					if (!bindings[id]) {
						bindings[id] = path || id;
						nBindings++;
					}
					return "%[" + id;
				}
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

	// use intrinsic element if string passed in
	if (typeof f === "string") {
		let C = JSX.intrinsicTags[f];
		if (!C) throw err(ERROR.JSX_InvalidTag, f);
		f = C;
	}

	// invoke function, or static method
	f = typeof f.with === "function" ? f.with.bind(f) : f;
	if (typeof f !== "function") throw err(ERROR.JSX_InvalidTag);
	return f(merged, ...components);
}

export namespace JSX {
	/** TypeScript JSX typing information */
	export namespace JSX {
		/**
		 * Type definition for all intrinsic elements
		 * - Refer to {@link JSX} for more information.
		 */
		export type IntrinsicElements = intrinsics.JSX.JSX.IntrinsicElements;

		/**
		 * Type definition for the result of a JSX call
		 * - Refer to {@link JSX} for more information.
		 */
		export type Element = ViewClass;
	}

	/**
	 * References to JSX factory functions for all intrinsic tags
	 * - Refer to {@link JSX} for more information.
	 */
	export const intrinsicTags: { [tag: string]: { with: Function } } =
		intrinsics.tags;
}
