import {
	StyleOverrides,
	UIColor,
	UIContainer,
	UIElement,
} from "@talla-ui/core";
import {
	CLASS_CONTAINER,
	CLASS_NAMED,
	CLASS_TEXTCONTROL,
	CLASS_TOGGLE,
	CLASS_UI,
	makeBaseCSS,
} from "./defaults/css.js";

/** @internal Element type identifiers for style class names */
export type StyleElementType =
	| "button"
	| "text"
	| "textfield"
	| "toggle"
	| "divider"
	| "container";

/**
 * @internal Style definition for named styles
 * - Uses StyleOverrides from core for base properties (supports UIColor)
 * - Adds state keys: `+hover`, `+focus`, `+pressed`, `+disabled`, `+readonly`
 * - Adds CSS selector keys (`:` or `[` prefix, e.g. `:first-child`, `[data-foo]`)
 */
export type WebNamedStyleDefinition = StyleOverrides & {
	"+hover"?: StyleOverrides;
	"+focus"?: StyleOverrides;
	"+pressed"?: StyleOverrides;
	"+disabled"?: StyleOverrides;
	"+readonly"?: StyleOverrides;
	[selector: `:${string}` | `[${string}`]: StyleOverrides | undefined;
};

/** @internal Default number of logical pixels in a REM unit */
export const LOGICAL_PX_PER_REM = 16;

