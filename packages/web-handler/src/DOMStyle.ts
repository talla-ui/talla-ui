import { UIColor, UIContainer, UIStyle, UIElement } from "@talla-ui/core";
import {
	CLASS_CONTAINER,
	CLASS_TEXTCONTROL,
	CLASS_TOGGLE,
	CLASS_UI,
	makeBaseCSS,
} from "./defaults/css.js";
import type { WebContextOptions } from "./WebContextOptions.js";

/** @internal Default number of logical pixels in a REM unit */
export const LOGICAL_PX_PER_REM = 16;

/** @internal Default control text CSS styles */
export const defaultControlTextStyle: UIStyle.StyleOptions = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, "Helvetica Neue", Arial, sans-serif',
	fontSize: 14,
	lineHeight: 1.5,
};

/** Flexbox justify/alignment options */
const _flexOptions: Record<string, string | undefined> = {
	start: "flex-start",
	end: "flex-end",
	fill: "space-between", // legacy
};

// Note: styles and imports are defined in separate elements to prevent FOUC
// while loading styles from external sources

/** Root CSS style element, if defined already */
let _cssElt: HTMLStyleElement | undefined;

/** Root CSS imports style element, if defined already */
let _cssImportElt: HTMLStyleElement | undefined;

/** Adopted CSS style sheet, if defined already */
let _adoptedSheet: CSSStyleSheet | undefined;

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

/** Set of imports that have been added to avoid re-importing */
let _importsAdded = new Set<string>();

/** Current logical pixel scaling */
let _currentLogicalPxScale = 1;

/** Current logical pixel scaling in narrow viewport */
let _currentLogicalPxScaleNarrow = 1;

/** @internal Helper method to reset all CSS and apply global settings */
export function initializeCSS(options: WebContextOptions) {
	resetCSS();
	setGlobalCSS(makeBaseCSS());
	setLogicalPxScale(options.logicalPxScale, options.logicalPxScaleNarrow);
	importStylesheets(options.importCSS);
	setFocusDecoration(options.focusDecoration);
	setControlTextStyle({
		...defaultControlTextStyle,
		...options.controlTextStyle,
	});
}

/** @internal Clears all styles and stylesheet imports, so that next update will start fresh */
export function resetCSS() {
	_pendingCSS = undefined;
	_cssImports = [];
	_cssDefined = new Set();
	_importsAdded = new Set();

	// Remove existing stylesheets
	_cssElt?.remove();
	_cssImportElt?.remove();
	_cssElt = undefined;
	_cssImportElt = undefined;
	if (_adoptedSheet) {
		document.adoptedStyleSheets = [...document.adoptedStyleSheets].filter(
			(s) => s !== _adoptedSheet,
		);
		_adoptedSheet = undefined;
	}
	_cssUpdater = undefined;
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
		"@media (max-width: 600px)": {
			html: { fontSize: (narrow ?? scale) * LOGICAL_PX_PER_REM + "px" },
		},
	});
}

