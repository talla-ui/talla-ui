import type { StringConvertible } from "@talla-ui/util";
import { ViewBuilder, ViewBuilderEventHandler } from "../../app/index.js";
import { BindingOrValue } from "../../object/Binding.js";
import { StyleOverrides, UIIconResource } from "../style/index.js";
import { UIElement } from "../UIElement.js";

/**
 * A view class that represents an image or icon control.
 * - Renders as a rectangular image loaded from an icon resource, data URL, or remote URL.
 * - Use the {@link UI.Image()} function to create images using a builder.
 *
 * @online_docs Refer to the online documentation for more information on using this UI element class.
 */
export class UIImage extends UIElement {
	/** Creates a new image view object with the specified source. */
	constructor(source?: StringConvertible | UIIconResource) {
		super();
		this.source = source;
	}

	/** The image source URL or icon resource. */
	source?: StringConvertible;

	/**
	 * True if this image may receive input focus.
	 * - This property is not observed and cannot be changed after rendering.
	 */
	allowFocus?: boolean;

	/**
	 * True if this image may receive input focus using the keyboard (e.g. Tab key).
	 * - This property is not observed and cannot be changed after rendering.
	 * - If set to true, {@link allowFocus} is assumed to be true as well.
	 */
	allowKeyboardFocus?: boolean;
}

export namespace UIImage {
	/**
	 * Creates a view builder for an image element.
	 * @param source The image source URL or icon resource, or a binding.
	 * @returns A builder object for configuring the image.
	 * @see {@link UIImage}
	 */
	export function imageBuilder(
		source?: BindingOrValue<StringConvertible | UIIconResource>,
	) {
		return new ImageBuilder().source(source);
	}

	/**
	 * A builder class for creating {@link UIImage} instances.
	 * - Returned by the {@link UI.Image()} function.
	 */
	export class ImageBuilder extends UIElement.ElementBuilder<UIImage> {
		/** The initializer used to create each image instance. */
		readonly initializer = new ViewBuilder.Initializer(UIImage);

		/**
		 * Sets the image source.
		 * @param source The URL or {@link UIIconResource}, or a binding.
		 * @returns The builder instance for chaining.
		 */
		source(
			source?: BindingOrValue<StringConvertible | UIIconResource | undefined>,
		) {
			return this.setProperty("source", source);
		}

		/**
		 * Applies a style to the image.
		 * @param style The style name, a style overrides object, or a binding.
		 * @returns The builder instance for chaining.
		 */
		imageStyle(style?: BindingOrValue<string | StyleOverrides | undefined>) {
			return this.style(style);
		}

		/**
		 * Allows the image to receive input focus.
		 * @param allow True to allow focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		allowFocus(allow = true) {
			return this.setProperty("allowFocus", allow);
		}

		/**
		 * Allows the image to receive input focus via the keyboard.
		 * @param allow True to allow keyboard focus; defaults to true.
		 * @returns The builder instance for chaining.
		 */
		allowKeyboardFocus(allow = true) {
			if (allow) this.allowFocus(true);
			return this.setProperty("allowKeyboardFocus", allow);
		}

		/**
		 * Handles the `Load` event emitted when the image loads successfully.
		 * @param handle The function to call, or the name of an event to emit instead.
		 * @returns The builder instance for chaining.
		 */
		onLoad(handle: string | ViewBuilderEventHandler<UIImage>) {
			return this.on("Load", handle);
		}

		/**
		 * Handles the `LoadError` event emitted when the image fails to load.
		 * @param handle The function to call, or the name of an event to emit instead.
		 * @returns The builder instance for chaining.
		 */
		onLoadError(handle: string | ViewBuilderEventHandler<UIImage>) {
			return this.on("LoadError", handle);
		}
	}
}
