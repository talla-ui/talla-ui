import type { ViewBuilder } from "../../app/index.js";
import { UITheme } from "../UITheme.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a row container element
 *
 * @description A row container lays out its contained UI elements horizontally.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
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
			"height" | "spacing" | "align" | "gravity" | "reverse" | "wrap"
		>,
		...content: ViewBuilder[]
	) => ViewBuilder<UIContainer>;

	/** True if content should be displayed in reverse order */
	reverse = false;

	/**
	 * True if row content should wrap automatically
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.wrapContent}.
	 */
	wrap?: boolean = undefined;

	/** Row height, in pixels or CSS length with unit */
	height?: string | number = undefined;

	/**
	 * Space between UI elements, in pixels or CSS length with unit
	 * - This property is set to {@link UITheme.rowSpacing} by default.
	 * - If this property is set, its value overrides `separator` from the current {@link UIContainer.layout layout} object (if any).
	 */
	spacing?: string | number = UITheme.getSpacing();

	/**
	 * Alignment of content along the horizontal axis, defaults to `start` if not set
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.distribution}.
	 */
	align?: UIContainer.Layout["distribution"] = undefined;

	/**
	 * Alignment of content along the vertical axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.gravity}.
	 */
	gravity?: UIContainer.Layout["gravity"] = undefined;
}
