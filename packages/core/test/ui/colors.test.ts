import { useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { UI, UIColor } from "../../dist/index.js";

// useTestContext() resets the test handler and re-registers default colors,
// but custom entries added via setColors() persist in the module-level registry.
// The afterEach cleanup sets custom test entries to transparent to prevent leaks.
let _customTestColors: string[] = [];

beforeEach(() => {
	useTestContext();
});

afterEach(() => {
	if (_customTestColors.length) {
		let reset: Record<string, string> = {};
		for (let name of _customTestColors) reset[name] = "transparent";
		UIColor.setColors(reset);
		_customTestColors = [];
	}
});

describe("Base colors", () => {
	test("UI.colors has predefined color keys", () => {
		expect(UI.colors).toHaveProperty("black");
		expect(UI.colors).toHaveProperty("white");
		expect(UI.colors).toHaveProperty("red");
		expect(UI.colors).toHaveProperty("blue");
		expect(UI.colors).toHaveProperty("transparent");
		expect(UI.colors).toHaveProperty("accent");
		expect(UI.colors).toHaveProperty("background");
		expect(UI.colors).toHaveProperty("text");
	});

	test("Color value using constructor (raw CSS passthrough)", () => {
		let raw = new UIColor("Foo");
		let out = raw.output();
		expect(out.raw).toBe("Foo");
		expect(out.rgbaString()).toBe("Foo");
		expect(out.oklchString()).toBe("Foo");
	});

	test("Color value using hex constructor", () => {
		let black = new UIColor("#000000");
		let out = black.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgb()[0]).toBe(0);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
		expect(out.rgbaString()).toBe("rgb(0,0,0)");
	});

	test("Color value using predefined instance", () => {
		let out = UI.colors.black.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgbaString()).toBe("rgb(0,0,0)");
	});

	test("Color value using indirectly predefined instance", () => {
		let blue = UI.colors.blue;
		let out = blue.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgb()[0]).toBe(34);
		expect(out.rgb()[1]).toBe(119);
		expect(out.rgb()[2]).toBe(255);
	});
});

describe("UIColor static factories", () => {
	test("UIColor.oklch creates color with direct values", () => {
		let c = UIColor.oklch(0.5, 0.15, 240);
		let out = c.output();
		expect(out.raw).toBeUndefined();
		expect(out.l).toBe(0.5);
		expect(out.c).toBe(0.15);
		expect(out.h).toBe(240);
		expect(out.alpha).toBe(1);
	});

	test("UIColor.oklch with alpha", () => {
		let c = UIColor.oklch(0.5, 0.1, 180, 0.5);
		let out = c.output();
		expect(out.alpha).toBe(0.5);
	});

	test("UIColor.rgb creates color from sRGB values", () => {
		let c = UIColor.rgb(255, 0, 0);
		let out = c.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgb()[0]).toBe(255);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
	});

	test("UIColor.rgb with alpha", () => {
		let c = UIColor.rgb(0, 0, 0, 0.5);
		let out = c.output();
		expect(out.alpha).toBe(0.5);
		expect(out.rgbaString()).toBe("rgba(0,0,0,0.5)");
	});
});

