import type { View } from "../../app/index.js";
import type { StringConvertible } from "../../base/index.js";
import { UIComponent } from "../UIComponent.js";
import type { UIStyle } from "../UIStyle.js";

/**
 * A view class that represents an image control
 *
 * @description An image component is rendered on-screen as a rectangular image, loaded from the provided (data or remote) URL.
 *
 * @online_docs Refer to the online documentation for more documentation on using this UI component class.
 */
export class UIImage extends UIComponent {
	/** Creates a new image view object with the specified URL */
	constructor(url?: StringConvertible) {
		super();
		this.url = url;
	}

	override applyViewPreset(
		preset: View.ExtendPreset<
			UIComponent,
			this,
			"url" | "width" | "height" | "style" | "allowFocus" | "allowKeyboardFocus"
		> & {
			/** Event that's emitted when the image couldn't be loaded */
			onLoadError?: string;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		super.applyViewPreset(preset);
	}

	/** The image resource URL */
	url?: StringConvertible;

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
	style?: UIStyle.TypeOrOverrides<UIImage.StyleType> = undefined;
}

export namespace UIImage {
	/** The type definition for styles applicable to {@link UIImage.style} */
	export type StyleType = UIComponent.DimensionsStyleType &
		UIComponent.DecorationStyleType;
}
