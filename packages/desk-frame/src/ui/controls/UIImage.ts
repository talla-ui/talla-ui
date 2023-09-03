import { Binding, StringConvertible } from "../../core/index.js";
import { UIComponent } from "../UIComponent.js";
import { UIStyle } from "../UIStyle.js";
import { UIControl } from "./UIControl.js";

/**
 * A view class that represents an image control
 *
 * @description An image component is rendered on-screen as a rectangular image, loaded from the provided (data or remote) URL.
 *
 * **JSX tag:** `<img>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIImage extends UIControl {
	/**
	 * Creates a preset image class with the specified URL and style
	 * @param url The URL that refers to the image to be displayed
	 * @param style Style definitions to be applied, as an instance of {@link UIStyle} or the name of a dynamic theme style prefixed with the `@` character
	 * @returns A class that can be used to create instances of this image class with the provided URL and style
	 */
	static withUrl(
		url?: StringConvertible | Binding,
		style?: UIStyle | `@${string}`,
	) {
		return this.with({ url, style });
	}

	/** Creates a new image view object with the specified URL */
	constructor(url?: StringConvertible) {
		super();
		this.style = UIStyle.Image;
		if (url !== undefined) this.url = url;
	}

	override applyViewPreset(
		preset: UIComponent.ViewPreset<UIControl> & {
			/** Image resource URL */
			url?: StringConvertible | Binding<string>;
			/** True if this image may receive input focus */
			allowFocus?: boolean;
			/** True if this image may receive input focus using the keyboard (e.g. Tab key) */
			allowKeyboardFocus?: boolean;
			/** Event that's emitted when the image couldn't be loaded */
			onLoadError?: string;
		},
	) {
		if (preset.allowKeyboardFocus) preset.allowFocus = true;
		super.applyViewPreset(preset);
	}

	/** The image resource URL */
	url?: StringConvertible;

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
