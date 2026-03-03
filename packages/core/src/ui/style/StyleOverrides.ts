import type { UIColor } from "./UIColor.js";
import type { UIGradient } from "./UIGradient.js";

/**
 * A type that defines style properties for UI elements.
 * - Use builder method calls for setting or binding individual style properties.
 * - Use {@link UIElement.setStyle()} to update appearance at runtime without bindings.
 */
export type StyleOverrides = {
	/** The outer width of the element, in pixels or as a string with unit. */
	width?: string | number;
	/** The outer height of the element, in pixels or as a string with unit. */
	height?: string | number;
	/** The minimum width of the element, in pixels or as a string with unit. */
	minWidth?: string | number;
	/** The maximum width of the element, in pixels or as a string with unit. */
	maxWidth?: string | number;
	/** The minimum height of the element, in pixels or as a string with unit. */
	minHeight?: string | number;
	/** The maximum height of the element, in pixels or as a string with unit. */
	maxHeight?: string | number;
	/** The flex growth factor. */
	flexGrow?: number;
	/** The flex shrink factor. */
	flexShrink?: number;
	/** The padding within the element, in pixels, CSS string, or separate offset values. */
	padding?: StyleOverrides.Offsets;
	/** The margin around the element, in pixels, CSS string, or separate offset values. */
	margin?: StyleOverrides.Offsets;
	/** The opacity level, from 0 (transparent) to 1 (opaque). */
	opacity?: number;
	/** The text direction, either "rtl" or "ltr". */
	textDirection?: "rtl" | "ltr";
	/** The text alignment (CSS value). */
	textAlign?: string;
	/** The font family (CSS value). */
	fontFamily?: string;
	/** The font size, in pixels or as a string with unit. */
	fontSize?: string | number;
	/** The font weight (CSS value). */
	fontWeight?: string | number;
	/** The letter spacing, in pixels or as a string with unit. */
	letterSpacing?: string | number;
	/** True to use monospaced (tabular) numeric characters. */
	tabularNums?: boolean;
	/** The line height relative to font size (CSS value, not in pixels). */
	lineHeight?: string | number;
	/** The line break handling mode (CSS white-space value). */
	lineBreakMode?:
		| "normal"
		| "nowrap"
		| "pre"
		| "pre-wrap"
		| "pre-line"
		| "ellipsis"
		| "clip"
		| "";
	/** True for bold text; overrides the fontWeight value. */
	bold?: boolean;
	/** True for italic text. */
	italic?: boolean;
	/** True for all-uppercase text. */
	uppercase?: boolean;
	/** True for text using small caps. */
	smallCaps?: boolean;
	/** True for underlined text. */
	underline?: boolean;
	/** True for struck-through text. */
	strikeThrough?: boolean;
	/** True if text can be selected by the user. */
	userTextSelect?: boolean;
	/** The background style or color, or a gradient. */
	background?: UIColor | UIGradient | string;
	/** The text color. */
	textColor?: UIColor;
	/** The border color, or an object with separate colors per side. */
	borderColor?:
		| UIColor
		| {
				top?: UIColor;
				bottom?: UIColor;
				left?: UIColor;
				right?: UIColor;
				start?: UIColor;
				end?: UIColor;
		  };
	/** The border style (CSS value); defaults to "solid". */
	borderStyle?: string;
	/** The border width, in pixels, CSS string, or separate offset values. */
	borderWidth?: StyleOverrides.Offsets;
	/** The border radius, in pixels, CSS string, or an object with separate values per corner. */
	borderRadius?:
		| string
		| number
		| {
				topLeft?: string | number;
				topRight?: string | number;
				bottomLeft?: string | number;
				bottomRight?: string | number;
				topStart?: string | number;
				bottomStart?: string | number;
				topEnd?: string | number;
				bottomEnd?: string | number;
		  };
	/** The drop shadow blur distance in pixels; negative values create inset shadows. */
	dropShadow?: number;
	/** The cursor style (CSS value). */
	cursor?: string;
	/** Additional CSS style properties. */
	css?: Partial<CSSStyleDeclaration>;
};

export namespace StyleOverrides {
	/** A type that represents offset measurements for padding, margin, or border width. */
	export type Offsets =
		| string
		| number
		| {
				x?: string | number;
				y?: string | number;
				top?: string | number;
				bottom?: string | number;
				left?: string | number;
				right?: string | number;
				start?: string | number;
				end?: string | number;
		  };
}
