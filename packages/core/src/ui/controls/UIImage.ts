import type { StringConvertible } from "@talla-ui/util";
import { ViewBuilder } from "../../app/index.js";
import { BindingOrValue } from "../../object/Binding.js";
import { UIIconResource, UIStyle } from "../style/index.js";
import type { UI } from "../UI.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents an image or icon control
 *
 * @description An image UI element is rendered as a rectangular image, loaded from the provided icon resource or (data or remote) URL.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIImage extends UIElement {
	/** Creates a new image view object with the specified URL */
	constructor(source?: StringConvertible | UIIconResource) {
		super();
		this.source = source;
	}

	/** Image source URL, or icon resource */
	source?: StringConvertible;

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
}

export namespace UIImage {
	/**
	 * Creates a view builder for an image element
	 * @param source The image source URL or icon resource, or a binding to a string or icon resource.
	 * @returns A builder object for configuring the image.
	 * @see {@link UIImage}
	 */
	export function imageBuilder(
		source?: BindingOrValue<StringConvertible | UIIconResource>,
	) {
		return new ImageBuilder().source(source);
	}

	/**
	 * A builder class for creating `UIImage` instances.
	 * - Objects of this type are returned by the `UI.Image()` function.
	 */
	export class ImageBuilder extends UIElement.ElementBuilder<UIImage> {
		/** The initializer that is used to create each image instance */
		readonly initializer = new ViewBuilder.Initializer(UIImage);

		/**
		 * Sets the image source, using {@link UIImage.source}.
		 * @param source The URL or {@link UIIconResource} for the image, or a binding to a string or icon resource.
		 * @returns The builder instance for chaining.
		 */
		source(
			source?: BindingOrValue<StringConvertible | UIIconResource | undefined>,
		) {
			return this.setProperty("source", source);
		}

		/**
		 * Applies a style to the image
		 * @param style The name of a theme image style, a {@link UIStyle} instance, a style options (overrides) object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		imageStyle(
			style?: BindingOrValue<
				UI.styles.ImageStyleName | UIStyle | UIStyle.StyleOptions | undefined
			>,
		) {
			return this.setStyleProperty(style, UIStyle.theme.image);
		}

		/**
		 * Allows the image to receive input focus.
		 * @param allow If `true`, the image can be focused. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the image to receive input focus via the keyboard.
		 * @param allow If `true`, the image can be focused with the keyboard. Defaults to `true`.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}
	}
}
