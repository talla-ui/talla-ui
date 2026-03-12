// --- mix OKLCH colors (through OKLAB) ---

/** @internal Mix two OKLCH colors via linear interpolation in oklab space. Returns [l, c, h]. */
export function mixOklch(
	l1: number,
	c1: number,
	h1: number,
	l2: number,
	c2: number,
	h2: number,
	amount: number,
) {
	let [L1, a1, b1] = oklchToOklab(l1, c1, h1);
	let [L2, a2, b2] = oklchToOklab(l2, c2, h2);
	return oklabToOklch(
		L1 + (L2 - L1) * amount,
		a1 + (a2 - a1) * amount,
		b1 + (b2 - b1) * amount,
	);
}

/** Convert oklab (L, a, b) to OKLCH polar form (L, chroma, hue). */
function oklabToOklch(
	L: number,
	a: number,
	b: number,
): [number, number, number] {
	let c = Math.sqrt(a * a + b * b);
	let h = c < 1e-8 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
	return [L, c, h];
}

/** Convert OKLCH polar form (L, chroma, hue) to oklab (L, a, b). */
function oklchToOklab(
	l: number,
	c: number,
	h: number,
): [number, number, number] {
	let hRad = (h * Math.PI) / 180;
	return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

// --- Conversion (also through OKLAB) ---

/** @internal Convert sRGB (0-1 floats) to OKLCH. Returns [l, c, h]. */
export function srgbToOklch(
	r: number,
	g: number,
	b: number,
): [number, number, number] {
	let [L, a, B] = srgbToOklab(r, g, b);
	return oklabToOklch(L, a, B);
}

/** @internal Convert OKLCH to sRGB (0-255 integers, clamped). Returns [r, g, b]. */
export function oklchToSrgb(
	l: number,
	c: number,
	h: number,
): [number, number, number] {
	let [L, a, b] = oklchToOklab(l, c, h);
	let [r, g, B] = oklabToSrgb(L, a, b);
	return [
		Math.round(Math.max(0, Math.min(255, r * 255))),
		Math.round(Math.max(0, Math.min(255, g * 255))),
		Math.round(Math.max(0, Math.min(255, B * 255))),
	];
}

/** Convert sRGB (0-1 floats) to oklab. Returns [L, a, b]. */
function srgbToOklab(
	r: number,
	g: number,
	b: number,
): [number, number, number] {
	const linearize = (c: number) =>
		c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

	// r,g,b in 0-1
	let lr = linearize(r);
	let lg = linearize(g);
	let lb = linearize(b);

	// Linear RGB -> LMS (M1 matrix, Ottosson)
	let l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
	let m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
	let s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

	// Cube root
	let l_ = Math.cbrt(l);
	let m_ = Math.cbrt(m);
	let s_ = Math.cbrt(s);

	// LMS -> oklab (M2 matrix)
	let L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
	let a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
	let B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
	return [L, a, B];
}

/** Convert oklab to sRGB (0-1 floats, unclamped). Returns [r, g, b]. */
function oklabToSrgb(
	L: number,
	a: number,
	b: number,
): [number, number, number] {
	// oklab -> cube-root LMS (exact inverse of M2)
	let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	let s_ = L - 0.0894841775 * a - 1.291485548 * b;

	// Cube
	let l = l_ * l_ * l_;
	let m = m_ * m_ * m_;
	let s = s_ * s_ * s_;

	// LMS -> linear RGB (exact inverse of M1, computed via Cramer's rule)
	let lr =
		4.0767416613479943 * l - 3.3077115904081933 * m + 0.2309699287294278 * s;
	let lg =
		-1.2684380040921761 * l + 2.6097574006633715 * m - 0.3413193963102195 * s;
	let lb =
		-0.004196086541837 * l - 0.7034186144594494 * m + 1.7076147009309446 * s;

	// Gamma encode and return 0-1
	const gammaEncode = (c: number) =>
		c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
	return [gammaEncode(lr), gammaEncode(lg), gammaEncode(lb)];
}

// --- Parsing ---

/** @internal Parse 3 or 6 digit hex color. Returns [r, g, b] (0-255) or undefined. */
export function parseHex(hex: string): [number, number, number] | undefined {
	let m = /^#([0-9a-f]{3,6})$/i.exec(hex);
	if (!m) return;
	let h = m[1]!;
	if (h.length === 3) {
		return [
			parseInt(h[0]! + h[0]!, 16),
			parseInt(h[1]! + h[1]!, 16),
			parseInt(h[2]! + h[2]!, 16),
		];
	}
	if (h.length === 6) {
		return [
			parseInt(h.slice(0, 2), 16),
			parseInt(h.slice(2, 4), 16),
			parseInt(h.slice(4, 6), 16),
		];
	}
}

/** @internal Parse rgb() or rgba() string. Returns [r, g, b, alpha] or undefined. */
export function parseRgb(
	str: string,
): [number, number, number, number] | undefined {
	let m =
		/^rgba?\(\s*(\d+)\s*[,/\s]\s*(\d+)\s*[,/\s]\s*(\d+)\s*(?:[,/\s]\s*([0-9.]+))?\s*\)$/.exec(
			str,
		);
	if (!m) return;
	return [+m[1]!, +m[2]!, +m[3]!, m[4] !== undefined ? +m[4]! : 1];
}

/** @internal Parse oklch() string. Returns [l, c, h, alpha] or undefined. */
export function parseOklch(
	str: string,
): [number, number, number, number] | undefined {
	let m =
		/^oklch\(\s*([0-9.]+%?)\s+([0-9.]+%?)\s+([0-9.]+)\s*(?:[/]\s*([0-9.]+%?))?\s*\)$/.exec(
			str,
		);
	if (!m) return;
	let l = m[1]!.endsWith("%") ? parseFloat(m[1]!) / 100 : +m[1]!;
	let c = m[2]!.endsWith("%") ? (parseFloat(m[2]!) / 100) * 0.4 : +m[2]!;
	let h = +m[3]!;
	let a =
		m[4] !== undefined
			? m[4]!.endsWith("%")
				? parseFloat(m[4]!) / 100
				: +m[4]!
			: 1;
	return [l, c, h, a];
}
