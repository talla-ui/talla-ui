import type { RenderContext, View } from "../../app/index.js";
import type { UIColor } from "../UIColor.js";
import type { UIComponent } from "../UIComponent.js";
import type { UIStyle } from "../UIStyle.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a cell container component
 *
 * @description A cell container functions like a basic container component (using column layout), taking up as much space as possible by default, and with additional properties for decoration and styling.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UICell extends UIContainer {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<
			UIContainer,
			this,
			| "textDirection"
			| "margin"
			| "background"
			| "textColor"
			| "borderRadius"
			| "opacity"
			| "effect"
			| "style"
			| "allowFocus"
			| "allowKeyboardFocus"
		> & {
			/** Event that's emitted when the mouse cursor enters the cell area */
			onMouseEnter?: string;
			/** Event that's emitted when the mouse cursor leaves the cell area */
			onMouseLeave?: string;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		super.applyViewPreset(preset);
	}

	/** Text direction (rtl or ltr) for all components within this cell */
	textDirection?: "ltr" | "rtl" = undefined;

	/** Additional space to be added around the entire cell, in pixels or CSS length with unit, **or** an object with separate offset values */
	margin?: UIComponent.Offsets = undefined;

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

	/** The style to be applied to this cell */
	style?: UIStyle.TypeOrOverrides<UICell.StyleType> = undefined;

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
	/** The type definition for styles applicable to {@link UICell.style} */
	export type StyleType = UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType;
}

/**
 * A view class that represents a cell with animated style updates
 *
 * @description An animated cell container functions like a regular cell container (see {@link UICell}), but shows animations for all style-related updates where possible.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIAnimatedCell extends UICell {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<
			UICell,
			this,
			"animationDuration" | "animationTiming"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/** Duration of _all_ style update animations */
	animationDuration?: number;

	/**
	 * Timing curve of _all_ style update animations
	 * - This property may be set to `linear`, `ease`, or an array with cubic bezier curve parameters.
	 */
	animationTiming?: "linear" | "ease" | [number, number, number, number];
}
