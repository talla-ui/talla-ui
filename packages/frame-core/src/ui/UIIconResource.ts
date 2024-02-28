import { app } from "../app/index.js";

// NOTE: this class is pretty basic right now, some features could be added
// especially for SVG icons, e.g. rotation, combination, etc.

/**
 * An object that represents an icon that can be used on labels or buttons
 */
export class UIIconResource {
	/**
	 * Creates a new icon object
	 * @param content The icon content as SVG, HTML, or plain text; or a reference to a dynamic theme icon, defined in {@link UITheme.icons}.
	 */
	constructor(content: string) {
		this._content = String(content);
	}

	/** Indicate that this icon should be mirrored in RTL mode */
	setMirrorRTL() {
		this._mRTL = true;
		return this;
	}

	/** True if this icon should be mirrored in RTL mode */
	isMirrorRTL(): boolean {
		if (this._mRTL) return true;
		let themeIcon = app.theme?.icons.get(this._content);
		if (themeIcon) return themeIcon.isMirrorRTL();
		return false;
	}

	/** Returns the icon content string, i.e. SVG, HTML, or plain text */
	toString(): string {
		let result = this._content;
		return String(app.theme?.icons.get(result) || result);
	}

	private _content: string;
	private _mRTL?: boolean;
}

export namespace UIIconResource {}
