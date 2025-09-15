import { UIStyle } from "./UIStyle.js";

// NOTE: this class is pretty basic right now, some features could be added
// especially for SVG icons, e.g. rotation, combination, etc.

/**
 * An object that represents icon source content
 *
 * @description
 * Each UIIconResource instance encapsulates platform-dependent icon content. For the Web (DOM) renderer, this may include SVG content, HTML, or plain text. Icons can be used directly as an image source, or with labels or buttons on their own or alongside a label.
 *
 * To create a new icon, use the `new UIIconResource(content)` constructor. To reference an icon from the theme, use the global {@link UI} object or the {@link UIIconResource.theme} resolver.
 */
export class UIIconResource {
	/**
	 * Creates a {@link UIIconResource} instance that dynamically resolves to another icon
	 * - This method is used to create a theme icon reference by {@link UIIconResource.theme}.
	 * @param f A function that returns the icon to resolve to, or undefined
	 * @returns A new {@link UIIconResource} instance that will resolve the factory function when applied
	 * @see {@link UIIconResource.theme}
	 */
	static resolve(f: () => UIIconResource | undefined): UIIconResource {
		return Object.assign(new UIIconResource(), {
			toString: () => f()?.toString() || "",
			isMirrorRTL: () => !!f()?.isMirrorRTL(),
		});
	}

	/**
	 * Creates a new icon object
	 * @param content The icon content as SVG, HTML, or plain text
	 */
	constructor(content?: string) {
		if (content) this._content = String(content);
	}

	/**
	 * Indicate that this icon should be mirrored in RTL mode
	 * @param mirror True if this icon should be mirrored in RTL mode, may be omitted (default is true)
	 */
	setMirrorRTL(mirror = true) {
		this._mRTL = mirror;
		return this;
	}

	/** True if this icon should be mirrored in RTL mode */
	isMirrorRTL(): boolean {
		return !!this._mRTL;
	}

	/** Returns the icon content string, i.e. SVG, HTML, or plain text */
	toString() {
		return String(this._content || "");
	}

	private _content?: string;
	private _mRTL?: boolean;
}

export namespace UIIconResource {
	/**
	 * A theme resolver for predefined theme icons
	 *
	 * @description
	 * This object provides access to predefined theme icons, referenced by string keys.
	 *
	 * To update these icons, use the {@link UIStyle.ThemeResolver.set set()} method, and then remount all views using the `app.remount()` method.
	 */
	export const theme = new UIStyle.ThemeResolver(
		[
			"blank",
			"close",
			"check",
			"chevronDown",
			"chevronUp",
			"chevronNext",
			"chevronBack",
			"plus",
			"minus",
			"menu",
			"more",
			"search",
		],
		UIIconResource.resolve,
	);
}