describe("UIColor.Output", () => {
	test("Parsed color result has correct structure", () => {
		let c = new UIColor("#ff0000");
		let out = c.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgb()[0]).toBe(255);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
		expect(out.alpha).toBe(1);
		expect(out.rgbaString()).toBe("rgb(255,0,0)");
		expect(out.oklchString()).toMatch(/^oklch\(/);
		expect(out.l).toBeGreaterThan(0);
		expect(out.c).toBeGreaterThan(0);
	});

	test("Raw color result passes through string", () => {
		let c = new UIColor("var(--accent)");
		let out = c.output();
		expect(out.raw).toBe("var(--accent)");
		expect(out.rgbaString()).toBe("var(--accent)");
		expect(out.oklchString()).toBe("var(--accent)");
		expect(out.l).toBe(0);
		expect(out.c).toBe(0);
		expect(out.h).toBe(0);
		expect(out.alpha).toBe(1);
	});

	test("Transparent color result", () => {
		let c = new UIColor("transparent");
		let out = c.output();
		expect(out.raw).toBeUndefined();
		expect(out.alpha).toBe(0);
		expect(out.rgbaString()).toBe("rgba(0,0,0,0)");
	});

	test("Output is cached and invalidated", () => {
		_customTestColors.push("cacheTest");
		UIColor.setColors({ cacheTest: "#ff0000" });
		let ref = UIColor.getColor("cacheTest");
		let out1 = ref.output();
		let out2 = ref.output();
		expect(out1).toBe(out2); // Same cached instance

		UIColor.setColors({ cacheTest: "#0000ff" });
		let out3 = ref.output();
		expect(out3).not.toBe(out1); // Invalidated
		expect(out3.rgb()[2]).toBe(255);
	});
});

describe("Color registration and lookup", () => {
	test("UIColor.defaults contains standard color references", () => {
		expect(UIColor.defaults).toHaveProperty("black");
		expect(UIColor.defaults).toHaveProperty("white");
		expect(UIColor.defaults).toHaveProperty("accent");
		expect(UIColor.defaults).toHaveProperty("text");
		expect(UIColor.defaults).toHaveProperty("background");
		expect(Object.keys(UIColor.defaults).length).toBeGreaterThan(20);
	});

	test("UIColor.setColors registers new colors", () => {
		_customTestColors.push("customRed", "customBlue");
		UIColor.setColors({
			customRed: "#ff0000",
			customBlue: new UIColor("#0000ff"),
		});
		expect(UIColor.getColor("customRed").output().rgbaString()).toBe(
			"rgb(255,0,0)",
		);
		expect(UIColor.getColor("customBlue").output().rgbaString()).toBe(
			"rgb(0,0,255)",
		);
	});

	test("UIColor.setColors updates existing colors", () => {
		_customTestColors.push("testColor");
		UIColor.setColors({ testColor: "#111111" });
		let colorRef = UIColor.getColor("testColor");
		expect(colorRef.output().rgb()[0]).toBe(17);

		// Update the color
		UIColor.setColors({ testColor: "#222222" });
		// Same reference should now resolve to new value
		expect(colorRef.output().rgb()[0]).toBe(34);
	});

	test("UIColor.getColor returns cached references", () => {
		let ref1 = UIColor.getColor("accent");
		let ref2 = UIColor.getColor("accent");
		expect(ref1).toBe(ref2);
	});

	test("UIColor.getColor returns transparent for unknown colors", () => {
		let unknown = UIColor.getColor("unknownColorName");
		expect(unknown.output().alpha).toBe(0);
		expect(unknown.output().rgbaString()).toBe("rgba(0,0,0,0)");
	});

	test("UI.color function returns color references", () => {
		_customTestColors.push("myCustomColor");
		UIColor.setColors({ myCustomColor: "#abcdef" });
		let color = UI.color("myCustomColor");
		let out = color.output();
		expect(out.raw).toBeUndefined();
		expect(out.rgb()[0]).toBe(171);
		expect(out.rgb()[1]).toBe(205);
		expect(out.rgb()[2]).toBe(239);
	});

	test("UI.color returns same reference as UIColor.getColor", () => {
		let ref1 = UI.color("accent");
		let ref2 = UIColor.getColor("accent");
		expect(ref1).toBe(ref2);
	});

	test("Derived colors update when base color changes", () => {
		_customTestColors.push("derivedBase");
		UIColor.setColors({ derivedBase: "#000000" });
		let baseRef = UIColor.getColor("derivedBase");
		let derived = baseRef.brighten(0.5);

		let initialRgba = derived.output().rgbaString();

		UIColor.setColors({ derivedBase: "#ffffff" });
		let newRgba = derived.output().rgbaString();
		expect(newRgba).not.toBe(initialRgba);
	});
});

