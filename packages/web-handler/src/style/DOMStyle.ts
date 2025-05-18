import { UIRenderable, UIContainer, UIStyle, UIColor } from "@talla-ui/core";
import {
	CLASS_CONTAINER,
	CLASS_TEXTCONTROL,
	CLASS_TOGGLE,
	CLASS_UI,
} from "./defaults/css.js";

/** @internal Default number of logical pixels in a REM unit */
export const LOGICAL_PX_PER_REM = 16;

/** Flexbox justify options */
const _flexJustifyOptions = {
	start: "flex-start",
	end: "flex-end",
	center: "center",
	fill: "space-between",
	"space-around": "space-around",
	"": "",
};

/** Flexbox  alignment options */
const _flexAlignOptions = {
	start: "flex-start",
	end: "flex-end",
	center: "center",
	stretch: "stretch",
	baseline: "baseline",
	auto: "auto",
	"": "",
};

// Note: styles and imports are defined in separate elements to prevent FOUC
// while loading styles from external sources

/** Root CSS style element, if defined already */
let _cssElt: HTMLStyleElement | undefined;

/** Root CSS imports style element, if defined already */
let _cssImportElt: HTMLStyleElement | undefined;

/** Root CSS style updater, after creating style element the first time */
let _cssUpdater:
	| ((css: { [spec: string]: any }, allImports: string[]) => void)
	| undefined;

/** CSS classes currently defined, by ID */
let _cssDefined = new Set<string>();

/** Pending CSS update, if any */
let _pendingCSS: { [spec: string]: any } | undefined;

/** All CSS imports */
let _cssImports: string[] = [];

/** Current logical pixel scaling */
let _currentLogicalPxScale = 1;

/** Current logical pixel scaling in narrow viewport */
let _currentLogicalPxScaleNarrow = 1;

/** Label dim opacity */
let _labelDimOpacity = 0.5;

/** @internal Set the opacity to be used for labels with `dim` set to true */
export function setLabelDimOpacity(opacity: number) {
	_labelDimOpacity = opacity;
}

/** @internal Get the opacity to be used for labels with `dim` set to true */
export function getLabelDimOpacity() {
	return _labelDimOpacity;
}

/** @internal Helper method to convert a CSS length unit *or* pixels number to a CSS string or given default string (e.g. `auto`) */
export function getCSSLength(
	length?: UIRenderable.Offsets,
	defaultValue: any = "auto",
): string {
	if (typeof length === "string") return length;
	if (typeof length === "number") return length / LOGICAL_PX_PER_REM + "rem";
	if (typeof length === "object") {
		let top: string | number = 0;
		let bottom: string | number = 0;
		let start: string | number = 0;
		let end: string | number = 0;
		if (length.x) start = end = getCSSLength(length.x);
		if (length.y) top = bottom = getCSSLength(length.y);
		if (length.top) top = getCSSLength(length.top);
		if (length.bottom) bottom = getCSSLength(length.bottom);
		if (length.start) start = getCSSLength(length.start);
		else if (length.left) start = getCSSLength(length.left);
		if (length.end) end = getCSSLength(length.end);
		else if (length.right) end = getCSSLength(length.right);
		return top + " " + end + " " + bottom + " " + start;
	}
	return defaultValue;
}

/** @internal Clears all styles and stylesheet imports, so that next update will start fresh */
export function resetCSS() {
	_pendingCSS = undefined;
	_cssImports = [];
	_cssDefined = new Set();
}

/** @internal Imports an external stylesheet */
export function importStylesheets(urls: string[]) {
	_cssImports.push(...urls);
	setGlobalCSS({});
}

/** @internal Overrides REM size globally, as a factor of the default size */
export function setLogicalPxScale(scale: number, narrow?: number) {
	_currentLogicalPxScale = scale;
	_currentLogicalPxScaleNarrow = narrow ?? scale;
	setGlobalCSS({
		html: { fontSize: scale * LOGICAL_PX_PER_REM + "px" },
	});
	setGlobalCSS({
		"@media (max-width: 600px)": {
			html: { fontSize: (narrow ?? scale) * LOGICAL_PX_PER_REM + "px" },
		},
	});
}

/** @internal Measures window width in logical pixel units */
export function getWindowInnerWidth() {
	let w = window.innerWidth;
	let scale = w < 600 ? _currentLogicalPxScaleNarrow : _currentLogicalPxScale;
	return w / scale;
}

/** @internal Measures window height in logical pixel units */
export function getWindowInnerHeight() {
	let h = window.innerHeight;
	let scale = h < 600 ? _currentLogicalPxScaleNarrow : _currentLogicalPxScale;
	return h / scale;
}

