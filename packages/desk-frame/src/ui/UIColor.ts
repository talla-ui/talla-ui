import { app } from "../app/index.js";
import { UITheme } from "./UITheme.js";

// Use constants for 'almost black' and 'almost white' as text colors
const TEXT_COLOR_B = "rgba(0,0,0,.8)";
const TEXT_COLOR_W = "rgba(255,255,255,.95)";

/**
 * An object that represents a single color value
 *
 * @description
 * Instances of UIColor can be used with {@link UIStyle} definitions, as well as properties of various UI components, such as {@link UICell.background}. Their {@link UIColor.toString toString()} method simply evaluates a CSS-compatible color string as needed, requiring no further logic where colors are used.
 *
 * UIColor instances can be created with a base color such as `#000` or `rgba(0, 0, 0, 0.5)`, **or** a color defined by the current theme (see {@link UITheme}). Afterwards, UIColor methods can be used to create derived colors — changing brightness, transparency, or mixing colors together.
 *
 * A set of base colors corresponding to the default theme colors are available as static properties of UIColor. Use these as a starting point wherever possible.
 *
 * @example
 * // Different ways to create UIColor objects
 * new UIColor("#000")
 * new UIColor("#aabbcc")
 * new UIColor("rgb(0,0,0)")
 * new UIColor("rgb(0,0,0,0.5)")
 *
 * new UIColor("@Black") // theme color name
 * UIColor.Black // same as above, recommended
 *
 * UIColor.Green.alpha(0.5)
 * UIColor.Primary.text()
 * UIColor.Primary.brighten(0.2).text()
 */
export class UIColor {
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
			} else if (color === "transparent") {
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
			? c1[3] ?? 1
			: q * (c1[3] ?? 1) + ratio * (c2[3] ?? 1);
		return alpha >= 1
			? "rgb(" + rgbStr + ")"
			: "rgba(" + rgbStr + "," + +alpha.toFixed(4) + ")";
	}

	/**
	 * Creates a new UIColor instance
	 * - Use one of the static UIColor properties for theme colors when possible (e.g. `UIColor.Green` or `UIColor.Background`), instead of creating UIColor instances for custom colors.
	 * @param color The base color, in hex format `#112233` or `#123`, or rgb(a) format `rgb(255, 255, 255)`, or a reference to a theme color with `@` prefix, e.g. `@green` or `@background`
	 */
	constructor(color?: string) {
		if (color) {
			if (color[0] === "@") {
				color = color.slice(1);
				this._f = () => UITheme.getColor(color!).toString();
			} else {
				this._f = () => color!;
			}
		}
	}

	/**
	 * Returns a new {@link UIColor} instance with increased transparency
	 * @param alpha The opacity change to apply, 0 meaining fully transparent, and 1 meaning no change
	 * @returns A new instance of UIColor.
	 *
	 * @example
	 * // Modifying a theme color
	 * UICell.with(
	 *   { background: UIColor.Background.alpha(0.5) },
	 *   // ...
	 * )
	 */
	alpha(alpha: number) {
		return this.mix("rgba(,,,0)", 1 - alpha);
	}

	/**
	 * Returns a new {@link UIColor} instance with increased (or decreased) brightness
	 * @param d The change in brightness to apply, -1 meaning fully black, 1 meaning fully white, and 0 meaning no change
	 * @returns A new instance of UIColor.
	 *
	 * @example
	 * // Modifying a theme color
	 * UICell.with(
	 *   {
	 *     background: UIColor.Primary.brighten(0.5),
	 *     textColor: UIColor.Primary.brighten(0.5).text()
	 *   },
	 *   // ...
	 * )
	 */
	brighten(d: number) {
		return this.mix(d > 0 ? "#fff" : "#000", Math.abs(d), true);
	}

	/**
	 * Returns a new {@link UIColor} instance with increased (or decreased) contrast compared to 50% grey
	 * @param d The change in contrast to apply, -1 to 1: positive values make light colors lighter and dark colors darker (away from mid-grey), negative values make light colors darker and dark colors lighter (towards mid-grey)
	 * @returns A new instance of UIColor.
	 *
	 * @example
	 * // Modifying a theme color
	 * UISeparator.with({ color: UIColor.Primary.contrast(-0.2) })
	 */
	contrast(d: number) {
		let result = new UIColor();
		result._f = () => {
			let v = UIColor.isBrightColor(this) ? d : -d;
			return UIColor.mixColors(
				this,
				v > 0 ? "#fff" : "#000",
				Math.abs(v),
				true,
			);
		};
		return result;
	}

	/**
	 * Returns a new {@link UIColor} instance for a suitable text color (black or white)
	 * - The resulting color is always black or white, with slight transparency applied. Lighter colors (above 55% pseudo-brightness value) result in mostly-black text, others in mostly-white.
	 * @returns A new instance of UIColor.
	 *
	 * @example
	 * // Using a suitable text color on the primary theme color
	 * UICell.with(
	 *   {
	 *     background: UIColor.Primary,
	 *     textColor: UIColor.Primary.text()
	 *   },
	 *   // ...
	 * )
	 */
	text() {
		let result = new UIColor();
		result._f = () =>
			UIColor.isBrightColor(this) ? TEXT_COLOR_B : TEXT_COLOR_W;
		return result;
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
		// return cached value if colors object is still the same
		if (this._s && app.theme && this._colors === app.theme.colors) {
			return this._s;
		}

		// otherwise, compute value and cache it now
		let s = (this._s = this._f ? this._f() : "transparent");
		this._colors = app.theme && app.theme.colors;
		return s;
	}

	private _f?: () => string;
	private _s?: string;
	private _colors?: unknown;
}

