import { Binding, StringConvertible } from "../../core/index.js";
import { UIComponent } from "../UIComponent.js";
import { UITheme } from "../UITheme.js";

/**
 * A view class that represents an image control
 *
 * @description An image component is rendered on-screen as a rectangular image, loaded from the provided (data or remote) URL.
 *
 * **JSX tag:** `<img>`
 *
 * @online_docs Refer to the Desk website for more documentation on using this UI component class.
 */
export class UIImage extends UIComponent {
	/**
	 * Creates a preset image class with the specified URL and style
	 * @param url The URL that refers to the image to be displayed
	 * @param imageStyle The image style (optional)
	 * @returns A class that can be used to create instances of this image class with the provided URL and style
	 */
	static withUrl(
		url?: StringConvertible | Binding,
		imageStyle?: UITheme.StyleConfiguration<UIImageStyle>,
	) {
		return this.with({ url, imageStyle });
	}

	/** Creates a new image view object with the specified URL */
	constructor(url?: StringConvertible) {
		super();
		this.url = url;
	}

	override applyViewPreset(
		preset: UIComponent.ViewPreset<
			UIComponent,
			this,
			"url" | "width" | "height" | "imageStyle"
		> & {
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
	imageStyle: UITheme.StyleConfiguration<UIImageStyle> = undefined;
}

/**
 * A style class that includes default style properties for instances of {@link UIImage}
 * - Default styles are taken from {@link UITheme}.
 * - Extend or override this class to implement custom image styles, see {@link UITheme.BaseStyle} for details.
 */
export class UIImageStyle extends UITheme.BaseStyle<
	"Image",
	UIComponent.DimensionsStyleType & UIComponent.DecorationStyleType
> {
	constructor() {
		super("Image", UIImageStyle);
	}
}
