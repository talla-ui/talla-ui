import { UITheme } from "./UITheme.js";

// NOTE: this class is pretty basic right now, some features could be added
// especially for SVG icons, e.g. rotation, combination, etc.

/**
 * An object that represents an icon that can be used on labels or buttons
 */
export class UIIcon {
	/**
	 * Creates a new icon object
	 * @param content The icon content as SVG, HTML, or plain text; or a reference to a dynamic theme icon, using its name prefixed with the `@` character, e.g. `@Close`
	 */
	constructor(content: string) {
		this._content = String(content);
	}

	/** Returns the icon content string, i.e. SVG, HTML, or plain text */
	toString(): string {
		let result = this._content;
		return result[0] === "@"
			? String(UITheme.getIcon(result.slice(1)))
			: result;
	}

	private _content: string;
}

export namespace UIIcon {
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Blank = new UIIcon("@Blank");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Close = new UIIcon("@Close");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Check = new UIIcon("@Check");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Menu = new UIIcon("@Menu");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const More = new UIIcon("@More");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Plus = new UIIcon("@Plus");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const Minus = new UIIcon("@Minus");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const ExpandDown = new UIIcon("@ExpandDown");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const ExpandUp = new UIIcon("@ExpandUp");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const ExpandRight = new UIIcon("@ExpandRight");
	/** An instance of {@link UIIcon} that references a theme icon */
	export const ExpandLeft = new UIIcon("@ExpandLeft");
}
