import { UIColor } from "./UIColor.js";

// NOTE: this class is designed to be tree-shakeable if not used by app code;
// Do NOT use instanceof, but use type imports and duck typing where needed.

/**
 * A class that represents a color gradient that can be used as a background.
 *
 * @example
 * UIGradient.linear(180, UI.colors.blue, UI.colors.green)
 * UIGradient.linear(90, UI.colors.red, [UI.colors.yellow, 0.5], UI.colors.blue)
 * UIGradient.radial(UI.colors.white, UI.colors.black)
 * UIGradient.conic(0, UI.colors.red, UI.colors.yellow, UI.colors.green, UI.colors.blue)
 */
export class UIGradient {
	/**
	 * Creates a linear gradient.
	 * @param angle The angle in degrees (e.g. 180 for top-to-bottom, 90 for left-to-right).
	 * @param stops Color stops (UIColor or [UIColor, position]).
	 */
	static linear(angle: number, ...stops: UIGradient.Stop[]) {
		return new UIGradient("linear", angle)._normalizeStops(stops);
	}

	/**
	 * Creates a radial gradient (center outward).
	 * @param stops Color stops (UIColor or [UIColor, position]).
	 */
	static radial(...stops: UIGradient.Stop[]) {
		return new UIGradient("radial", 0)._normalizeStops(stops);
	}

	/**
	 * Creates a conic gradient (sweep around center).
	 * @param angle The starting angle in degrees (e.g. 0 for from top).
	 * @param stops Color stops (UIColor or [UIColor, position]).
	 */
	static conic(angle: number, ...stops: UIGradient.Stop[]) {
		return new UIGradient("conic", angle)._normalizeStops(stops);
	}

	/**
	 * Creates a UIGradient instance, do not use directly.
	 * @note Use the static methods on {@link UIGradient} to create different types of gradients with any number of color stops.
	 * @param type The gradient type.
	 * @param angle The angle in degrees.
	 */
	private constructor(type: "linear" | "radial" | "conic", angle: number) {
		this._type = type;
		this._stops = [];
		this._angle = angle;
	}

	/** The type of gradient. */
	get type(): "linear" | "radial" | "conic" {
		return this._type;
	}

	/** The normalized color stops with positions between 0 and 1. */
	get stops(): ReadonlyArray<{ color: UIColor; pos: number }> {
		return this._stops as ReadonlyArray<{ color: UIColor; pos: number }>;
	}

	/** The angle of the gradient in degrees (for linear and conic gradients). */
	get angle(): number {
		return this._angle;
	}

	/**
	 * Always returns true
	 * - This property is used for duck typing to distinguish from {@link UIColor}
	 */
	isUIGradient() {
		return true;
	}

	/**
	 * Normalizes stop inputs to {color, pos} with auto-distribution per CSS spec.
	 * 1. First stop without explicit pos → 0.
	 * 2. Last stop without explicit pos → 1.
	 * 3. Interior stops without pos → evenly spaced between nearest positioned neighbors.
	 */
	private _normalizeStops(inputs: UIGradient.Stop[]) {
		let stops = (this._stops = inputs.map(
			(s): { color: UIColor; pos: number | undefined } => {
				if (Array.isArray(s)) return { color: s[0], pos: s[1] };
				return { color: s, pos: undefined };
			},
		));
		if (!stops.length) return this;

		// First and last default to 0 and 1
		if (stops[0]!.pos === undefined) stops[0]!.pos = 0;
		if (stops[stops.length - 1]!.pos === undefined)
			stops[stops.length - 1]!.pos = 1;

		// Fill in interior stops: evenly space between positioned neighbors
		let i = 0;
		while (i < stops.length) {
			if (stops[i]!.pos === undefined) {
				// Find the next positioned stop
				let start = i - 1;
				let end = i + 1;
				while (end < stops.length && stops[end]!.pos === undefined) end++;
				let startPos = stops[start]!.pos!;
				let endPos = stops[end]!.pos!;
				let count = end - start;
				for (let j = start + 1; j < end; j++) {
					stops[j]!.pos =
						startPos + ((endPos - startPos) * (j - start)) / count;
				}
				i = end;
			} else {
				i++;
			}
		}

		return this;
	}

	private _type: "linear" | "radial" | "conic";
	private _stops: { color: UIColor; pos: number | undefined }[];
	private _angle: number;
}

export namespace UIGradient {
	/** Type definition for a gradient color stop: either a UIColor (auto-positioned) or [UIColor, position 0-1]. */
	export type Stop = UIColor | [UIColor, number];
}
