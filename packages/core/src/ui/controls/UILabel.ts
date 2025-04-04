import type { StringConvertible } from "@talla-ui/util";
import type { ViewBuilder } from "../../app/index.js";
import type { UIColor, UIIconResource, UIStyle } from "../style/index.js";
import { UIRenderable } from "../UIRenderable.js";

/**
 * A view class that represents a label control
 *
 * @description A label UI element is rendered on-screen as a stand-alone piece of text.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UILabel extends UIRenderable {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIRenderable,
			UILabel,
			| "headingLevel"
			| "htmlFormat"
			| "text"
			| "icon"
			| "iconSize"
			| "iconMargin"
			| "iconColor"
			| "wrap"
			| "selectable"
			| "padding"
			| "width"
			| "bold"
			| "italic"
			| "color"
			| "fontSize"
			| "align"
			| "dim"
			| "style"
			| "allowFocus"
			| "allowKeyboardFocus"
		>,
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		return super.getViewBuilder(preset);
	}

	/** Creates a new label view object with the specified text */
	constructor(text?: StringConvertible) {
		super();
		this.text = text;
	}

	/** The label text to be displayed */
	text?: StringConvertible;

	/** The label icon to be displayed */
	icon?: UIIconResource = undefined;

	/** Icon size (in pixels or string with unit) */
	iconSize?: string | number;

	/** Space between the icon and label text (in pixels or string with unit) */
	iconMargin?: string | number;

	/** Icon color */
	iconColor?: UIColor;

	/**
	 * True if text should wrap if the text is too long to fit on one line
	 * - If set, this property overrides `lineBreakMode` (see {@link UIRenderable.TextStyle}) to `pre-wrap`.
	 */
	wrap?: boolean = undefined;

	/**
	 * True if text should be user-selectable using input gestures, mouse, or keyboard
	 * - If set, this property overrides `userSelect` (see {@link UIRenderable.TextStyle}).
	 */
	selectable?: boolean = undefined;

	/**
	 * Text heading level
	 * - Heading level 1 refers to the most prominent heading, i.e. `<h1>` HTML element.
	 * - This property can't be changed after rendering.
	 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;

	/** True if text should be rendered as HTML instead of plain text */
	htmlFormat?: boolean;

	/**
	 * True if this label may receive input focus
	 * - This property isn't observed, and can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this label may receive input focus using the keyboard (e.g. Tab key)
	 * - This property isn't observed, and can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;

	/** Target width of the label, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/**
	 * Padding around the label, in pixels or CSS length with unit, **or** an object with separate offset values
	 * - If this property is set, its value overrides `padding` from the current label style.
	 */
	padding?: UIRenderable.Offsets = undefined;

	/**
	 * The text alignment to be applied to this label
	 * - If set, this property overrides the `textAlign` property of the current label style.
	 */
	align?: UIRenderable.TextStyle["textAlign"] = undefined;

	/**
	 * The font size to be applied to this label (pixels or string with unit)
	 * - If set, this property overrides the `fontSize` property of the current label style.
	 */
	fontSize?: string | number;

	/**
	 * True if this label should be displayed using bold text
	 * - If set, this property overrides the `bold` property of the current label style.
	 */
	bold?: boolean = undefined;

	/**
	 * True if this label should be displayed using bold text
	 * - If set, this property overrides the `italic` property of the current label style.
	 */
	italic?: boolean = undefined;

	/**
	 * The text color to be applied to this label
	 * - If set, this property overrides the `textColor` property of the current label style.
	 */
	color?: UIColor = undefined;

	/**
	 * The opacity to be applied to this label, or `true` to use lower opacity
	 * - If set, this property overrides the `opacity` property of the current label style.
	 */
	dim?: number | boolean = undefined;

	/** The style to be applied to this label */
	style?: UILabel.StyleValue = undefined;
}

export namespace UILabel {
	/** A style object or overrides that can be applied to {@link UILabel} */
	export type StyleValue =
		| UIStyle<UILabel.StyleDefinition>
		| UILabel.StyleDefinition
		| undefined;

	/** The type definition for styles applicable to {@link UILabel.style} */
	export type StyleDefinition = UIRenderable.Dimensions &
		UIRenderable.Decoration &
		UIRenderable.TextStyle;
}