/** @internal Sets the global focus 'glow' outline width and blur (pixels or string with unit), and color */
export function setFocusDecoration(decoration: UIRenderable.Decoration) {
	let styles = {};
	addDecorationStyleCSS(styles, decoration);
	setGlobalCSS({
		[`.${CLASS_UI}:focus`]: { outline: "0", outlineOffset: "0" },
		[`.${CLASS_UI}[tabindex]:focus-visible`]: styles,
		[`.${CLASS_UI}[role=listitem]:focus`]: styles,
		[`.${CLASS_TOGGLE}>input:focus-visible`]: styles,
	});
}

/** @internal Sets the global control style based on given text styles */
export function setControlTextStyle(textStyle: UIRenderable.TextStyle) {
	let styles = {};
	addTextStyleCSS(styles, textStyle);
	setGlobalCSS({ [`.${CLASS_UI}.${CLASS_TEXTCONTROL}`]: styles });
}

/** @internal Replaces given CSS styles in the global root style sheet */
export function setGlobalCSS(css: {
	[spec: string]:
		| Partial<CSSStyleDeclaration>
		| { [spec: string]: any }
		| undefined;
}) {
	if (!_pendingCSS) _pendingCSS = {};
	for (let p in css) if (css[p]) _pendingCSS[p] = css[p];
	Promise.resolve().then(() => {
		if (!_cssUpdater) _cssUpdater = _makeCSSUpdater();
		if (_pendingCSS) _cssUpdater(_pendingCSS, _cssImports);
		_pendingCSS = undefined;
	});
}

/** @internal Defines a CSS class for given style instance */
export function defineStyleClass(style: UIStyle<any>, isTextStyle?: boolean) {
	let id = style.id;
	if (!id) throw RangeError();
	if (_cssDefined.has(id)) return;
	_cssDefined.add(id);

	let styles = style.getStyles();
	if (!styles.length) return;

	// combine all CSS styles
	let combined: { [spec: string]: Partial<CSSStyleDeclaration> } = {};
	let selector = "*." + CLASS_UI + "." + id;
	function addStateStyle(object: any) {
		let stateSelector = selector;

		// add suffixes for disabled, readonly, hovered, focused
		if (object[UIStyle.STATE_DISABLED]) stateSelector += "[disabled]";
		else if (object[UIStyle.STATE_DISABLED] === false)
			stateSelector += ":not([disabled])";
		if (object[UIStyle.STATE_READONLY]) stateSelector += "[readonly]";
		else if (object[UIStyle.STATE_READONLY] === false)
			stateSelector += ":not([readonly])";
		if (object[UIStyle.STATE_FOCUSED]) stateSelector += ":focus";
		else if (object[UIStyle.STATE_FOCUSED] === false)
			stateSelector += ":not(:focus)";

		// hover state is only applied if not pressed or focused
		// (unless explicitly set to true; note that disabled elements have
		// pointer events disabled, so we don't need to check for that)
		if (object[UIStyle.STATE_HOVERED])
			stateSelector +=
				(object[UIStyle.STATE_PRESSED]
					? ""
					: ":not(:active):not([aria-pressed=true])") +
				(object[UIStyle.STATE_FOCUSED] ? "" : ":not(:focus-visible)") +
				":hover";
		else if (object[UIStyle.STATE_HOVERED] === false)
			stateSelector += ":not(:hover)";

		// pressed state is controlled by two selectors
		if (object[UIStyle.STATE_PRESSED])
			stateSelector += ":active," + stateSelector + "[aria-pressed=true]";
		else if (object[UIStyle.STATE_PRESSED] === false)
			stateSelector += ":not(:active):not([aria-pressed=true])";

		let css = combined[stateSelector] || {};
		addDimensionsCSS(css, object);
		addDecorationStyleCSS(css, object);
		if (isTextStyle) addTextStyleCSS(css, object);
		combined[stateSelector] = css;
	}
	for (let style of styles) {
		addStateStyle(style);
	}

	// add CSS to global element for base and conditional styles
	setGlobalCSS(combined);
}

