import { UIColor } from "../UIColor.js";
import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";
import { UIControl } from "./UIControl.js";

/**
 * A view class that represents a horizontal or vertical line separator
 *
 * @description A separator component is rendered on-screen as a single horizontal or vertical line.
 *
 * **JSX tag:** `<separator>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UISeparator extends UIControl {
	/** Creates a new separator view object */
	constructor() {
		super();
		this.style = UIStyle.Separator;
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIControl,
			this,
			"thickness" | "margin" | "color" | "vertical"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/** Separator line thickness, in pixels or CSS length with unit */
	thickness: string | number = 1;

	/** Separator line color, defaults to the theme separator color */
	color: UIColor | string = "@Separator";

	/** The amount of space to be added perpendicular to the separator, in pixels or CSS length with unit */
	margin?: string | number;

	/** True if the separator should be drawn as a vertical line instead of a horizontal line */
	vertical?: boolean;
}
