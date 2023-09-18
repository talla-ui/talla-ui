import { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UITheme } from "../UITheme.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a cell container component
 *
 * @description A cell container functions like a regular container component, and lays out other components either vertically (default) or horizontally.
 *
 * **JSX tag:** `<cell>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UICell extends UIContainer {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIContainer,
			this,
			| "textDirection"
			| "margin"
			| "background"
			| "textColor"
			| "borderRadius"
			| "dropShadow"
			| "opacity"
			| "cellStyle"
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
	background?: UIColor | string = undefined;

	/** Text color for labels within this cell */
	textColor?: UIColor | string = undefined;

	/** Opacity level (0–1), defaults to undefined (opaque) */
	opacity?: number = undefined;

	/** Drop shadow elevation level (0–1), defaults to undefined (no dropshadow) */
	dropShadow?: number = undefined;

	/** The style to be applied to this cell */
	cellStyle?: UITheme.StyleConfiguration<UICellStyle> = undefined;
}

/**
 * A style class that includes default style properties for instances of {@link UICell}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom cell styles, see {@link UITheme.BaseStyle} for details.
 */
export class UICellStyle extends UITheme.BaseStyle<
	"Cell",
	UIComponent.DimensionsStyleType & UIComponent.DecorationStyleType
> {
	constructor() {
		super("Cell", UICellStyle);
	}
}

/**
 * A view class that represents a cell with animated style updates
 *
 * @description An animated cell container functions like a regular cell container (see {@link UICell}), but shows animations for all style-related updates where possible.
 *
 * **JSX tag:** `<animatedcell>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIAnimatedCell extends UICell {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
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
