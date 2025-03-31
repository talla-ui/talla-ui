import type { StringConvertible } from "@talla-ui/util";
import type { ViewBuilder } from "../../app/index.js";
import { UIColor, UIIconResource, UIStyle } from "../style/index.js";
import { UIRenderable } from "../UIRenderable.js";

/**
 * A view class that represents an image or icon control
 *
 * @description An image UI element is rendered on-screen as a rectangular image, loaded from the provided icon resource or (data or remote) URL.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI element class.
 */
export class UIImage extends UIRenderable {
	/**
	 * Creates a new {@link ViewBuilder} instance for the current view class
	 * @see {@link View.getViewBuilder}
	 * @docgen {hide}
	 */
	static override getViewBuilder(
		preset: ViewBuilder.ExtendPreset<
			typeof UIRenderable,
			UIImage,
			| "url"
			| "icon"
			| "iconColor"
			| "width"
			| "height"
			| "style"
			| "allowFocus"
			| "allowKeyboardFocus"
		> & {
			/** Event that's emitted when the image is loaded */
			onLoad?: string;
			/** Event that's emitted when the image couldn't be loaded */
			onLoadError?: string;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		return super.getViewBuilder(preset);
	}

	/** Creates a new image view object with the specified URL */
	constructor(source?: StringConvertible | UIIconResource) {
		super();
		if (source instanceof UIIconResource) {
			this.icon = source;
		} else {
			this.url = source;
		}
	}

	/** Image resource URL */
	url?: StringConvertible;

	/** Icon image resource */
	icon?: UIIconResource;

	/** Icon color */
	iconColor?: UIColor;

	/** Target width of the image, in pixels or CSS length with unit */
	width?: string | number = undefined;

	/** Target height of the image, in pixels or CSS length with unit */
	height?: string | number = undefined;

	/**
	 * True if this image may receive input focus
	 * - This property isn't observed, and can't be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this image may receive input focus using the keyboard (e.g. Tab key)
	 * - This property isn't observed, and can't be changed after rendering.
	 * - If this property is set to true, allowFocus is assumed to be true as well and no longer checked.
	 */
	allowKeyboardFocus?: boolean;

	/** The style to be applied to this image */
	style?: UIImage.StyleValue = undefined;
}

export namespace UIImage {
	/** A style object or overrides that can be applied to {@link UIImage} */
	export type StyleValue =
		| UIStyle<UIImage.StyleDefinition>
		| UIImage.StyleDefinition
		| undefined;

	/** The type definition for styles applicable to {@link UIImage.style} */
	export type StyleDefinition = UIRenderable.Dimensions &
		UIRenderable.Decoration;
}
