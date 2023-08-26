import { View } from "../../app/index.js";
import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";
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
		this.style = UIStyle.Row;
		this.spacing = UITheme.getRowSpacing();
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<UIContainer, this, "height">
	) {
		super.applyViewPreset(preset);
	}

	/** Row height, in pixels or CSS length with unit */
	height?: string | number;
}

/**
 * A view class that represents a row with all contained components aligned to the right (or left for RTL text direction)
 * - Refer to {@link UIRow} for information on row containers.
 * - This class sets {@link UIContainer.distribution} to `end`.
 * @see UIRow
 *
 * **JSX tag:** `<oppositerow>`
 */
export class UIOppositeRow extends UIRow {
	constructor(...content: View[]) {
		super(...content);
		this.distribution = "end";
	}
}

/**
 * A view class that represents a row with all contained components aligned in the center
 * - Refer to {@link UIRow} for information on row containers.
 * - This class sets {@link UIContainer.distribution} to `center`.
 *
 * **JSX tag:** `<centerrow>`
 */
export class UICenterRow extends UIRow {
	constructor(...content: View[]) {
		super(...content);
		this.distribution = "center";
	}
}
