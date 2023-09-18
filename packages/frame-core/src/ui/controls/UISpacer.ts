import { UIComponent } from "../UIComponent.js";

/**
 * A view class that represents a flexible control without any content
 *
 * @description A spacer component is rendered on-screen as an empty placeholder.
 *
 * **JSX tag:** `<spacer>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UISpacer extends UIComponent {
	/**
	 * Creates a preset spacer class with the specified height
	 * @param height The target spacer height, in pixels or CSS length with unit; if undefined, the spacer will occupy all available space
	 * @param minHeight The minimum spacer height, in pixels or CSS length with unit
	 * @returns A class that can be used to create instances of this spacer class with the provided height
	 */
	static withHeight(height?: string | number, minHeight?: string | number) {
		return this.with({ height, minHeight });
	}

	/**
	 * Creates a preset spacer class with the specified width
	 * @param width The target spacer width, in pixels or CSS length with unit; if undefined, the spacer will occupy all available space
	 * @param minWidth The minimum spacer width, in pixels or CSS length with unit
	 * @returns A class that can be used to create instances of this spacer class with the provided width
	 */
	static withWidth(width?: string | number, minWidth?: string | number) {
		return this.with({ width, minWidth });
	}

	/**
	 * Applies the provided preset properties to this object
	 * - This method is called automatically. Do not call this method after constructing a UI component.
	 */
	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			"width" | "height" | "minWidth" | "minHeight"
		>,
	) {
		super.applyViewPreset(preset);
	}

	/**
	 * Creates a new spacer component, with optional width and height
	 * @param width The spacer width, in pixels or CSS length with unit
	 * @param height The spacer height, in pixels or CSS length with unit
	 */
	constructor(
		width?: string | number,
		height?: string | number,
		minWidth?: string | number,
		minHeight?: string | number,
	) {
		super();
		this.width = width;
		this.height = height;
		this.minWidth = minWidth;
		this.minHeight = minHeight;
	}

	/** Spacer width (in pixels or string with unit) */
	width?: string | number;

	/** Spacer height (in pixels or string with unit) */
	height?: string | number;

	/** Spacer minimum width (in pixels or string with unit) */
	minWidth?: string | number;

	/** Spacer minimum height (in pixels or string with unit) */
	minHeight?: string | number;
}
