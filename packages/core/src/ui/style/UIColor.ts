// Use string constants for some common values
const STR_BLACK = "#000";
const STR_WHITE = "#fff";
const STR_NOCOLOR = "transparent";

let _cacheUpdate = 0;

// Module-level storage for colors
let _colors: Record<string, UIColor> = {};
let _colorRefs: Record<string, UIColor> = {};

/**
 * A class that represents a single color value.
 * - Use the constructor with a CSS color string, or reference a preset using {@link UIColor.getColor}.
 * - Use instance methods like {@link alpha()}, {@link brighten()}, and {@link mix()} to create derived colors.
 * - The {@link toString()} method returns a CSS-compatible color string.
 *
 * Instances can be used with style properties and UI element color properties. Named colors are
 * available through {@link UI.colors} and can be customized using {@link setColors()}.
 *
 * @example
 * // Create colors directly
 * new UIColor("#000")
 * new UIColor("rgba(0,0,0,0.5)")
 *
 * // Use preset colors
 * UI.colors.black
 * UI.colors.green.alpha(0.5)
 * UI.colors.accent.text()
 */
export class UIColor {
	/** @internal Invalidates the cache of calculated color values. */
	static invalidateCache() {
		_cacheUpdate++;
	}

	/**
	 * Sets colors in the global color registry.
	 * - Call `app.remount()` after setting colors to update all views.
	 * @param values An object mapping color names to {@link UIColor} instances or CSS color strings.
	 */
	static setColors(values: Record<string, UIColor | string>) {
		for (let key in values) {
			let v = values[key];
			_colors[key] = v instanceof UIColor ? v : new UIColor(v);
		}
		UIColor.invalidateCache();
	}

	/**
	 * Returns a color reference by name.
	 * - The returned instance dynamically resolves to the named color.
	 * - Results are cached and reused for subsequent calls with the same name.
	 * @param name The name of the color to retrieve.
	 * @returns A {@link UIColor} instance that resolves to the named color.
	 */
	static getColor(name: string): UIColor {
		if (!_colorRefs[name]) {
			let result = new UIColor();
			result._f = () => String(_colors[name] || STR_NOCOLOR);
			_colorRefs[name] = result;
		}
		return _colorRefs[name]!;
	}

	/**
	 * Creates a {@link UIColor} instance that dynamically resolves using a factory function.
	 * @param f A function that returns the color to resolve to, or undefined.
	 * @returns A new {@link UIColor} instance.
	 * @see {@link UIColor.getColor}
	 */
	static resolve(f: () => UIColor | undefined): UIColor {
		let result = new UIColor();
		result._f = () => String(f() || STR_NOCOLOR);
		return result;
	}

	/**
	 * Determines whether a color has high perceived brightness.
	 * - Used by {@link UIColor.text()} to select a contrasting text color.
	 * @param color A color value in hex or rgb(a) format.
	 * @param threshold The brightness threshold, from 0 to 1; defaults to 0.65.
	 * @returns True if the color's perceived brightness exceeds the threshold.
	 */
	static isBrightColor(color: UIColor | string, threshold?: number) {
		let c = String(color);
		let w = threshold ? threshold * 255 : 165;
		if (c[0] === "#") {
			if (c.length === 4) {
				c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
			}
			let r = parseInt(c.slice(1, 3), 16);
			let g = parseInt(c.slice(3, 5), 16);
			let b = parseInt(c.slice(5, 7), 16);
			return 0.3 * r + 0.6 * g + 0.1 * b > w;
		} else if (c.slice(0, 4) === "rgb(" || c.slice(0, 5) === "rgba(") {
			let v = c.slice(c.indexOf("(") + 1).split(",");
			let r = parseFloat(v[0]!);
			let g = parseFloat(v[1]!);
			let b = parseFloat(v[2]!);
			return 0.3 * r + 0.6 * g + 0.1 * b > w;
		} else return true;
	}

	/**
	 * Mixes two colors together at the specified ratio.
	 * - Prefer instance methods like {@link UIColor.mix()} when working with {@link UIColor} objects.
	 *
	 * @summary
	 * Blends the RGB channels of two colors. A ratio of 0 returns the first color,
	 * 1 returns the second color, and 0.5 returns an equal mix.
	 *
	 * @param color1 The first color, in hex or rgb(a) format.
	 * @param color2 The second color, in hex or rgb(a) format.
	 * @param ratio The contribution of the second color, from 0 to 1.
	 * @param ignoreAlpha True to preserve the first color's alpha value.
	 * @returns A color string in rgb(a) format.
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
	 * Creates a new UIColor instance.
	 * @param color A CSS color string in hex or rgb(a) format.
	 */
	constructor(color?: string) {
		if (color) this._f = () => String(color);
	}

