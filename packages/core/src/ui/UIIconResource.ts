import { app } from "../app/index.js";

// NOTE: this class is pretty basic right now, some features could be added
// especially for SVG icons, e.g. rotation, combination, etc.

/**
 * An object that represents an icon that can be used on labels or buttons
 */
export class UIIconResource {
	/**
	 * Creates a new icon object
	 * @param id The icon name, for referencing a theme icon (see {@link UITheme.icons})
	 * @param content The icon content as SVG, HTML, or plain text
	 */
	constructor(id: string, content?: string) {
		this._id = id;
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
		return (this._mRTL ?? this._getThemeIcon()?.isMirrorRTL()) || false;
	}

	/** Returns the icon content string, i.e. SVG, HTML, or plain text */
	toString() {
		return String(this._content || this._getThemeIcon() || "");
	}

	_getThemeIcon() {
		if (this._id) {
			let icon = app.theme?.icons.get(this._id);
			if (icon !== this) return icon;
		}
	}

	private _id: string;
	private _content?: string;
	private _mRTL?: boolean;
}

export namespace UIIconResource {}
