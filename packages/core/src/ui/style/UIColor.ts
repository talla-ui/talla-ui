import { UIStyle } from "./UIStyle.js";

// Use string constants for some common values
const STR_BLACK = "#000";
const STR_WHITE = "#fff";
const STR_NOCOLOR = "transparent";

let _cacheUpdate = 0;

/**
 * An object that represents a single color value
 *
 * @description
 * Instances of UIColor can be used with style classes and overrides, as well as properties of various UI elements. The {@link UIColor.toString toString()} method simply evaluates a CSS-compatible color string as needed, requiring no further logic where colors are used.
 *
 * UIColor instances can be created using the constructor with a base color such as `#000` or `rgba(0, 0, 0, 0.5)`, **or** by referencing a preset color name (see {@link UIColor.theme} and the global {@link UI} object). Afterwards, UIColor methods can be used to create derived colors — changing brightness, transparency, or mixing colors together.
 *
 * @example
 * // Different ways to create UIColor objects
 * new UIColor("#000")
 * new UIColor("#aabbcc")
 * new UIColor("rgb(0,0,0)")
 * new UIColor("rgb(0,0,0,0.5)")
 *
 * UI.colors.black // indirect theme color reference
 * UI.colors.green.alpha(0.5)
 * UI.colors.primaryBackground.text()
 * UI.colors.primaryBackground.brighten(0.2).text()
 */
export class UIColor {
	/** @internal Invalidates the cache of calculated color values */
	static invalidateCache() {
		_cacheUpdate++;
	}

	/**
	 * Creates a {@link UIColor} instance that dynamically resolves to another color
	 * - This method is used to create a theme color reference by {@link UIColor.theme}.
	 * @param f A function that returns the color to resolve to, or undefined
	 * @returns A new {@link UIColor} instance that will resolve the factory function when applied
	 * @see {@link UIColor.theme}
	 */
	static resolve(f: () => UIColor | undefined): UIColor {
		let result = new UIColor();
		result._f = () => String(f() || STR_NOCOLOR);
		return result;
	}

	/**
	 * Returns true if the pseudo-brightness of the specified color is greater than 55%
	 * - This method is used by the {@link UIColor.text()} method to determine a suitable text color.
	 * @param color A color value, in hex format `#112233` or `#123`, or rgb(a) format `rgb(255, 255, 255)`
	 * @returns True if the specified color has a relatively high perceived brightness.
	 */
	static isBrightColor(color: UIColor | string) {
		let c = String(color);
		if (c[0] === "#") {
			if (c.length === 4) {
				c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
			}
			let r = parseInt(c.slice(1, 3), 16);
			let g = parseInt(c.slice(3, 5), 16);
			let b = parseInt(c.slice(5, 7), 16);
			return 0.3 * r + 0.6 * g + 0.1 * b > 140;
		} else if (c.slice(0, 4) === "rgb(" || c.slice(0, 5) === "rgba(") {
			let v = c.slice(c.indexOf("(") + 1).split(",");
			let r = parseFloat(v[0]!);
			let g = parseFloat(v[1]!);
			let b = parseFloat(v[2]!);
			return 0.3 * r + 0.6 * g + 0.1 * b > 140;
		} else return true;
	}