	/**
	 * Returns a new {@link UIColor} with increased transparency.
	 * @param alpha The opacity level, from 0 (fully transparent) to 1 (no change).
	 * @returns A new {@link UIColor} instance.
	 */
	alpha(alpha: number) {
		return this.mix("rgba(,,,0)", 1 - alpha);
	}

	/**
	 * Returns a new {@link UIColor} with adjusted brightness.
	 * @param d The brightness adjustment, from -1 (black) to 1 (white); 0 means no change.
	 * @returns A new {@link UIColor} instance.
	 */
	brighten(d: number) {
		return this.mix(d > 0 ? STR_WHITE : STR_BLACK, Math.abs(d), true);
	}

	/**
	 * Returns a new {@link UIColor} with adjusted contrast relative to mid-grey.
	 * - Positive values move light colors toward white and dark colors toward black.
	 * - Negative values move colors toward mid-grey.
	 * @param d The contrast adjustment, from -0.5 to 0.5.
	 * @param threshold The brightness threshold for determining light vs dark; defaults to 0.65.
	 * @returns A new {@link UIColor} instance.
	 */
	contrast(d: number, threshold?: number) {
		let result = new UIColor();
		result._f = () => {
			let c = String(this);
			let bright = UIColor.isBrightColor(c, threshold);
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
	 * Returns a new {@link UIColor} for a suitable foreground color.
	 * - Chooses between two colors based on whether the current color is bright or dark.
	 * @param colorOnLight The color to use if the current color is bright.
	 * @param colorOnDark The color to use if the current color is dark.
	 * @param threshold The brightness threshold; defaults to 0.65.
	 * @returns A new {@link UIColor} instance.
	 */
	fg(
		colorOnLight: UIColor | string,
		colorOnDark: UIColor | string,
		threshold?: number,
	) {
		let result = new UIColor();
		result._f = () =>
			UIColor.isBrightColor(this, threshold)
				? String(colorOnLight)
				: String(colorOnDark);
		return result;
	}

	/**
	 * Returns a new {@link UIColor} for a contrasting text color.
	 * - Uses the preset `darkText` and `lightText` colors.
	 * @returns A new {@link UIColor} instance, either dark or light.
	 */
	text() {
		return this.fg(UIColor.darkTextColor, UIColor.lightTextColor);
	}

	/**
	 * Returns a new {@link UIColor} mixed with the specified color.
	 * @param color The color to mix in.
	 * @param amount The mix ratio, from 0 (no change) to 1 (fully the other color).
	 * @param ignoreAlpha True to preserve the current color's alpha value.
	 * @returns A new {@link UIColor} instance.
	 */
	mix(color: UIColor | string, amount: number, ignoreAlpha?: boolean) {
		let result = new UIColor();
		result._f = () => UIColor.mixColors(this, color, amount, ignoreAlpha);
		return result;
	}

	/** Returns a CSS-compatible string representation of the current color. */
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
	const _names = [
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
		"accent",
		"background",
		"shade",
		"text",
		"darkText",
		"lightText",
		"link",
		"danger",
		"success",
	] as const;

	type _DefaultColors = { readonly [K in (typeof _names)[number]]: UIColor };

	/** An object containing all standard color references. */
	export const defaults: _DefaultColors = Object.freeze(
		_names.reduce(
			(obj, name) => {
				obj[name] = UIColor.getColor(name);
				return obj;
			},
			{} as Record<string, UIColor>,
		),
	) as _DefaultColors;

	/** A type that represents color names, supporting both standard names and custom strings. */
	export type ColorName = keyof typeof defaults | (string & {});

	/** The light text color reference, typically white. */
	export const lightTextColor = UIColor.getColor("lightText");

	/** The dark text color reference, typically black. */
	export const darkTextColor = UIColor.getColor("darkText");
}

// Initialize default colors in _colors
UIColor.setColors({
	transparent: STR_NOCOLOR,
	darkText: STR_BLACK,
	lightText: STR_WHITE,
});