describe("Brightness and text color", () => {
	test("Default (empty) color is treated as bright", () => {
		expect(UIColor.isBrightColor(new UIColor())).toBeTruthy();
	});

	test("Black and white", () => {
		expect(UIColor.isBrightColor(UI.colors.black)).toBeFalsy();
		expect(UIColor.isBrightColor(UI.colors.white)).toBeTruthy();
	});

	test("Black and white text", () => {
		let blackText = UI.colors.white.text();
		let whiteText = UI.colors.black.text();
		expect(UIColor.isBrightColor(blackText)).toBeFalsy();
		expect(UIColor.isBrightColor(whiteText)).toBeTruthy();
	});

	test("Hex color text selection", () => {
		let blackTextRgba = UI.colors.white.text().output().rgbaString();
		let whiteTextRgba = UI.colors.black.text().output().rgbaString();
		let textOnDark = new UIColor("#333333").text().output().rgbaString();
		let textOnLight = new UIColor("#cccccc").text().output().rgbaString();
		expect(textOnDark).toBe(whiteTextRgba);
		expect(textOnLight).toBe(blackTextRgba);
	});

	test("rgb color text selection", () => {
		let blackTextRgba = UI.colors.white.text().output().rgbaString();
		let whiteTextRgba = UI.colors.black.text().output().rgbaString();
		let textOnDark = new UIColor("rgb(30,30,30)").text().output().rgbaString();
		let textOnLight = new UIColor("rgb(200,200,200)")
			.text()
			.output()
			.rgbaString();
		expect(textOnDark).toBe(whiteTextRgba);
		expect(textOnLight).toBe(blackTextRgba);
	});

	test("rgba color text selection", () => {
		let blackTextRgba = UI.colors.white.text().output().rgbaString();
		let whiteTextRgba = UI.colors.black.text().output().rgbaString();
		let textOnDark = new UIColor("rgba(30,30,30,128)")
			.text()
			.output()
			.rgbaString();
		let textOnLight = new UIColor("rgba(200,200,200,128)")
			.text()
			.output()
			.rgbaString();
		expect(textOnDark).toBe(whiteTextRgba);
		expect(textOnLight).toBe(blackTextRgba);
	});

	test("UIColor.map derives a color lazily", () => {
		let source = UI.colors.white;
		let mapped = source.map((bg) =>
			UIColor.isBrightColor(bg) ? UI.colors.black : UI.colors.white,
		);
		// white is bright, so mapped should resolve to black
		expect(mapped.output().rgbaString()).toBe(
			UI.colors.black.output().rgbaString(),
		);
	});

	test("UIColor.map re-evaluates on cache invalidation", () => {
		UIColor.setColors({ background: UI.colors.white });
		_customTestColors.push("background");
		let mapped = UI.colors.background.map((bg) =>
			UIColor.isBrightColor(bg) ? UI.colors.black : UI.colors.white,
		);
		expect(mapped.output().rgbaString()).toBe(
			UI.colors.black.output().rgbaString(),
		);
		// switch to dark background
		UIColor.setColors({ background: UI.colors.black });
		expect(mapped.output().rgbaString()).toBe(
			UI.colors.white.output().rgbaString(),
		);
	});

	test("isBrightColor uses oklch L value", () => {
		// oklch L > 0.65 = bright
		let bright = UIColor.oklch(0.8, 0, 0); // L=0.8, bright
		let dark = UIColor.oklch(0.3, 0, 0); // L=0.3, dark
		expect(UIColor.isBrightColor(bright)).toBe(true);
		expect(UIColor.isBrightColor(dark)).toBe(false);
	});

	test("isBrightColor custom threshold", () => {
		let mid = UIColor.oklch(0.5, 0, 0);
		expect(UIColor.isBrightColor(mid, 0.4)).toBe(true);
		expect(UIColor.isBrightColor(mid, 0.6)).toBe(false);
	});

	test("isBrightColor supports duck-typed output path", () => {
		expect(
			UIColor.isBrightColor({
				output: () => UI.colors.white.output(),
			} as UIColor),
		).toBe(true);
		expect(
			UIColor.isBrightColor({
				output: () => UI.colors.black.output(),
			} as UIColor),
		).toBe(false);
	});
});