/** @internal Sets the global focus 'glow' outline width and blur (pixels or string with unit), and color */
export function setFocusDecoration(decoration?: UIStyle.StyleOptions) {
	if (!decoration) return;
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
export function setControlTextStyle(textStyle: UIStyle.StyleOptions) {
	let styles = {};
	addTextStyleCSS(styles, textStyle);
	setGlobalCSS({ [`.${CLASS_UI}.${CLASS_TEXTCONTROL}`]: styles });
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

/** @internal Helper method to convert a CSS length unit *or* pixels number to a CSS string or given default string (e.g. `auto`) */
export function getCSSLength(
	length?: UIStyle.Offsets,
	defaultValue: any = "auto",
): string {
	if (length === "gap") length = UIStyle.defaultOptions.gap;
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
export function defineStyleClass(style: UIStyle, isTextStyle?: boolean) {
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
		let state = (object as UIStyle.StyleDefinition).state;
		if (state) {
			// add suffixes for disabled, readonly, hovered, focused
			if (state.disabled) stateSelector += "[disabled]";
			else if (state.disabled === false) stateSelector += ":not([disabled])";
			if (state.readonly) stateSelector += "[readonly]";
			else if (state.readonly === false) stateSelector += ":not([readonly])";
			if (state.focused) stateSelector += ":focus";
			else if (state.focused === false) stateSelector += ":not(:focus)";
			if (state.hovered) stateSelector += ":hover";
			else if (state.hovered === false) stateSelector += ":not(:hover)";

			// pressed state is controlled by two selectors
			if (state.pressed)
				stateSelector += ":active," + stateSelector + "[aria-pressed=true]";
			else if (state.pressed === false)
				stateSelector += ":not(:active):not([aria-pressed=true])";
		}

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
	position?: UIElement.Position,
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
	position: UIElement.Position,
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
			if (alignSelf) result.alignSelf = _flexOptions[alignSelf] || alignSelf;
			if (hasHorizontalPosition || hasVerticalPosition) {
				result.position = "relative";
			}
	}
}

/** Helper function to append CSS styles to given object for a given `Dimensions` object */
function addDimensionsCSS(
	result: Partial<CSSStyleDeclaration>,
	dimensions: UIStyle.StyleOptions,
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
	if (shrink !== undefined) {
		result.flexShrink =
			shrink === true ? 1 : shrink === false ? 0 : (shrink as any);
	}
}

/** Helper function to append CSS styles to given object for a given `TextStyle` object */
function addTextStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	textStyle: UIStyle.StyleOptions,
) {
	let direction = textStyle.textDirection;
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
		((result.overflow = "hidden"), (result.textOverflow = "clip"));
	else if (lineBreakMode === "ellipsis")
		((result.overflow = "hidden"), (result.textOverflow = "ellipsis"));
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
	if (textStyle.userTextSelect) {
		result.userSelect = "text";
		(result as any).webkitUserSelect = "text";
		result.cursor = "text";
	}
}

/** Helper function to append CSS styles to given object for a given `Decoration` object */
function addDecorationStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	decoration: UIStyle.StyleOptions,
) {
	let background = decoration.background;
	if (background !== undefined) result.background = String(background);
	let textColor = decoration.textColor;
	if (textColor !== undefined) result.color = String(textColor);
	let borderWidth = decoration.borderWidth;
	if (borderWidth !== undefined) result.borderWidth = getCSSLength(borderWidth);
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
	let dropShadow = decoration.dropShadow;
	if (dropShadow) result.boxShadow = getDropShadowCSS(dropShadow);
	let opacity = decoration.opacity;
	if (opacity !== undefined) result.opacity = String(opacity);
	let cursor = decoration.cursor;
	if (cursor !== undefined) result.cursor = String(cursor);
	if (decoration.css) {
		// copy all properties to result
		for (let p in decoration.css) result[p] = decoration.css[p];
	}
	let margin = decoration.margin;
	if (margin !== undefined) result.margin = getCSSLength(margin);
	if (typeof margin === "object") {
		if ("start" in margin)
			result.marginInlineStart = getCSSLength(margin.start);
		if ("end" in margin) result.marginInlineEnd = getCSSLength(margin.end);
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
		result.justifyContent = _flexOptions[distribution] || distribution;
	let gravity = layout.gravity;
	if (gravity !== undefined)
		result.alignItems = _flexOptions[gravity] || gravity;
	let wrapContent = layout.wrapContent;
	if (wrapContent !== undefined)
		result.flexWrap = wrapContent ? "wrap" : "nowrap";
	let clip = layout.clip;
	if (clip !== undefined) result.overflow = clip ? "hidden" : "visible";
	addPadding(result, layout.padding);
}

function addPadding(
	result: Partial<CSSStyleDeclaration>,
	padding?: UIStyle.Offsets,
) {
	if (padding !== undefined) result.padding = getCSSLength(padding);
	if (typeof padding === "object") {
		if ("start" in padding)
			result.paddingInlineStart = getCSSLength(padding.start);
		if ("end" in padding) result.paddingInlineEnd = getCSSLength(padding.end);
	}
}

/** Helper function to return a CSS drop shadow value for the given pixel value */
function getDropShadowCSS(dropShadow: number) {
	let h = Math.abs(dropShadow) / LOGICAL_PX_PER_REM;
	if (dropShadow < 0) h = h * 0.5;
	let b1 = h * 2;
	let s1 = -h * 0.75;
	let a1 = Math.min(h * 0.2 + 0.1, 0.4);
	let b2 = h * 2;
	let s2 = -h * 0.5 - 0.1;
	let a2 = Math.min(h * 0.4 + 0.3, 0.6);
	let inset = dropShadow < 0 ? "inset " : "";
	return (
		`${inset}0 0 ${b1}rem ${s1}rem rgba(0,0,0,${a1}),` +
		`${inset}0 ${h}rem ${b2}rem ${s2}rem rgba(0,0,0,${a2})`
	);
}

/** Helper function to turn given CSS properties into a single string */
function getCSSText(style: any) {
	let result = "";
	for (let p in style) {
		if (style[p] === "" || style[p] == undefined) continue;
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
	return "adoptedStyleSheets" in document &&
		"CSSStyleSheet" in window &&
		"replace" in CSSStyleSheet.prototype
		? _makeAdoptedStyleSheetUpdater()
		: _makeDOMStyleSheetUpdater();
}

/** Modern adoptedStyleSheets implementation */
function _makeAdoptedStyleSheetUpdater() {
	return (css: { [spec: string]: any }, allImports: string[]) => {
		_addNewImports(allImports);
		if (!_adoptedSheet) {
			_adoptedSheet = new CSSStyleSheet();
			document.adoptedStyleSheets = [
				...document.adoptedStyleSheets,
				_adoptedSheet,
			];
		}
		_addCSSRules(css, _adoptedSheet);
	};
}

/** Fallback DOM-based stylesheet implementation */
function _makeDOMStyleSheetUpdater() {
	return (css: { [spec: string]: any }, allImports: string[]) => {
		_addNewImports(allImports);
		if (!_cssElt) {
			_cssElt = document.createElement("style");
			_cssElt.setAttribute("type", "text/css");
			document.head!.appendChild(_cssElt);
		}
		let mainSheet = _cssElt.sheet!;
		_addCSSRules(css, mainSheet);
	};
}

/** Helper function to add new imports to the import stylesheet */
function _addNewImports(allImports: string[]) {
	if (!allImports.length) return;
	if (!_cssImportElt) {
		_cssImportElt = document.createElement("style");
		_cssImportElt.setAttribute("type", "text/css");
		document.head!.appendChild(_cssImportElt);
	}
	let sheet = _cssImportElt.sheet!;
	for (let importUrl of allImports) {
		if (!_importsAdded.has(importUrl)) {
			try {
				sheet.insertRule(
					`@import url(${JSON.stringify(importUrl)});`,
					sheet.cssRules.length,
				);
				_importsAdded.add(importUrl);
			} catch (e) {
				console.warn(e);
			}
		}
	}
}

/** Helper function for common rule insertion logic */
function _addCSSRules(css: { [spec: string]: any }, sheet: CSSStyleSheet) {
	for (let selector in css) {
		let declarations = css[selector];
		if (!declarations) continue;
		if (selector[0] === "@") {
			// Handle media queries and other at-rules
			for (let nestedSelector in declarations) {
				let nestedDeclarations = getCSSText(declarations[nestedSelector]);
				if (!nestedDeclarations) continue;
				sheet.insertRule(
					`${selector} { ${nestedSelector} { ${nestedDeclarations} } }`,
					sheet.cssRules.length,
				);
			}
		} else {
			// Handle regular selectors
			let declarationsText = getCSSText(declarations);
			if (!declarationsText) continue;
			sheet.insertRule(
				`${selector} { ${declarationsText} }`,
				sheet.cssRules.length,
			);
		}
	}
}
