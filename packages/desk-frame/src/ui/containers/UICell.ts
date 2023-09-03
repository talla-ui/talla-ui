import type { View } from "../../app/index.js";
import { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";
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
	/** Creates a new cell container view object with the provided view content */
	constructor(...content: View[]) {
		super(...content);
		this.style = UIStyle.Cell;

		// set selection state automatically
		this.listen((e) => {
			if (e.source === this) {
				if (e.name === "Select") {
					this.selected = true;
				} else if (e.name === "Deselect") {
					this.selected = false;
				}
			}
		});
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIContainer,
			this,
			| "margin"
			| "background"
			| "textDirection"
			| "textColor"
			| "borderThickness"
			| "borderColor"
			| "borderStyle"
			| "borderRadius"
			| "dropShadow"
			| "opacity"
		> & {
			/** Options for the appearance of this cell; most of these are overridden by individual properties */
			decoration?: UIStyle.Definition.Decoration;
			/** Event that's emitted when the mouse cursor enters the cell area */
			onMouseEnter?: string;
			/** Event that's emitted when the mouse cursor leaves the cell area */
			onMouseLeave?: string;
			/** Event that's emitted when the cell is selected */
			onSelect?: string;
			/** Event that's emitted when the cell is deselected */
			onDeselect?: string;
		},
	) {
		let decoration = preset.decoration;
		delete preset.decoration;

		super.applyViewPreset(preset);

		// apply style overrides
		if (decoration) this.decoration = { ...this.decoration, ...decoration };
	}

	protected override applyStyle(style: UIStyle) {
		super.applyStyle(style);
		this.decoration = style.getStyles().decoration;
	}

	/**
	 * The current selection state
	 * - This property is set automatically, based on Select and Deselect events.
	 */
	selected = false;

	/**
	 * Style definitions related to the appearance of this cell
	 * - Most of the properties of this style definition object can also be overridden by individual properties of the {@link UICell} object.
	 */
	decoration!: Readonly<UIStyle.Definition.Decoration>;

	/** Additional space to be added around the entire cell, in pixels or CSS length with unit, **or** an object with separate offset values */
	margin?: UIStyle.Offsets;

	/** Cell background color, defaults to undefined (no fill) */
	background?: UIColor | string;

	/** Text color, defaults to undefined (no change of color) */
	textColor?: UIColor | string;

	/** Text direction (rtl or ltr) for all components within this cell */
	textDirection?: "ltr" | "rtl";

	/** Border color */
	borderColor?: UIColor | string;

	/** Border style (CSS style name), defaults to undefined (solid) */
	borderStyle?: string;

	/** Border thickness, in pixels or CSS length with unit, **or** an object with separate thickness values */
	borderThickness?: UIStyle.Offsets;

	/** Border radius, in pixels or CSS length with unit */
	borderRadius?: string | number;

	/** Drop shadow elevation level (0–1), defaults to undefined (no dropshadow) */
	dropShadow?: number;

	/** Opacity level (0–1), defaults to undefined (opaque) */
	opacity?: number;
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
