import { err, ERROR } from "../errors.js";
import {
	Binding,
	LazyString,
	strf,
	StringFormatBinding,
	ui,
	View,
	ViewBuilder,
	UIComponent,
} from "../index.js";

/** Tag names with `ui` function names that are different */
const tagNames: any = {
	animatedcell: "animatedCell",
	textfield: "textField",
	render: "renderView",
};

/** Helper function to flatten arrays */
function flatten(a: any[]): any {
	let result: any[] = [];
	a.forEach((it) => {
		Array.isArray(it) ? result.push(...flatten(it)) : result.push(it);
	});
	return result;
}

/** @internal JSX implementation */
export function jsx(tag: any, presets: any, ...rest: any[]): ViewBuilder {
	rest = flatten(rest);

	// use string content as 'text' property, if any
	let fmt = "";
	let nBindings = 0;
	let hasText: boolean | undefined;
	let bindings: { [id: string]: Binding } = {};
	let views: ViewBuilder[] = [];
	for (let r of rest) {
		if (r instanceof LazyString) {
			r = String(r.getOriginal());
		}
		if (r instanceof Binding) {
			bindings[nBindings] = r;
			fmt += "%[" + nBindings + "]";
			nBindings++;
		} else if (r instanceof ViewBuilder) {
			views.push(r);
		} else {
			fmt += String(r).replace(
				/\%\[([^\]\:\s\=]+)(?:\=([^\]\:\s]*))?/g,
				(s, id, path) => {
					if (!bindings[id]) {
						bindings[id] = new Binding(path || id);
						nBindings++;
					}
					return "%[" + id;
				},
			);
			hasText = true;
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
	let f = typeof tag === "string" ? (ui as any)[tagNames[tag] || tag] : tag;
	if (typeof f !== "function") throw err(ERROR.JSX_InvalidTag, String(tag));
	if (f.prototype instanceof UIComponent) {
		return f.getViewBuilder(merged, ...views);
	}
	if (f.prototype instanceof View) {
		throw err(ERROR.JSX_InvalidTag, f.name);
	}
	return f(merged, ...views);
}
