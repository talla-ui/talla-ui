import type { ViewBuilder } from "../../app/index.js";
import { UITheme } from "../UITheme.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a row container component
 *
 * @description A row container lays out its contained components horizontally.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export class UIRow extends UIContainer {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	declare static getViewBuilder: (
		preset: ViewBuilder.ExtendPreset<
			typeof UIContainer,
			UIRow,
			"height" | "spacing" | "align" | "gravity" | "reverse"
		>,
		...content: ViewBuilder[]
	) => ViewBuilder<UIContainer>;

	/** True if content should be displayed in reverse order */
	reverse = false;

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
