import type { RenderContext, View } from "../../app/index.js";
import type { UIColor } from "../UIColor.js";
import type { UIComponent } from "../UIComponent.js";
import type { UIStyle } from "../UIStyle.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a cell container component
 *
 * @description A cell container functions like a regular container component, and lays out other components either vertically (default) or horizontally.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UICell extends UIContainer {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ViewPreset<
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
		> & {
			/** Event that's emitted when the mouse cursor enters the cell area */
			onMouseEnter?: string;
			/** Event that's emitted when the mouse cursor leaves the cell area */
			onMouseLeave?: string;
		},
	) {
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
		preset: View.ViewPreset<
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