/** @internal Helper function to apply CSS classes and styles to an element */
export function applyStyles(
	element: HTMLElement,
	styles: any[],
	systemName?: string,
	isTextControl?: boolean,
	isContainer?: boolean,
	position?: UIRenderable.Position,
	layout?: UIContainer.Layout,
) {
	// if element is hidden, stop early
	if (element.hidden) {
		element.className = "";
		element.style.cssText = "";
		(element as any)["HAS_STYLES"] = false;
		return;
	}

	// set class name based on (last provided) style instance
	let className = CLASS_UI;
	if (isTextControl) className += " " + CLASS_TEXTCONTROL;
	if (isContainer) className += " " + CLASS_CONTAINER;
	if (systemName) className += " " + systemName;
	for (let i = styles.length; i > 0; ) {
		let style = styles[--i];
		if (style instanceof UIStyle) {
			defineStyleClass(style, isTextControl);
			className += " " + style.id;
			break;
		}
	}
	element.className = className;

	// apply overrides inline
	let inline: any = {};
	addInlineCSS(inline, styles, isTextControl);
	if (position) addPositionCSS(inline, position);
	if (layout) addContainerLayoutCSS(inline, layout);

	// apply inline CSS properties as a CSS string
	let cssText = getCSSText(inline);
	if (cssText || (element as any)["HAS_STYLES"]) {
		element.style.cssText = cssText;
		(element as any)["HAS_STYLES"] = true;
	}
}

/** @internal Helper function to copy inline CSS styles to given object */
function addInlineCSS(
	inline: Partial<CSSStyleDeclaration>,
	values: any[],
	isTextControl?: boolean,
) {
	for (let i = 0, len = values.length; i < len; i++) {
		let style = values[i];
		if (!style) continue;

		// check if next item is a(nother) full UIStyle, if so ignore this one
		if (values[i + 1] instanceof UIStyle) continue;

		// recurse for (nested) arrays
		if (Array.isArray(style)) {
			return addInlineCSS(inline, style, isTextControl);
		}

		// set styles from overrides or plain object
		let overrides = style instanceof UIStyle ? style.getOverrides() : style;
		if (!overrides) continue;
		addDimensionsCSS(inline, overrides);
		addDecorationStyleCSS(inline, overrides);
		if (isTextControl) addTextStyleCSS(inline, overrides);
	}
}

/** Helper function to append CSS styles to given object for a given `Position` object */
function addPositionCSS(
	result: Partial<CSSStyleDeclaration>,
	position: UIRenderable.Position,
) {
	let alignSelf = position.gravity;
	let hasHorizontalPosition: boolean | undefined;
	let hasVerticalPosition: boolean | undefined;
	if (
		position.left !== undefined ||
		position.right !== undefined ||
		position.start !== undefined ||
		position.end !== undefined
	) {
		hasHorizontalPosition = true;
		result.left = getCSSLength(position.left ?? position.start);
		result.right = getCSSLength(position.right ?? position.end);
		result.insetInlineStart = getCSSLength(position.start ?? position.left);
		result.insetInlineEnd = getCSSLength(position.end ?? position.right);
	}
	if (position.top !== undefined || position.bottom !== undefined) {
		hasVerticalPosition = true;
		result.top = getCSSLength(position.top);
		result.bottom = getCSSLength(position.bottom);
	}
	switch (alignSelf) {
		case "cover":
			result.left = result.top = result.right = result.bottom = "0";
		case "overlay":
			result.position = "absolute";
			result.zIndex = "100";
			if (!hasHorizontalPosition) result.margin = "auto";
			break;
		default:
			if (alignSelf) result.alignSelf = _flexAlignOptions[alignSelf];
			if (hasHorizontalPosition || hasVerticalPosition) {
				result.position = "relative";
			}
	}
}

/** Helper function to append CSS styles to given object for a given `Dimensions` object */
function addDimensionsCSS(
	result: Partial<CSSStyleDeclaration>,
	dimensions: UIRenderable.Dimensions,
) {
	let width = dimensions.width;
	if (width !== undefined) result.width = getCSSLength(width);
	let height = dimensions.height;
	if (height !== undefined) result.height = getCSSLength(height);
	let minWidth = dimensions.minWidth;
	if (minWidth !== undefined) result.minWidth = getCSSLength(minWidth, "");
	let minHeight = dimensions.minHeight;
	if (minHeight !== undefined) result.minHeight = getCSSLength(minHeight, "");
	let maxWidth = dimensions.maxWidth;
	if (maxWidth !== undefined) result.maxWidth = getCSSLength(maxWidth, "");
	let maxHeight = dimensions.maxHeight;
	if (maxHeight !== undefined) result.maxHeight = getCSSLength(maxHeight, "");
	let grow = dimensions.grow;
	if (grow !== undefined) {
		result.flexGrow = grow === true ? 1 : grow === false ? 0 : (grow as any);
	}
	let shrink = dimensions.shrink;
	if (shrink !== undefined) result.flexShrink = shrink as any;
}

