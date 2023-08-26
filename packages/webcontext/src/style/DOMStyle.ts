import { UIColor, UIComponent, UIStyle, UITheme } from "desk-frame";
import { CLASS_TOGGLE, CLASS_UI } from "./defaults/css.js";

/** @internal Default number of logical pixels in a REM unit */
export const LOGICAL_PX_PER_REM = 16;

/** Current number of pixels in a REM unit */
let _currentPxPerRem = 16;

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
	"": "",
};

/** Root CSS style element, if defined already */
let _cssElt: HTMLStyleElement | undefined;

/** Root CSS style updater, after creating style element the first time */
let _cssUpdater:
	| ((css: { [spec: string]: any }, allImports: string[]) => void)
	| undefined;

/** CSS classes currently defined, for particular selectors */
let _cssDefined: { [id: string]: true | undefined } = {};

/** Pending CSS update, if any */
let _pendingCSS: { [spec: string]: any } | undefined;

/** All CSS imports */
let _cssImports: string[] = [];

/** @internal Clears all styles and stylesheet imports, so that next update will start fresh */
export function resetCSS() {
	_pendingCSS = undefined;
	_cssImports = [];
	_cssDefined = {};
}

/** @internal Imports an external stylesheet */
export function importStylesheets(urls: string[]) {
	_cssImports.push(...urls);
	setGlobalCSS({});
}

/** @internal Overrides REM size globally, as a factor of the default size */
export function setLogicalPxScale(scale: number) {
	_currentPxPerRem = scale * LOGICAL_PX_PER_REM;
	setGlobalCSS({
		html: { fontSize: _currentPxPerRem + "px" },
	});
}

/** @internal Measures window width in logical pixel units */
export function getWindowInnerWidth() {
	return (window.innerWidth / _currentPxPerRem) * LOGICAL_PX_PER_REM;
}