describe("Color mixing (oklab space)", () => {
	test("Mix red and blue at 50% produces perceptually correct blend", () => {
		let red = new UIColor("#f00");
		let blue = new UIColor("#00f");
		let mix = red.mix(blue, 0.5);
		let out = mix.output();
		// oklab interpolation produces a purple with non-zero green channel
		expect(out.rgb()[0]).toBeGreaterThan(100);
		expect(out.rgb()[1]).toBeGreaterThan(50);
		expect(out.rgb()[2]).toBeGreaterThan(100);
	});

	test("Mix at 0 returns first color", () => {
		let red = new UIColor("#f00");
		let blue = new UIColor("#00f");
		let out = red.mix(blue, 0).output();
		expect(out.rgb()[0]).toBe(255);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
	});

	test("Mix at 1 returns second color", () => {
		let red = new UIColor("#f00");
		let blue = new UIColor("#00f");
		let out = red.mix(blue, 1).output();
		expect(out.rgb()[0]).toBe(0);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(255);
	});

	test("Mix with transparent", () => {
		let red = new UIColor("#f00");
		let none = new UIColor();
		// mix at 0 = full red, alpha 1
		expect(red.mix(none, 0).output().rgbaString()).toBe("rgb(255,0,0)");
		// mix at 1 = transparent
		expect(red.mix(none, 1).output().alpha).toBe(0);
		// mix at 0.5 = half alpha
		let mix = red.mix(none, 0.5).output();
		expect(mix.alpha).toBeCloseTo(0.5, 2);
	});

	test("Mix rgba colors", () => {
		let red = new UIColor("rgba(255,0,0,.1)");
		let blue = new UIColor("rgba(0,0,255,.2)");
		let out0 = red.mix(blue, 0).output();
		expect(out0.alpha).toBeCloseTo(0.1, 4);
		let out1 = red.mix(blue, 1).output();
		expect(out1.alpha).toBeCloseTo(0.2, 4);
		let out05 = red.mix(blue, 0.5).output();
		expect(out05.alpha).toBeCloseTo(0.15, 4);
	});

	test("Alpha method preserves color, adjusts alpha", () => {
		let black = new UIColor("#000000");
		expect(black.alpha(1).output().rgbaString()).toBe("rgb(0,0,0)");
		expect(black.alpha(0).output().rgbaString()).toBe("rgba(0,0,0,0)");
		expect(black.alpha(0.5).output().rgbaString()).toBe("rgba(0,0,0,0.5)");
	});

	test("Alpha on hex color", () => {
		let color = new UIColor("#123");
		let out1 = color.alpha(1).output();
		expect(out1.rgb()[0]).toBe(17);
		expect(out1.rgb()[1]).toBe(34);
		expect(out1.rgb()[2]).toBe(51);
		expect(out1.alpha).toBe(1);

		let out0 = color.alpha(0).output();
		expect(out0.alpha).toBe(0);

		let out05 = color.alpha(0.5).output();
		expect(out05.alpha).toBe(0.5);
	});

	test("Alpha on rgba input preserves existing alpha", () => {
		let c = new UIColor("rgba(0,0,0,0.1)");
		expect(c.alpha(1).output().alpha).toBeCloseTo(0.1, 4);
		expect(c.alpha(0).output().alpha).toBe(0);
		expect(c.alpha(0.5).output().alpha).toBeCloseTo(0.05, 4);
	});

	test("Brighten toward white", () => {
		let grey = new UIColor("#222");
		let out = grey.brighten(0.5).output();
		// Should be significantly brighter
		expect(out.rgb()[0]).toBeGreaterThan(100);
		expect(out.rgb()[1]).toBeGreaterThan(100);
		expect(out.rgb()[2]).toBeGreaterThan(100);
	});

	test("Brighten extremes", () => {
		let grey = new UIColor("#222");
		expect(grey.brighten(1).output().rgbaString()).toBe("rgb(255,255,255)");
		expect(grey.brighten(-1).output().rgbaString()).toBe("rgb(0,0,0)");
		expect(grey.brighten(0).output().rgb()[0]).toBe(34);
	});

	test("Brighten with rgba preserves alpha", () => {
		let grey = new UIColor("rgba(34,34,34,.5)");
		let out = grey.brighten(0.5).output();
		expect(out.alpha).toBeCloseTo(0.5, 4);
		expect(out.rgb()[0]).toBeGreaterThan(100);
	});

	test("Contrast increases for bright colors", () => {
		let grey = new UIColor("#ccc");
		let out = grey.contrast(0.5).output();
		// Bright color + positive contrast = lighter
		expect(out.rgb()[0]).toBeGreaterThan(204);
	});

	test("Contrast increases for dark colors", () => {
		let grey = new UIColor("#222");
		let out = grey.contrast(0.5).output();
		// Dark color + positive contrast = darker
		expect(out.rgb()[0]).toBeLessThan(34);
	});

	test("Contrast zero produces no change", () => {
		let grey = new UIColor("#222");
		let out = grey.contrast(0).output();
		expect(out.rgb()[0]).toBe(34);
	});

	test("Contrast with rgba preserves alpha", () => {
		let grey = new UIColor("rgba(34,34,34,.5)");
		let out = grey.contrast(0.5).output();
		expect(out.alpha).toBeCloseTo(0.5, 4);
	});

	test("Raw CSS colors pass through mix unchanged", () => {
		let raw = new UIColor("var(--accent)");
		let mixed = raw.mix(new UIColor("#f00"), 0.5);
		let out = mixed.output();
		expect(out.raw).toBe("var(--accent)");
	});
});

