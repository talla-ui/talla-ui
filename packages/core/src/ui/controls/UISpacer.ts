import type { ViewBuilder } from "../../app/index.js";
import { UIRenderable } from "../UIRenderable.js";

/**
 * A view class that represents a flexible control without any content
 *
 * @description A spacer UI element is rendered on-screen as an empty placeholder.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UISpacer extends UIRenderable {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	declare static getViewBuilder: (
		preset: ViewBuilder.ExtendPreset<
			typeof UIRenderable,
			UISpacer,
			"width" | "height" | "minWidth" | "minHeight"
		>,
	) => ViewBuilder<UIRenderable>;

	/**
	 * Creates a new spacer element, with optional width and height
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
