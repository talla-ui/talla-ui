import type { View } from "../../app/index.js";
import { UITheme } from "../UITheme.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a row container component
 *
 * @description A row container lays out its contained components horizontally.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIRow extends UIContainer {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ViewPreset<
			UIContainer,
			this,
			"height" | "spacing" | "align" | "gravity"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/** Row height, in pixels or CSS length with unit */
	height?: string | number = undefined;

	/**
	 * Space between components, in pixels or CSS length with unit
	 * - This property is set to {@link UITheme.rowSpacing} by default.
	 * - If this property is set, its value overrides `separator` from the current {@link UIContainer.layout layout} object (if any).
	 */
	spacing?: string | number = UITheme.getSpacing();

	/**
	 * Alignment of content along the horizontal axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.distribution}.
	 */
	align?: UIContainer.Layout["distribution"] = undefined;

	/**
	 * Alignment of content along the vertical axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.gravity}.
	 */
	gravity?: UIContainer.Layout["gravity"] = undefined;
}