describe("Hex and rgb parsing roundtrip", () => {
	test("3-digit hex roundtrips", () => {
		let c = new UIColor("#f00");
		let out = c.output();
		expect(out.rgb()[0]).toBe(255);
		expect(out.rgb()[1]).toBe(0);
		expect(out.rgb()[2]).toBe(0);
	});

	test("6-digit hex roundtrips", () => {
		let c = new UIColor("#2277ff");
		let out = c.output();
		expect(out.rgb()[0]).toBe(34);
		expect(out.rgb()[1]).toBe(119);
		expect(out.rgb()[2]).toBe(255);
	});

	test("rgb() roundtrips", () => {
		let c = new UIColor("rgb(34,119,255)");
		let out = c.output();
		expect(out.rgb()[0]).toBe(34);
		expect(out.rgb()[1]).toBe(119);
		expect(out.rgb()[2]).toBe(255);
	});

	test("rgba() roundtrips", () => {
		let c = new UIColor("rgba(34,119,255,0.5)");
		let out = c.output();
		expect(out.rgb()[0]).toBe(34);
		expect(out.rgb()[1]).toBe(119);
		expect(out.rgb()[2]).toBe(255);
		expect(out.alpha).toBe(0.5);
	});

	test("oklch() parsing", () => {
		let c = new UIColor("oklch(0.5 0.15 240)");
		let out = c.output();
		expect(out.l).toBe(0.5);
		expect(out.c).toBe(0.15);
		expect(out.h).toBe(240);
		expect(out.alpha).toBe(1);
	});

	test("oklch() with alpha", () => {
		let c = new UIColor("oklch(0.5 0.15 240 / 0.5)");
		let out = c.output();
		expect(out.alpha).toBe(0.5);
	});

	test("Pure colors roundtrip through oklch", () => {
		for (let [r, g, b] of [
			[255, 0, 0],
			[0, 255, 0],
			[0, 0, 255],
			[255, 255, 255],
			[0, 0, 0],
			[128, 128, 128],
		] as const) {
			let c = UIColor.rgb(r, g, b);
			let out = c.output();
			expect(out.rgb()[0]).toBe(r);
			expect(out.rgb()[1]).toBe(g);
			expect(out.rgb()[2]).toBe(b);
		}
	});
});