/** @internal Default control text CSS styles */
export const defaultControlTextStyle: StyleOverrides = {
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

/** Root CSS style element, if defined */
let _cssElt: HTMLStyleElement | undefined;

/** Adopted CSS style sheet, if defined */
let _adoptedSheet: CSSStyleSheet | undefined;

/** Root CSS imports style element, if defined */
let _cssImportElt: HTMLStyleElement | undefined;

/** Incremented each time an update has been scheduled (async) */
let _cssPending = 0;

/** Current logical pixel scaling */
let _currentLogicalPxScale = 1;

/** Current logical pixel scaling in narrow viewport */
let _currentLogicalPxScaleNarrow = 1;

/** Current gap size in pixels */
let _currentGap = 8;

/** @internal Settings passed to initializeCSS from WebTheme */
export type InitializeCSSOptions = {
	updateBodyStyle?: boolean;
	pageBackground?: UIColor | string;
	logicalPxScale?: number;
	logicalPxScaleNarrow?: number;
	gap?: number;
	focusDecoration?: StyleOverrides;
	controlTextStyle?: StyleOverrides;
};

/** @internal Helper method to reset all CSS and apply specified options */
export function initializeCSS(
	options: InitializeCSSOptions,
	namedStyles?: Record<string, Record<string, WebNamedStyleDefinition>>,
	importCSS?: string[],
) {
	let allCss = makeBaseCSS();

	let logicalPxScale = options.logicalPxScale ?? 1;
	let logicalPxScaleNarrow = options.logicalPxScaleNarrow ?? 16 / 14;
	_currentLogicalPxScale = logicalPxScale;
	_currentLogicalPxScaleNarrow = logicalPxScaleNarrow;
	_currentGap = options.gap ?? 8;

	allCss.html = { fontSize: logicalPxScale * LOGICAL_PX_PER_REM + "px" };
	allCss["@media (max-width: 600px)"] = {
		html: { fontSize: logicalPxScaleNarrow * LOGICAL_PX_PER_REM + "px" },
	};
	allCss[`.${CLASS_TEXTCONTROL}`] = addTextStyleCSS(
		{},
		{ ...defaultControlTextStyle, ...options.controlTextStyle },
	);

	// set focus decoration if defined (otherwise, use browser default)
	if (options.focusDecoration) {
		let focusStyle = addDecorationStyleCSS({}, options.focusDecoration);
		allCss[`.${CLASS_UI}[tabindex]:focus-visible`] = focusStyle;
		allCss[`.${CLASS_UI}[role=listitem]:focus`] = focusStyle;
		allCss[`.${CLASS_TOGGLE}>input:focus-visible`] = focusStyle;
		allCss[`.${CLASS_UI}:focus`] = { outline: "0", outlineOffset: "0" };
	}

	// set body margin/padding and background, if requested
	if (options.updateBodyStyle) {
		allCss.body = {
			margin: "0",
			padding: "0",
			background: options.pageBackground
				? String(options.pageBackground)
				: undefined,
		};
	}

	// add named styles, if any
	if (namedStyles) {
		for (let elementType in namedStyles) {
			for (let styleName in namedStyles[elementType]) {
				let style = namedStyles[elementType][styleName]!;
				let fullName = elementType + "-" + styleName;
				Object.assign(allCss, _generateNamedStyleCSS(fullName, style));
			}
		}
	}

	// update or create style sheets with new CSS
	let update = ++_cssPending;
	setTimeout(() => {
		if (_cssPending !== update) return;
		_updateStyleSheets(allCss, importCSS);
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

/** @internal Helper method to convert a CSS length unit *or* pixels number to a CSS string or given default string (e.g. `auto`) */
export function getCSSLength(
	length?: StyleOverrides.Offsets,
	defaultValue: any = "auto",
): string {
	if (length === "gap") length = _currentGap;
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

/** @internal Helper function to apply CSS classes and styles to an element */
export function applyStyles(
	element: HTMLElement,
	elementType: StyleElementType | undefined,
	styleName: string | undefined,
	style: StyleOverrides | undefined,
	systemClass?: string,
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

	// set class name
	let className = CLASS_UI;
	if (isTextControl) className += " " + CLASS_TEXTCONTROL;
	if (isContainer) className += " " + CLASS_CONTAINER;
	if (systemClass) className += " " + systemClass;
	if (elementType) {
		// undefined styleName means "use default style"
		className += ` ${CLASS_NAMED}${elementType}-${styleName || "default"}`;
	}
	element.className = className;

	// apply overrides inline
	let inline: any = {};
	if (style) {
		addDimensionsCSS(inline, style);
		addDecorationStyleCSS(inline, style);
		if (isTextControl) addTextStyleCSS(inline, style);
	}
	if (position) addPositionCSS(inline, position);
	if (layout) addContainerLayoutCSS(inline, layout);

	// apply inline CSS properties as a CSS string
	let cssText = getCSSText(inline);
	if (cssText || (element as any)["HAS_STYLES"]) {
		element.style.cssText = cssText;
		(element as any)["HAS_STYLES"] = true;
	}
}

/** Generate CSS rules for a named style */
function _generateNamedStyleCSS(
	className: string,
	definition: WebNamedStyleDefinition,
) {
	const result: { [selector: string]: any } = {};
	const baseSel = `*.${CLASS_NAMED}${className}`;

	// Helper for combining style properties
	const _makeStyle = (def: StyleOverrides): Partial<CSSStyleDeclaration> =>
		addDecorationStyleCSS(addTextStyleCSS(addDimensionsCSS({}, def), def), def);

	// Base rule - convert StyleOverrides to CSS
	const baseCss = _makeStyle(definition);
	if (Object.keys(baseCss).length > 0) {
		result[baseSel] = baseCss;
	}

	// Extract state and selector style objects
	const stateStyles: { [state: string]: StyleOverrides } = {};
	const selectorStyles: { [selector: string]: StyleOverrides } = {};
	for (const key in definition) {
		const value = (definition as any)[key];
		if (typeof value !== "object") continue;
		if (key.startsWith("+")) {
			stateStyles[key] = value;
		} else if (key.startsWith(":") || key.startsWith("[")) {
			selectorStyles[key] = value;
		}
	}

	// Check if +pressed is defined (affects +hover and +focus selectors)
	const hasPressed = "+pressed" in stateStyles;

	// State rules in priority order
	for (let state in stateStyles) {
		let selector: string | undefined;
		switch (state) {
			case "+hover":
				selector = hasPressed
					? `${baseSel}:hover:not([disabled]):not(:focus):not(:active):not([aria-pressed=true])`
					: `${baseSel}:hover:not([disabled]):not(:focus)`;
				break;
			case "+focus":
				selector = hasPressed
					? `${baseSel}:focus:not([disabled]):not(:active):not([aria-pressed=true])`
					: `${baseSel}:focus:not([disabled])`;
				break;
			case "+pressed":
				selector = `${baseSel}:active:not([disabled]),${baseSel}[aria-pressed=true]:not([disabled])`;
				break;
			case "+disabled":
				selector = `${baseSel}[disabled]`;
				break;
			case "+readonly":
				selector = `${baseSel}[readonly]`;
				break;
		}
		let stateCss = _makeStyle(stateStyles[state]!);
		if (!selector || Object.keys(stateCss).length === 0) continue;
		result[selector] = stateCss;
	}

	// Handle CSS selector properties
	for (const selector in selectorStyles) {
		const selectorCss = _makeStyle(selectorStyles[selector]!);
		if (Object.keys(selectorCss).length > 0) {
			result[baseSel + selector] = selectorCss;
		}
	}

	return result;
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
	return result;
}

/** Helper function to append CSS styles to given object for a given `Dimensions` object */
function addDimensionsCSS(
	result: Partial<CSSStyleDeclaration>,
	dimensions: StyleOverrides,
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
	return result;
}

/** Helper function to append CSS styles to given object for a given `TextStyle` object */
function addTextStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	textStyle: StyleOverrides,
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
	return result;
}

/** Helper function to append CSS styles to given object for a given `Decoration` object */
function addDecorationStyleCSS(
	result: Partial<CSSStyleDeclaration>,
	decoration: StyleOverrides,
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
	return result;
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
	return result;
}

function addPadding(
	result: Partial<CSSStyleDeclaration>,
	padding?: StyleOverrides.Offsets,
) {
	if (padding !== undefined) result.padding = getCSSLength(padding);
	if (typeof padding === "object") {
		if ("start" in padding)
			result.paddingInlineStart = getCSSLength(padding.start);
		if ("end" in padding) result.paddingInlineEnd = getCSSLength(padding.end);
	}
	return result;
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
function _updateStyleSheets(
	css: { [spec: string]: any },
	importCSS?: string[],
) {
	let sheet: CSSStyleSheet;
	let supportAdoptedStyleSheets =
		"adoptedStyleSheets" in document &&
		"CSSStyleSheet" in window &&
		"replace" in CSSStyleSheet.prototype;
	if (supportAdoptedStyleSheets) {
		let _newAdoptedSheet = new CSSStyleSheet();
		document.adoptedStyleSheets = [
			...document.adoptedStyleSheets,
			_newAdoptedSheet,
		].filter((s) => s !== _adoptedSheet);
		sheet = _adoptedSheet = _newAdoptedSheet;
	} else {
		_cssElt?.remove();
		_cssElt = document.createElement("style");
		_cssElt.setAttribute("type", "text/css");
		document.head!.appendChild(_cssElt);
		sheet = _cssElt.sheet!;
	}
	if (importCSS?.length) _addCSSImports(importCSS);
	_addCSSRules(css, sheet);
}

/** Helper function to add new imports to the import stylesheet */
function _addCSSImports(importCSS: string[]) {
	_cssImportElt?.remove();
	_cssImportElt = document.createElement("style");
	_cssImportElt.setAttribute("type", "text/css");
	document.head!.appendChild(_cssImportElt);
	let sheet = _cssImportElt.sheet!;
	for (let importUrl of importCSS) {
		try {
			sheet.insertRule(
				`@import url(${JSON.stringify(importUrl)});`,
				sheet.cssRules.length,
			);
		} catch (e) {
			console.warn(e);
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
