import type { RenderContext, ViewBuilder } from "../../app/index.js";
import type { UIColor, UIStyle } from "../style/index.js";
import type { UIRenderable } from "../UIRenderable.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a cell container element
 *
 * @description A cell container functions like a basic container element (using column layout), taking up as much space as possible by default, and with additional properties for decoration and styling.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UICell extends UIContainer {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIContainer,
			UICell,
			| "textDirection"
			| "margin"
			| "background"
			| "textColor"
			| "borderRadius"
			| "opacity"
			| "effect"
			| "width"
			| "height"
			| "style"
			| "allowFocus"
			| "allowKeyboardFocus"
		> & {
			/** Event that's emitted when the mouse cursor enters the cell area */
			onMouseEnter?: string;
			/** Event that's emitted when the mouse cursor leaves the cell area */
			onMouseLeave?: string;
		},
		...content: ViewBuilder[]
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		return super.getViewBuilder(preset, ...content);
	}

	/** Text direction (rtl or ltr) for all UI elements within this cell */
	textDirection?: "ltr" | "rtl" = undefined;

	/** Additional space to be added around the entire cell, in pixels or CSS length with unit, **or** an object with separate offset values */
	margin?: UIRenderable.Offsets = undefined;

	/** Border radius, in pixels or CSS length with unit */
	borderRadius?: string | number = undefined;

	/** Cell background color, defaults to undefined (no fill) */
	background?: UIColor = undefined;

	/** Text color for labels within this cell */
	textColor?: UIColor = undefined;

	/** Opacity level (0–1), defaults to undefined (opaque) */
	opacity?: number = undefined;

	/** An output effect that will be applied when the cell is rendered */
	effect?: RenderContext.OutputEffect = undefined;

	/** Cell width, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** Cell height, in pixels or CSS length with unit */
	height?: string | number = undefined;

	/** The style to be applied to this cell */
	style?: UICell.StyleValue = undefined;

	/**
	 * True if this cell *itself* may receive direct input focus
	 * - This property can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this cell *itself* may receive input focus using the keyboard (e.g. Tab key)
	 * - This property can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UICell {
	/** A style object or overrides that can be applied to {@link UICell} */
	export type StyleValue =
		| UIStyle<UICell.StyleDefinition>
		| UICell.StyleDefinition
		| undefined;

	/** The type definition for styles applicable to {@link UICell.style} */
	export type StyleDefinition = UIRenderable.Dimensions &
		UIRenderable.Decoration;
}

/**
 * A view class that represents a cell with animated style updates
 *
 * @description An animated cell container functions like a regular cell container (see {@link UICell}), but shows animations for all style-related updates where possible.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIAnimatedCell extends UICell {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	declare static getViewBuilder: (
		preset: ViewBuilder.ExtendPreset<
			typeof UICell,
			UIAnimatedCell,
			"animationDuration" | "animationTiming"
		>,
		...content: ViewBuilder[]
	) => ViewBuilder<UIAnimatedCell>;

	/** Duration of _all_ style update animations */
	animationDuration?: number;

	/**
	 * Timing curve of _all_ style update animations
	 * - This property may be set to `linear`, `ease`, or an array with cubic bezier curve parameters.
	 */
	animationTiming?: "linear" | "ease" | [number, number, number, number];
}