/** Helper function to append CSS styles to given object for a given `TextStyle` object */
function addTextStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	textStyle: UIRenderable.TextStyle,
) {
	let direction = textStyle.direction;
	if (direction !== undefined) result.direction = direction;
	let textAlign = textStyle.textAlign;
	if (textAlign !== undefined) result.textAlign = textAlign;
	let fontFamily = textStyle.fontFamily;
	if (fontFamily !== undefined) result.fontFamily = fontFamily;
	let fontSize = textStyle.fontSize;
	if (fontSize !== undefined)
		result.fontSize = getCSSLength(fontSize, "inherit");
	let fontWeight = textStyle.fontWeight;
	if (fontWeight !== undefined) result.fontWeight = String(fontWeight);
	let letterSpacing = textStyle.letterSpacing;
	if (letterSpacing !== undefined)
		result.letterSpacing = getCSSLength(letterSpacing);
	let lineHeight = textStyle.lineHeight;
	if (lineHeight !== undefined) result.lineHeight = String(lineHeight);
	let lineBreakMode = textStyle.lineBreakMode;
	if (lineBreakMode === "clip")
		(result.overflow = "hidden"), (result.textOverflow = "clip");
	else if (lineBreakMode === "ellipsis")
		(result.overflow = "hidden"), (result.textOverflow = "ellipsis");
	else if (lineBreakMode !== undefined) result.whiteSpace = lineBreakMode;
	let italic = textStyle.italic;
	if (italic !== undefined) result.fontStyle = italic ? "italic" : "normal";
	if (textStyle.bold) result.fontWeight = "bold"; // or explicit fontWeight above
	let uppercase = textStyle.uppercase;
	if (uppercase !== undefined)
		result.textTransform = uppercase ? "uppercase" : "none";
	let smallCaps = textStyle.smallCaps;
	if (smallCaps !== undefined)
		result.fontVariant = smallCaps ? "small-caps" : "normal";
	let tabularNums = textStyle.tabularNums;
	if (tabularNums !== undefined)
		result.fontVariantNumeric = tabularNums ? "tabular-nums" : "normal";
	let underline = textStyle.underline;
	let strikeThrough = textStyle.strikeThrough;
	if (underline)
		result.textDecoration =
			"underline" + (strikeThrough ? " line-through" : "");
	else if (strikeThrough) result.textDecoration = "line-through";
	else if (underline === false || strikeThrough === false)
		result.textDecoration = "none";
	if (textStyle.userSelect) {
		result.userSelect = "text";
		(result as any).webkitUserSelect = "text";
		result.cursor = "text";
	}
}

/** Helper function to append CSS styles to given object for a given `Decoration` object */
function addDecorationStyleCSS(
	result: Partial<CSSStyleDeclaration> & { className?: string }, // TODO: why className?
	decoration: UIRenderable.Decoration,
) {
	let background = decoration.background;
	if (background !== undefined) result.background = String(background);
	let textColor = decoration.textColor;
	if (textColor !== undefined) result.color = String(textColor);
	let borderThickness = decoration.borderThickness;
	if (borderThickness !== undefined)
		result.borderWidth = getCSSLength(borderThickness);
	let borderColor = decoration.borderColor;
	if (borderColor instanceof UIColor) result.borderColor = String(borderColor);
	else if (borderColor !== undefined) {
		result.borderColor = [
			borderColor.top,
			borderColor.right,
			borderColor.bottom,
			borderColor.left,
		]
			.map((c) => String(c || "transparent"))
			.join(" ");
		if (borderColor.start)
			result.borderInlineStartColor = String(borderColor.start);
		if (borderColor.end) result.borderInlineEndColor = String(borderColor.end);
	}
	let borderStyle = decoration.borderStyle;
	if (borderStyle !== undefined) result.borderStyle = borderStyle;
	let borderRadius = decoration.borderRadius;
	if (typeof borderRadius === "number" || typeof borderRadius === "string") {
		result.borderRadius = getCSSLength(borderRadius);
	} else if (borderRadius !== undefined) {
		result.borderRadius = [
			borderRadius.topLeft,
			borderRadius.topRight,
			borderRadius.bottomRight,
			borderRadius.bottomLeft,
		]
			.map((b) => getCSSLength(b || 0))
			.join(" ");
		if (borderRadius.topStart)
			result.borderStartStartRadius = getCSSLength(borderRadius.topStart);
		if (borderRadius.bottomStart)
			result.borderEndStartRadius = getCSSLength(borderRadius.bottomStart);
		if (borderRadius.topEnd)
			result.borderStartEndRadius = getCSSLength(borderRadius.topEnd);
		if (borderRadius.bottomEnd)
			result.borderEndEndRadius = getCSSLength(borderRadius.bottomEnd);
	}
	let opacity = decoration.opacity;
	if (opacity !== undefined) result.opacity = String(opacity);
	let cursor = decoration.cursor;
	if (cursor !== undefined) result.cursor = String(cursor);
	if (decoration.css) {
		// copy all properties to result
		for (let p in decoration.css) result[p] = decoration.css[p];
	}
	addPadding(result, decoration.padding);
}

