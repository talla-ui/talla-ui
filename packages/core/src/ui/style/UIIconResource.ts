// NOTE: this class is pretty basic right now, some features could be added
// especially for SVG icons, e.g. rotation, combination, etc.

// Module-level storage for icons
let _icons: Record<string, UIIconResource> = {};
let _iconRefs: Record<string, UIIconResource> = {};

/**
 * A class that represents icon source content.
 * - For the web renderer, content can be SVG, HTML, or plain text.
 * - Use as an image source, or with text elements and buttons.
 *
 * Create icons using `new UIIconResource(content)`, or reference named icons
 * using {@link UI.icons} or {@link UIIconResource.getIcon}.
 */
export class UIIconResource {
	/**
	 * Sets icons in the global icon registry.
	 * - Call `app.remount()` after setting icons to update all views.
	 * @param values An object mapping icon names to {@link UIIconResource} instances or content strings.
	 */
	static setIcons(values: Record<string, UIIconResource | string | undefined>) {
		for (let key in values) {
			let v = values[key];
			if (v != null) {
				_icons[key] = v instanceof UIIconResource ? v : new UIIconResource(v);
			}
		}
	}

	/**
	 * Returns an icon reference by name.
	 * - The returned instance dynamically resolves to the named icon.
	 * - Results are cached and reused for subsequent calls with the same name.
	 * @param name The name of the icon to retrieve.
	 * @returns A {@link UIIconResource} instance that resolves to the named icon.
	 */
	static getIcon(name: string): UIIconResource {
		if (!_iconRefs[name]) {
			let ref = new UIIconResource();
			ref.toString = () => String(_icons[name] || "");
			ref.isMirrorRTL = () => _icons[name]?.isMirrorRTL() || false;
			_iconRefs[name] = ref;
		}
		return _iconRefs[name]!;
	}

	/**
	 * Creates a new icon instance.
	 * @param content The icon content as SVG, HTML, or plain text.
	 */
	constructor(content?: string) {
		if (content) this._content = String(content);
	}

	/**
	 * Sets whether this icon should be mirrored in RTL mode.
	 * @param mirror True to mirror the icon in RTL mode; defaults to true.
	 * @returns The icon instance, for method chaining.
	 */
	setMirrorRTL(mirror = true) {
		this._mRTL = mirror;
		return this;
	}

	/** Returns true if this icon should be mirrored in RTL mode. */
	isMirrorRTL(): boolean {
		return !!this._mRTL;
	}

	/** Returns the icon content string (SVG, HTML, or plain text). */
	toString() {
		return String(this._content || "");
	}

	private _content?: string;
	private _mRTL?: boolean;
}

export namespace UIIconResource {
	const _names = [
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
	] as const;

	type _DefaultIcons = {
		readonly [K in (typeof _names)[number]]: UIIconResource;
	};

	/** An object containing all standard icon references. */
	export const defaults: _DefaultIcons = Object.freeze(
		_names.reduce(
			(obj, name) => {
				obj[name] = UIIconResource.getIcon(name);
				return obj;
			},
			{} as Record<string, UIIconResource>,
		),
	) as _DefaultIcons;

	/** A type that represents icon names, supporting both standard names and custom strings. */
	export type IconName = keyof typeof defaults | (string & {});
}