/** @internal Measures window height in logical pixel units */
export function getWindowInnerHeight() {
	return (window.innerHeight / _currentPxPerRem) * LOGICAL_PX_PER_REM;
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

/** @internal Sets the global focus 'glow' outline width and blur (pixels or string with unit), and color */
export function setFocusDecoration(decoration: UIStyle.Definition.Decoration) {
	let css = makeDeclaration({ decoration });
	setGlobalCSS({
		[`.${CLASS_UI}:focus`]: { outline: "0" },
		[`.${CLASS_UI}[tabindex]:focus`]: css,
		[`.${CLASS_TOGGLE}>[tabindex]:focus+label>control`]: css,
	});
}

/** @internal Sets the global control style based on given text styles */
export function setControlTextStyle(textStyle: UIStyle.Definition.TextStyle) {
	let css = makeDeclaration({ textStyle });
	setGlobalCSS({
		[`.${CLASS_UI}.${UIStyle.Control.getIds().join(".")}`]: css,
	});
}

/** @internal Applies styles from given UI component to given element, using CSS classes and/or overrides */
export function applyElementCSS(
	element: HTMLElement,
	styles: Partial<UIStyle.Definition>,
	component: UIComponent
) {
	// if element is hidden, stop early
	if (element.hidden) {
		element.style.cssText = "";
		element.className = "";
	}

	// set inline styles (overrides given as argument)
	let inline: Partial<CSSStyleDeclaration> & { className?: string } = {};
	if (UIStyle.isStyleOverride(styles.dimensions))
		addDimensionsCSS(inline, styles.dimensions);
	if (UIStyle.isStyleOverride(styles.position))
		addPositionCSS(inline, styles.position);
	if (UIStyle.isStyleOverride(styles.textStyle))
		addTextStyleCSS(inline, styles.textStyle);
	if (UIStyle.isStyleOverride(styles.containerLayout))
		addContainerLayoutCSS(inline, styles.containerLayout);
	if (UIStyle.isStyleOverride(styles.decoration)) {
		// set inline decoration styles + inline CSS class name
		addDecorationCSS(inline, styles.decoration);
	} else if (styles.decoration) {
		// just set CSS class names from style instance
		let decoration = styles.decoration as any;
		if (decoration.cssClassNames) {
			inline.className = decoration.cssClassNames.join(" ");
		}
	}

	// set CSS classes for global style(s), if any
	let style = component.style;
	let className = CLASS_UI;
	if (style) {
		defineStyleClass(style);
		className += " " + style.getIds().join(" ");
	}
	if (inline.className) {
		className += " " + inline.className;
		delete inline.className;
	}
	element.className = className;

	// apply inline CSS properties as a CSS string
	let cssText = getCSSText(inline);
	if (cssText || (element as any)["HAS_STYLES"]) {
		element.style.cssText = cssText;
		(element as any)["HAS_STYLES"] = true;
	}
}

/** @internal Applies decoration styles from given object to an element, using CSS overrides only */
export function applyDecorationCSS(
	element: HTMLElement,
	decoration: Partial<UIStyle.Definition.Decoration>
) {
	let inline: Partial<CSSStyleDeclaration> & { className?: string } = {};
	addDecorationCSS(inline, decoration);
	if (decoration.cssClassNames) {
		element.className = decoration.cssClassNames.join(" ");
	}

	// apply inline CSS properties as a CSS string
	let cssText = getCSSText(inline);
	if (cssText || (element as any)["HAS_STYLES"]) {
		element.style.cssText = cssText;
		(element as any)["HAS_STYLES"] = true;
	}
}

/** @internal Helper method to convert a value to a CSS color string */
export function getCSSColor(color: string | UIColor) {
	color = String(color);
	if (color[0] === "@") color = String(UITheme.getColor(color.slice(1)));
	return color;
}

/** @internal Helper method to convert a CSS length unit *or* pixels number to a CSS string or given default string (e.g. `auto`) */
export function getCSSLength(
	length?: UIStyle.Offsets,
	defaultValue: any = "auto"
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

/** Helper function to make a set of CSS style declarations for given style definition */
function makeDeclaration(styles: Partial<UIStyle.Definition>) {
	let result: Partial<CSSStyleDeclaration> = {};
	if (styles.containerLayout)
		addContainerLayoutCSS(result, styles.containerLayout);
	if (styles.dimensions) addDimensionsCSS(result, styles.dimensions);
	if (styles.position) addPositionCSS(result, styles.position);
	if (styles.textStyle) addTextStyleCSS(result, styles.textStyle);
	if (styles.decoration) addDecorationCSS(result, styles.decoration);
	return result;
}

/** Helper function to recursively define CSS class(es) for given instance of `UIStyle` */
function defineStyleClass(style: UIStyle) {
	let selector = "*." + CLASS_UI + "." + style.getIds().join(".");
	if (_cssDefined[selector]) return;

	// add CSS to global element for base and conditional styles
	if (style.hasStyles()) {
		let c = style.getConditionalStyles();
		setGlobalCSS({
			[selector]: makeDeclaration(style.getOwnStyles()),
			[selector + ":focus"]: c.focused && makeDeclaration(c.focused),
			[selector + ":hover:not([disabled],[data-selected])"]:
				c.hover && makeDeclaration(c.hover),
			[selector + ":active:not([disabled],[data-selected])"]:
				c.pressed && makeDeclaration(c.pressed),
			[selector + "[disabled]"]: c.disabled && makeDeclaration(c.disabled),
			[selector + "[data-selected]"]: c.selected && makeDeclaration(c.selected),
		});
		_cssDefined[selector] = true;
	}

	// recurse for inherited styles
	let base = style.getBaseStyle();
	base && defineStyleClass(base);
}

/** Helper function to append CSS styles to given object for a given `Dimensions` object */
function addDimensionsCSS(
	result: Partial<CSSStyleDeclaration>,
	dimensions: UIStyle.Definition.Dimensions
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
	if (grow !== undefined) result.flexGrow = grow as any;
	let shrink = dimensions.shrink;
	if (shrink !== undefined) result.flexShrink = shrink as any;
}

/** Helper function to append CSS styles to given object for a given `Position` object */
function addPositionCSS(
	result: Partial<CSSStyleDeclaration>,
	position: UIStyle.Definition.Position
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

/** Helper function to append CSS styles to given object for a given `TextStyle` object */
function addTextStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	textStyle: UIStyle.Definition.TextStyle
) {
	let direction = textStyle.direction;
	if (direction !== undefined) result.direction = direction;
	let align = textStyle.align;
	if (align !== undefined) result.textAlign = align;
	let color = textStyle.color;
	if (color !== undefined) result.color = getCSSColor(color);
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
	let bold = textStyle.bold;
	if (bold) result.fontWeight = "bold"; // or explicit fontWeight above
	let italic = textStyle.italic;
	if (italic !== undefined) result.fontStyle = italic ? "italic" : "normal";
	let uppercase = textStyle.uppercase;
	if (uppercase !== undefined)
		result.textTransform = uppercase ? "uppercase" : "none";
	let smallCaps = textStyle.smallCaps;
	if (smallCaps !== undefined)
		result.fontVariant = smallCaps ? "small-caps" : "normal";
	let underline = textStyle.underline;
	let strikeThrough = textStyle.strikeThrough;
	if (underline)
		result.textDecoration =
			"underline" + (strikeThrough ? " line-through" : "");
	else if (strikeThrough) result.textDecoration = "line-through";
	else if (underline === false || strikeThrough === false)
		result.textDecoration = "none";
}

/** Helper function to append CSS styles to given object for a given `Decoration` object */
function addDecorationCSS(
	result: Partial<CSSStyleDeclaration> & { className?: string },
	decoration: UIStyle.Definition.Decoration
) {
	let background = decoration.background;
	if (background !== undefined) result.background = getCSSColor(background);
	let textColor = decoration.textColor;
	if (textColor !== undefined) result.color = getCSSColor(textColor);
	let borderThickness = decoration.borderThickness;
	if (borderThickness !== undefined)
		result.borderWidth = getCSSLength(borderThickness);
	let borderColor = decoration.borderColor;
	if (borderColor != undefined) result.borderColor = getCSSColor(borderColor);
	let borderStyle = decoration.borderStyle;
	if (borderStyle != undefined) result.borderStyle = decoration.borderStyle;

	let borderRadius = decoration.borderRadius;
	if (borderRadius !== undefined)
		result.borderRadius = getCSSLength(decoration.borderRadius);
	let padding = decoration.padding;
	if (padding !== undefined) result.padding = getCSSLength(padding);
	if (typeof padding === "object") {
		if ("start" in padding)
			result.paddingInlineStart = getCSSLength(padding.start);
		if ("end" in padding) result.paddingInlineEnd = getCSSLength(padding.end);
	}
	if (decoration.dropShadow !== undefined)
		result.boxShadow = getBoxShadowCSS(decoration.dropShadow);
	if (decoration.opacity! >= 0) result.opacity = String(decoration.opacity);
	if (decoration.css) {
		// copy all properties to result
		for (let p in decoration.css) result[p] = decoration.css[p];
	}
	if (decoration.cssClassNames) {
		result.className = decoration.cssClassNames.join(" ");
	}
}

/** Helper function to append CSS styles to given object for a given `ContainerLayout` object */
function addContainerLayoutCSS(
	result: Partial<CSSStyleDeclaration>,
	layout: UIStyle.Definition.ContainerLayout
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
}

/** Helper function to turn given CSS properties into a single string */
function getCSSText(style: any) {
	let result = "";
	for (let p in style) {
		if (p === "className" || style[p] === "" || style[p] == undefined) continue;
		let key = memoizeKey(p);
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
const _memoizeKey: { [k: string]: string } = Object.create(null);
function memoizeKey(k: string) {
	return (
		_memoizeKey[k] ??
		(_memoizeKey[k] = k
			.replace(/([A-Z])/g, "-$1")
			.toLowerCase()
			.replace(/^(webkit|o|ms|moz)-/, "-$1-"))
	);
}

/** Helper function to get boxShadow property for given elevation (0-1) */
function getBoxShadowCSS(d = 0) {
	let inset = "";
	if (d < 0) {
		inset = "inset ";
		d = -d;
	}
	d = Math.min(1, Math.max(0, d));
	if (!(d > 0)) return "none";
	return (
		`${inset}0 0 ${d * 2}rem ${d * -0.25}rem rgba(0,0,0,${d * d * 0.3}),` +
		`${inset}0 ${d * 0.85}rem ${d * 1}rem ${d * -0.25}rem rgba(0,0,0,${
			d * 0.15 + 0.1
		}),` +
		`${inset}0 ${d * d * 0.5 + d * 0.6}rem ${d * 1}rem ${
			d * -1
		}rem rgba(0,0,0,.4),` +
		`${inset}0 ${d * d * 1.5}rem ${d * 3}rem ${d * -1}rem rgba(0,0,0,.3),` +
		`${inset}0 ${d * d * 3}rem ${d * 2.5}rem ${d * -2}rem rgba(0,0,0,.3)`
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
		let old = _cssElt;
		_cssElt = document.createElement("style");
		_cssElt.setAttribute("type", "text/css");
		document.head!.appendChild(_cssElt);
		_cssElt.textContent =
			allImports.map((s) => "@import url(" + JSON.stringify(s) + ");\n") + text;
		setTimeout(() => {
			old && old.remove();
		}, 30);
	};
}