/** Helper function to append CSS styles to given object for a given `ContainerLayout` object */
function addContainerLayoutCSS(
	result: Partial<CSSStyleDeclaration>,
	layout: UIContainer.Layout,
) {
	let axis = layout.axis;
	if (axis !== undefined)
		result.flexDirection = axis === "horizontal" ? "row" : "column";
	let distribution = layout.distribution;
	if (distribution !== undefined)
		result.justifyContent = _flexJustifyOptions[distribution] || "";
	let gravity = layout.gravity;
	if (gravity !== undefined)
		result.alignItems = _flexAlignOptions[gravity] || "";
	let wrapContent = layout.wrapContent;
	if (wrapContent !== undefined)
		result.flexWrap = wrapContent ? "wrap" : "nowrap";
	let clip = layout.clip;
	if (clip !== undefined) result.overflow = clip ? "hidden" : "visible";
	addPadding(result, layout.padding);
}

function addPadding(
	result: Partial<CSSStyleDeclaration>,
	padding?: UIRenderable.Offsets,
) {
	if (padding !== undefined) result.padding = getCSSLength(padding);
	if (typeof padding === "object") {
		if ("start" in padding)
			result.paddingInlineStart = getCSSLength(padding.start);
		if ("end" in padding) result.paddingInlineEnd = getCSSLength(padding.end);
	}
}

/** Helper function to turn given CSS properties into a single string */
function getCSSText(style: any) {
	let result = "";
	for (let p in style) {
		if (p === "className" || style[p] === "" || style[p] == undefined) continue;
		let key = camelToCssCase(p);
		let value = String(style[p]);
		if (value.indexOf("|") >= 0) {
			for (let str of value.split("||").reverse()) {
				result += key + ": " + str + "; ";
			}
		} else {
			result += key + ": " + value + "; ";
		}
	}
	return result;
}

// Memoize camelCase property names to css-case names:
const _memoizedCamelToCssCase: { [k: string]: string } = Object.create(null);
function camelToCssCase(k: string) {
	return (
		_memoizedCamelToCssCase[k] ??
		(_memoizedCamelToCssCase[k] = k
			.replace(/([A-Z])/g, "-$1")
			.toLowerCase()
			.replace(/^(webkit|o|ms|moz)-/, "-$1-"))
	);
}

/** Helper function to make a CSS style element updater function */
function _makeCSSUpdater() {
	let styles: { [spec: string]: any } = {};
	return (css: typeof styles, allImports: string[]) => {
		// merge given styles into existing ones
		for (let p in css) {
			if (p[0] === "@" && styles[p]) {
				// merge existing objects
				styles[p] = { ...styles[p], ...css[p] };
			} else {
				// copy all properties
				styles[p] = { ...css[p] };
			}
		}

		// combine all CSS text
		let text = "";
		for (let p in styles) {
			if (p[0] === "@") {
				// write entire block of styles
				text += p + " {\n";
				for (let q in styles[p]) {
					text += "  " + q + " { " + getCSSText(styles[p][q]) + "}\n";
				}
				text += "}\n";
			} else {
				// write single line of styles
				text += p + " { " + getCSSText(styles[p]) + "}\n";
			}
		}

		// create a new style sheet, and delete the old one after a while
		// (prevents FOUC in some browsers while new styles are parsed)
		let oldStyle = _cssElt;
		_cssElt = document.createElement("style");
		_cssElt.setAttribute("type", "text/css");
		document.head!.appendChild(_cssElt);
		_cssElt.textContent = text;

		// create a separate style sheet for imports
		let oldImports = _cssImportElt;
		_cssImportElt = document.createElement("style");
		_cssImportElt.setAttribute("type", "text/css");
		document.head!.appendChild(_cssImportElt);
		_cssImportElt.textContent = allImports
			.map((s) => "@import url(" + JSON.stringify(s) + ");\n")
			.join("");

		// remove old style sheets after a while
		setTimeout(() => {
			oldStyle?.remove();
			oldImports?.remove();
		}, 30);
	};
}