	/**
	 * Returns the result of mixing two colors together at the specified ratio
	 * - Where possible, use {@link UIColor} methods instead, e.g. {@link UIColor.mix()}.
	 *
	 * @color1 The first color, in hex format `#112233` or `#123`, or rgb(a) format `rgb(255, 255, 255)`
	 * @color2 The second color, idem
	 * @ratio The amount that the second color should contribute to the mix; i.e. a value of 0 results in the first color, a value of 1 results in the second color, and 0.5 results in an equal mix
	 * @returns A color string in rgb(a) format, e.g. `rgb(40,60,255)` or `rgba(40,60,255,.5)`.
	 */
	static mixColors(
		color1: UIColor | string,
		color2: UIColor | string,
		ratio: number,
		ignoreAlpha?: boolean,
	) {
		function parse(color: string) {
			if (color[0] === "#") {
				if (color.length === 4)
					return color
						.slice(1)
						.split("")
						.map((s) => parseInt(s + s, 16));
				else
					return [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map(
						(s) => parseInt(s, 16),
					);
			} else if (color.slice(0, 5) === "rgba(") {
				return color
					.slice(5)
					.split(",")
					.map((s) => parseFloat(s));
			} else if (color.slice(0, 4) === "rgb(") {
				return color
					.slice(4)
					.split(",")
					.map((s) => parseFloat(s));
			} else if (color === STR_NOCOLOR) {
				return [0, 0, 0, 0];
			}
			return [0, 0, 0];
		}
		let q = 1 - ratio;
		function mix(n1?: number, n2?: number) {
			let r = n1 === n2 ? n1 : Math.round(q * n1! + ratio * n2!);
			return isNaN(r!) ? n1 || 0 : r;
		}
		let c1 = parse(String(color1));
		let c2 = parse(String(color2));
		let rgbStr =
			mix(c1[0], c2[0]) + "," + mix(c1[1], c2[1]) + "," + mix(c1[2], c2[2]);
		let alpha = ignoreAlpha
			? (c1[3] ?? 1)
			: q * (c1[3] ?? 1) + ratio * (c2[3] ?? 1);
		return alpha >= 1
			? "rgb(" + rgbStr + ")"
			: "rgba(" + rgbStr + "," + +alpha.toFixed(4) + ")";
	}

	/**
	 * Creates a new UIColor instance
	 * @param color The base color, in hex format `#112233` or `#123`, or rgb(a) format `rgb(255, 255, 255)`, or a theme color name.
	 */
	constructor(color?: string) {
		if (color) this._f = () => String(color);
	}

	/**
	 * Returns a new {@link UIColor} instance with increased transparency
	 * @param alpha The opacity change to apply, 0 meaining fully transparent, and 1 meaning no change
	 * @returns A new instance of UIColor.
	 */
	alpha(alpha: number) {
		return this.mix("rgba(,,,0)", 1 - alpha);
	}

	/**
	 * Returns a new {@link UIColor} instance with increased (or decreased) brightness
	 * @param d The change in brightness to apply, -1 meaning fully black, 1 meaning fully white, and 0 meaning no change
	 * @returns A new instance of UIColor.
	 */
	brighten(d: number) {
		return this.mix(d > 0 ? STR_WHITE : STR_BLACK, Math.abs(d), true);
	}

	/**
	 * Returns a new {@link UIColor} instance with increased (or decreased) contrast compared to 50% grey
	 * @param d The change in contrast to apply, -0.5 to 0.5: positive values make light colors lighter and dark colors darker (away from mid-grey), negative values make light colors darker and dark colors lighter (towards mid-grey)
	 * @returns A new instance of UIColor.
	 */
	contrast(d: number) {
		let result = new UIColor();
		result._f = () => {
			let c = String(this);
			let bright = UIColor.isBrightColor(c);
			if (d > 0.5) d = 0.5;
			if (d < -0.5) d = -0.5;

			// logic: inverse for dark colors,
			// scale factor down for light colors
			// (since eyes are more sensitive to light)
			let v = bright ? d * 0.85 : -d;
			return UIColor.mixColors(
				c,
				v > 0 ? STR_WHITE : STR_BLACK,
				Math.abs(v),
				true,
			);
		};
		return result;
	}

	/**
	 * Returns a new {@link UIColor} instance for a suitable foreground color based on the current color
	 * - This method first determines if the current color is bright or dark, and then returns the corresponding color from the provided parameters.
	 * @returns A new instance of UIColor.
	 */
	fg(colorOnLight: UIColor | string, colorOnDark: UIColor | string) {
		let result = new UIColor();
		result._f = () =>
			UIColor.isBrightColor(this) ? String(colorOnLight) : String(colorOnDark);
		return result;
	}

	/**
	 * Returns a new {@link UIColor} instance for a suitable text color (black or white)
	 * - This method uses preset light and dark text colors to determine a contrasting text color for the current color.
	 * - Set `darkText` and `lightText` in the color theme to override the default black and white text colors.
	 * @returns A new instance of UIColor.
	 */
	text() {
		return this.fg(UIColor.darkTextColor, UIColor.lightTextColor);
	}

	/**
	 * Returns a new {@link UIColor} instance for a color that's closer to the specified color
	 * @param color The color to mix into the current color
	 * @param amount The amount to mix the color into the current color, 0–1
	 * @param ignoreAlpha True if the transparency channel of the second color should be ignored; if set, the resulting color will have the same transparency value as the current color
	 * @returns A new instance of UIColor.
	 */
	mix(color: UIColor | string, amount: number, ignoreAlpha?: boolean) {
		let result = new UIColor();
		result._f = () => UIColor.mixColors(this, color, amount, ignoreAlpha);
		return result;
	}

	/** Returns a CSS-compatible string representation of the current color */
	toString() {
		// return cached value if presets are still the same
		if (this._s && this._up === _cacheUpdate) {
			return this._s;
		}

		// otherwise, compute value and cache it now
		let s = (this._s = this._f ? this._f() : STR_NOCOLOR);
		this._up = _cacheUpdate;
		return s;
	}

	private _f?: () => string;
	private _s?: string;
	private _up?: number;
}

export namespace UIColor {
	/**
	 * A theme resolver for predefined theme colors
	 *
	 * @description
	 * This object provides access to predefined theme colors, referenced by string keys.
	 *
	 * To update these colors, use the {@link UIStyle.ThemeResolver.set set()} method, and then remount all views using the `app.remount()` method.
	 */
	export const theme = new UIStyle.ThemeResolver(
		[
			"transparent",
			"black",
			"darkerGray",
			"darkGray",
			"gray",
			"lightGray",
			"white",
			"slate",
			"lightSlate",
			"red",
			"orange",
			"yellow",
			"lime",
			"green",
			"turquoise",
			"cyan",
			"blue",
			"violet",
			"purple",
			"magenta",
			"divider",
			"background",
			"shade",
			"text",
			"darkText",
			"lightText",
			"danger",
			"dangerBackground",
			"success",
			"successBackground",
			"primary",
			"primaryBackground",
			"brand",
			"brandBackground",
			"link",
		],
		UIColor.resolve,
		UIColor.invalidateCache,
	).set({
		transparent: new UIColor(STR_NOCOLOR),
		darkText: new UIColor(STR_BLACK),
		lightText: new UIColor(STR_WHITE),
	});

	/** A reference to the theme's light text color, typically white */
	export const lightTextColor = theme.ref("lightText");

	/** A reference to the theme's dark text color, typically black */
	export const darkTextColor = theme.ref("darkText");
}