export namespace UIColor {
	/** An instance of {@link UIColor} that represents a transparent color */
	export const Transparent = new UIColor("transparent");
	/** An instance of {@link UIColor} that references a theme color */
	export const Black = new UIColor("@Black");
	/** An instance of {@link UIColor} that references a theme color */
	export const DarkerGray = new UIColor("@DarkerGray");
	/** An instance of {@link UIColor} that references a theme color */
	export const DarkGray = new UIColor("@DarkGray");
	/** An instance of {@link UIColor} that references a theme color */
	export const Gray = new UIColor("@Gray");
	/** An instance of {@link UIColor} that references a theme color */
	export const LightGray = new UIColor("@LightGray");
	/** An instance of {@link UIColor} that references a theme color */
	export const White = new UIColor("@White");
	/** An instance of {@link UIColor} that references a theme color */
	export const Slate = new UIColor("@Slate");
	/** An instance of {@link UIColor} that references a theme color */
	export const LightSlate = new UIColor("@LightSlate");
	/** An instance of {@link UIColor} that references a theme color */
	export const Red = new UIColor("@Red");
	/** An instance of {@link UIColor} that references a theme color */
	export const Orange = new UIColor("@Orange");
	/** An instance of {@link UIColor} that references a theme color */
	export const Yellow = new UIColor("@Yellow");
	/** An instance of {@link UIColor} that references a theme color */
	export const Lime = new UIColor("@Lime");
	/** An instance of {@link UIColor} that references a theme color */
	export const Green = new UIColor("@Green");
	/** An instance of {@link UIColor} that references a theme color */
	export const Turquoise = new UIColor("@Turquoise");
	/** An instance of {@link UIColor} that references a theme color */
	export const Cyan = new UIColor("@Cyan");
	/** An instance of {@link UIColor} that references a theme color */
	export const Blue = new UIColor("@Blue");
	/** An instance of {@link UIColor} that references a theme color */
	export const Violet = new UIColor("@Violet");
	/** An instance of {@link UIColor} that references a theme color */
	export const Purple = new UIColor("@Purple");
	/** An instance of {@link UIColor} that references a theme color */
	export const Magenta = new UIColor("@Magenta");
	/** An instance of {@link UIColor} that references a theme color */
	export const Primary = new UIColor("@Primary");
	/** An instance of {@link UIColor} that references a theme color */
	export const PrimaryBackground = new UIColor("@PrimaryBackground");
	/** An instance of {@link UIColor} that references a theme color */
	export const Accent = new UIColor("@Accent");
	/** An instance of {@link UIColor} that references a theme color */
	export const Background = new UIColor("@Background");
	/** An instance of {@link UIColor} that references a theme color */
	export const PageBackground = new UIColor("@PageBackground");
	/** An instance of {@link UIColor} that references a theme color */
	export const Text = new UIColor("@Text");
	/** An instance of {@link UIColor} that references a theme color */
	export const Separator = new UIColor("@Separator");
	/** An instance of {@link UIColor} that references a theme color */
	export const ControlBase = new UIColor("@ControlBase");
	/** An instance of {@link UIColor} that references a theme color */
	export const ModalShade = new UIColor("@ModalShade");
}
