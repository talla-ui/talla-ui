import { View } from "../../app/index.js";
import { UIComponent } from "../UIComponent.js";
import { UITheme } from "../UITheme.js";
import { UIContainer } from "./UIContainer.js";

/**
 * A view class that represents a row container component
 *
 * @description A row container lays out its contained components horizontally.
 *
 * **JSX tag:** `<row>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIRow extends UIContainer {
	/** Creates a new row container view object with the provided view content */
	constructor(...content: View[]) {
		super(...content);
		this.spacing = UITheme.getRowSpacing();
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<UIContainer, this, "height" | "align">,
	) {
		super.applyViewPreset(preset);
	}

	/** Row height, in pixels or CSS length with unit */
	height?: string | number = undefined;

	/**
	 * Alignment of content along the horizontal axis
	 * - If this property is set, its value overrides `distribution` from the {@link UIContainer.layout} object.
	 */
	align?: UIContainer.Layout["distribution"] = undefined;
}
