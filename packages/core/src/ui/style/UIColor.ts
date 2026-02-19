import {
	mixOklch,
	oklchToSrgb,
	parseHex,
	parseOklch,
	parseRgb,
	srgbToOklch,
} from "./color-util.js";

let _cacheUpdate = 0;

// Module-level storage for colors (initialized at bottom, and by platform handlers)
let _colors: Record<string, UIColor> = {};
let _colorRefs: Record<string, UIColor> = {};

const ZERO_OUT: UIColor.Output = {
	l: 0,
	c: 0,
	h: 0,
	alpha: 0,
	raw: undefined,
	rgb: () => [0, 0, 0],
	rgbaString: () => "rgba(0,0,0,0)",
	oklchString: () => "oklch(0 0 0 / 0)",
};

/**
 * A class that represents a single color value.
 * - Use the constructor with a CSS color string, or reference a preset using {@link UIColor.getColor}.
 * - Use instance methods like {@link alpha()}, {@link brighten()}, and {@link mix()} to create derived colors.
 * - The {@link output()} method returns a {@link UIColor.Output} with structured color values.
 *
 * Instances can be used with style properties and UI element color properties. Named colors are
 * available through {@link UI.colors} and can be customized using {@link setColors()} or the global theme (e.g. {@link WebTheme}).
 *
 * @example
 * // Create colors directly
 * new UIColor("#000")
 * new UIColor("rgba(0,0,0,0.5)")
 * UIColor.oklch(0.5, 0.15, 240)
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
			result._f = () => (_colors[name] ? _colors[name]!.output() : ZERO_OUT);
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
		result._f = () => {
			let src = f();
			return src ? src.output() : ZERO_OUT;
		};
		return result;
	}

	/**
	 * Creates a UIColor from OKLCH values directly.
	 * @param l Lightness, 0-1.
	 * @param c Chroma, 0-~0.4.
	 * @param h Hue, 0-360.
	 * @param alpha Alpha, 0-1 (default 1).
	 */
	static oklch(l: number, c: number, h: number, alpha?: number): UIColor {
		let color = new UIColor();
		color._result = _oklchOutput(l, c, h, alpha ?? 1);
		return color;
	}

	/**
	 * Creates a UIColor from sRGB values, converting to OKLCH internally.
	 * @param r Red, 0-255.
	 * @param g Green, 0-255.
	 * @param b Blue, 0-255.
	 * @param alpha Alpha, 0-1 (default 1).
	 */
	static rgb(r: number, g: number, b: number, alpha?: number): UIColor {
		let [l, c, h] = srgbToOklch(r / 255, g / 255, b / 255);
		return UIColor.oklch(l, c, h, alpha);
	}

	/**
	 * Determines whether a color has high perceived brightness.
	 * @param color A UIColor instance.
	 * @param threshold The brightness threshold, from 0 to 1; defaults to 0.65.
	 * @returns True if the color's perceived brightness exceeds the threshold.
	 */
	static isBrightColor(color: UIColor, threshold?: number): boolean {
		let out = color.output();
		if (out.raw || out.alpha === 0) return true;
		return out.l > (threshold ?? 0.65);
	}

	/**
	 * Creates a new UIColor instance.
	 * @param color A CSS color string in hex, rgb(a), or oklch() format. Unrecognized strings are stored as raw CSS.
	 */
	constructor(color?: string) {
		if (color !== null) {
			if (!color || color === "transparent") {
				this._result = ZERO_OUT;
				return;
			}

			// try to parse as hex/rgb/oklch
			let hex = parseHex(color);
			if (hex) {
				let [l, c, h] = srgbToOklch(hex[0] / 255, hex[1] / 255, hex[2] / 255);
				this._result = _oklchOutput(l, c, h, 1);
				return;
			}
			let rgb = parseRgb(color);
			if (rgb) {
				let [l, c, h] = srgbToOklch(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
				this._result = _oklchOutput(l, c, h, rgb[3]);
				return;
			}
			let oklch = parseOklch(color);
			if (oklch) {
				this._result = _oklchOutput(oklch[0], oklch[1], oklch[2], oklch[3]);
				return;
			}

			// just store raw string
			this._result = _rawOutput(color);
		}
	}

	/**
	 * Returns a {@link UIColor.Output} with structured color values.
	 * - Results are cached and invalidated when the color registry changes.
	 */
	output(): UIColor.Output {
		if (this._result && (!this._f || this._up === _cacheUpdate)) {
			return this._result;
		}
		this._result = this._f ? this._f() : ZERO_OUT;
		this._up = _cacheUpdate;
		return this._result;
	}

	/**
	 * Returns a new {@link UIColor} with increased transparency.
	 * @param alpha The opacity level, from 0 (fully transparent) to 1 (no change).
	 * @returns A new {@link UIColor} instance.
	 */
	alpha(alpha: number) {
		let derived = new UIColor();
		let self = this;
		derived._f = () => {
			let out = self.output();
			if (out.raw) return _rawOutput(out.raw);
			return _oklchOutput(out.l, out.c, out.h, out.alpha * alpha);
		};
		return derived;
	}

	/**
	 * Returns a new {@link UIColor} with adjusted brightness.
	 * @param d The brightness adjustment, from -1 (black) to 1 (white); 0 means no change.
	 * @returns A new {@link UIColor} instance.
	 */
	brighten(d: number) {
		let derived = new UIColor();
		let self = this;
		derived._f = () => {
			let out = self.output();
			if (out.raw) return _rawOutput(out.raw);
			let t = Math.abs(d);
			let targetL = d > 0 ? 1 : 0;
			return _oklchOutput(
				out.l + (targetL - out.l) * t,
				out.c * (1 - t),
				out.h,
				out.alpha,
			);
		};
		return derived;
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
		let derived = new UIColor();
		let self = this;
		derived._f = () => {
			let out = self.output();
			if (out.raw) return _rawOutput(out.raw);
			let bright = out.l > (threshold ?? 0.65);
			let dd = d;
			if (dd > 0.5) dd = 0.5;
			if (dd < -0.5) dd = -0.5;
			let v = bright ? dd * 0.85 : -dd;
			let t = Math.abs(v);
			let targetL = v > 0 ? 1 : 0;
			return _oklchOutput(
				out.l + (targetL - out.l) * t,
				out.c * (1 - t),
				out.h,
				out.alpha,
			);
		};
		return derived;
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
		let light =
			colorOnLight instanceof UIColor
				? colorOnLight
				: new UIColor(colorOnLight);
		let dark =
			colorOnDark instanceof UIColor ? colorOnDark : new UIColor(colorOnDark);
		let derived = new UIColor();
		let self = this;
		derived._f = () =>
			(UIColor.isBrightColor(self, threshold) ? light : dark).output();
		return derived;
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
	 * - Mixing is performed in oklab space for perceptually correct blending.
	 * @param color The color to mix in.
	 * @param amount The mix ratio, from 0 (no change) to 1 (fully the other color).
	 * @param ignoreAlpha True to preserve the current color's alpha value.
	 * @returns A new {@link UIColor} instance.
	 */
	mix(color: UIColor | string, amount: number, ignoreAlpha?: boolean) {
		let other = color instanceof UIColor ? color : new UIColor(color);
		let derived = new UIColor();
		let self = this;
		derived._f = () => {
			let out1 = self.output();
			let out2 = other.output();
			if (out1.raw) return _rawOutput(out1.raw);
			if (out2.raw) return _rawOutput(out2.raw);
			return _oklchOutput(
				...mixOklch(out1.l, out1.c, out1.h, out2.l, out2.c, out2.h, amount),
				ignoreAlpha
					? out1.alpha
					: out1.alpha + (out2.alpha - out1.alpha) * amount,
			);
		};
		return derived;
	}

	private _f?: () => UIColor.Output;
	private _result?: UIColor.Output;
	private _up?: number;
}

export namespace UIColor {
	/**
	 * An interface that represents the output of a resolved UIColor.
	 * - OKLCH values (l, c, h, alpha) are always available directly.
	 * - RGB and CSS strings are computed lazily via methods, and cached after first call.
	 * - For raw CSS colors, `raw` is the original string; `l/c/h` are 0.
	 */
	export interface Output {
		/** OKLCH lightness, 0-1 (0 for raw). */
		readonly l: number;
		/** OKLCH chroma, 0-~0.4 (0 for raw). */
		readonly c: number;
		/** OKLCH hue, 0-360 (0 for raw). */
		readonly h: number;
		/** Alpha, 0-1 (1 for raw). */
		readonly alpha: number;
		/** Raw CSS string for unparsed colors, or undefined. */
		readonly raw: string | undefined;
		/** Returns sRGB [r, g, b] (each 0-255). Lazy, cached after first call. */
		rgb(): [number, number, number];
		/** Returns a CSS rgba() or rgb() string. Lazy, cached after first call. */
		rgbaString(): string;
		/** Returns a CSS oklch() string. Lazy, cached after first call. */
		oklchString(): string;
	}

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

/** Helper function to create an output object for an OKLCH color value */
function _oklchOutput(
	l: number,
	c: number,
	h: number,
	alpha: number,
): UIColor.Output {
	let _rgb: [number, number, number] | undefined;
	let _rgba: string | undefined;
	let _oklch: string | undefined;
	return {
		l,
		c,
		h,
		alpha,
		raw: undefined,
		rgb() {
			return (_rgb ??= oklchToSrgb(l, c, h));
		},
		rgbaString() {
			if (_rgba !== undefined) return _rgba;
			let [r, g, b] = this.rgb();
			return (_rgba =
				alpha >= 1
					? "rgb(" + r + "," + g + "," + b + ")"
					: "rgba(" + r + "," + g + "," + b + "," + +alpha.toFixed(4) + ")");
		},
		oklchString() {
			return (_oklch ??=
				"oklch(" +
				+l.toFixed(5) +
				" " +
				+c.toFixed(5) +
				" " +
				+h.toFixed(2) +
				(alpha < 1 ? " / " + +alpha.toFixed(4) : "") +
				")");
		},
	};
}

/** Helper function to create an output object for a raw color value */
function _rawOutput(raw: string): UIColor.Output {
	return {
		l: 0,
		c: 0,
		h: 0,
		alpha: 1,
		raw,
		rgb: () => [0, 0, 0],
		rgbaString: () => raw,
		oklchString: () => raw,
	};
}

// Set basic colors upfront

_colors["transparent"] = UIColor.oklch(0, 0, 0, 0);
_colors["darkText"] = UIColor.oklch(0, 0, 0);
_colors["lightText"] = UIColor.oklch(1, 0, 0);
