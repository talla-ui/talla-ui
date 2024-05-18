import type { View } from "../../app/index.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a column container component
 *
 * @description A column container lays out its contained components vertically.
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIColumn extends UIContainer {
	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: View.ExtendPreset<
			UIContainer,
			this,
			"width" | "spacing" | "align" | "distribute" | "reverse"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/** True if content should be displayed in reverse order */
	reverse = false;

	/** Column width, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/**
	 * Space between components, in pixels or CSS length with unit
	 * - This property is undefined by default.
	 * - If this property is set, its value overrides `separator` from the current {@link UIContainer.layout layout} object (if any).
	 */
	spacing?: string | number = undefined;

	/**
	 * Alignment of content along the horizontal axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.gravity}.
	 */
	align?: UIContainer.Layout["gravity"] = undefined;

	/**
	 * Distribution of content along the vertical axis
	 * - If this property is set, its value overrides {@link UIContainer.Layout layout.distribution}.
	 */
	distribute?: UIContainer.Layout["distribution"] = undefined;
}
