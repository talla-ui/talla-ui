import type { View } from "../../app/index.js";
import { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UITheme } from "../UITheme.js";

const SEPARATOR_COLOR = new UIColor("Separator");

/**
 * A view class that represents a horizontal or vertical line separator
 *
 * @description A separator component is rendered on-screen as a single horizontal or vertical line.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UISeparator extends UIComponent {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<
			UIComponent,
			this,
			"thickness" | "margin" | "color" | "vertical"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/** Separator line thickness, in pixels or CSS length with unit */
	thickness: string | number = 1;

	/** Separator line color, defaults to the theme separator color */
	color?: UIColor = SEPARATOR_COLOR;

	/**
	 * The amount of space to be added perpendicular to the separator, in pixels or CSS length with unit
	 * - This property is set by default to the value of {@link UITheme.rowSpacing}
	 */
	margin?: string | number = UITheme.getSpacing();

	/** True if the separator should be drawn as a vertical line instead of a horizontal line */
	vertical?: boolean;
}
