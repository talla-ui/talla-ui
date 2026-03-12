import { useTestContext } from "@talla-ui/test-handler";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { UI, UIColor } from "../../dist/index.js";

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

describe("UIColor.MappedValue", () => {
	test("Constructed from UIColor, resolve returns the color", () => {
		let mv = UIColor.mappedValue(UI.colors.red);
		let resolved = mv.resolve();
		expect(resolved).toBe(UI.colors.red);
	});

	test("Constructed from UIColor.Gradient, resolve returns the gradient", () => {
		let gradient = UIColor.linearGradient(180, UI.colors.red, UI.colors.blue);
		let mv = UIColor.mappedValue(gradient);
		expect(mv.resolve()).toBe(gradient);
	});

	test("Constructed from color name string", () => {
		let mv = UIColor.mappedValue("red");
		let resolved = mv.resolve();
		expect(resolved).toBeInstanceOf(UIColor);
		expect((resolved as UIColor).output().rgbaString()).toBe(
			UI.colors.red.output().rgbaString(),
		);
	});

	test("map transforms UIColor source to UIColor", () => {
		let mv = UIColor.mappedValue(UI.colors.white, (source) =>
			UIColor.isBrightColor(source as UIColor)
				? UI.colors.black
				: UI.colors.white,
		);
		let resolved = mv.resolve();
		expect(resolved).toBeInstanceOf(UIColor);
		expect((resolved as UIColor).output().rgbaString()).toBe(
			UI.colors.black.output().rgbaString(),
		);
	});

	test("map transforms UIColor source to Gradient", () => {
		let gradient = UIColor.linearGradient(
			180,
			UI.colors.black,
			UI.colors.darkGray,
		);
		let mv = UIColor.mappedValue(UI.colors.white, (source) =>
			UIColor.isBrightColor(source as UIColor) ? UI.colors.white : gradient,
		);
		// white is bright, so returns the color
		expect(mv.resolve()).toBe(UI.colors.white);
	});

	test("map returns gradient for dark source", () => {
		let gradient = UIColor.linearGradient(
			180,
			UI.colors.black,
			UI.colors.darkGray,
		);
		let mv = UIColor.mappedValue(UI.colors.black, (source) =>
			UIColor.isBrightColor(source as UIColor) ? UI.colors.white : gradient,
		);
		expect(mv.resolve()).toBe(gradient);
	});

	test("map re-evaluates on cache invalidation", () => {
		UIColor.setColors({ background: UI.colors.white });
		_customTestColors.push("background");
		let gradient = UIColor.linearGradient(
			180,
			UI.colors.black,
			UI.colors.darkGray,
		);
		let mv = UIColor.mappedValue("background", (source) =>
			UIColor.isBrightColor(source as UIColor) ? UI.colors.white : gradient,
		);
		// light background => white color
		expect(mv.resolve()).toBe(UI.colors.white);
		// switch to dark
		UIColor.setColors({ background: UI.colors.black });
		// should now resolve to gradient
		expect(mv.resolve()).toBe(gradient);
	});

	test("map caches resolved value", () => {
		let callCount = 0;
		let mv = UIColor.mappedValue(UI.colors.white, () => {
			callCount++;
			return UI.colors.red;
		});
		mv.resolve();
		mv.resolve();
		mv.resolve();
		expect(callCount).toBe(1);
	});

	test("map chaining works", () => {
		let mv = UIColor.mappedValue(UI.colors.white);
		let step1 = mv.map(() => UI.colors.red);
		let step2 = step1.map(() => UI.colors.blue);
		expect((step2.resolve() as UIColor).output().rgbaString()).toBe(
			UI.colors.blue.output().rgbaString(),
		);
	});

	test("map chaining re-evaluates on cache invalidation", () => {
		UIColor.setColors({ background: UI.colors.white });
		_customTestColors.push("background");
		let gradient = UIColor.linearGradient(
			180,
			UI.colors.black,
			UI.colors.darkGray,
		);
		let mv = UIColor.mappedValue("background");
		let step1 = mv.map((source) =>
			UIColor.isBrightColor(source as UIColor) ? UI.colors.white : gradient,
		);
		let step2 = step1.map((source) =>
			source instanceof UIColor ? source.alpha(0.5) : source,
		);
		// light => white with alpha
		let r1 = step2.resolve() as UIColor;
		expect(r1.output().alpha).toBeCloseTo(0.5);
		// switch to dark => gradient (passes through unchanged)
		UIColor.setColors({ background: UI.colors.black });
		expect(step2.resolve()).toBe(gradient);
	});

	test("map callback returning MappedValue resolves recursively", () => {
		let mv = UIColor.mappedValue(UI.colors.white);
		let mapped = mv.map(() => UIColor.mappedValue(UI.colors.red));
		let resolved = mapped.resolve();
		// resolve() returns a MappedValue, which backgroundToCSS handles recursively
		expect(resolved).toBeInstanceOf(UIColor.MappedValue);
		// the inner MappedValue resolves to red
		expect(
			((resolved as UIColor.MappedValue).resolve() as UIColor)
				.output()
				.rgbaString(),
		).toBe(UI.colors.red.output().rgbaString());
	});

	test("map with Gradient source", () => {
		let gradient = UIColor.linearGradient(180, UI.colors.red, UI.colors.blue);
		let mv = UIColor.mappedValue(gradient);
		let mapped = mv.map((source) => {
			// source is the gradient itself
			expect(source).toBeInstanceOf(UIColor.Gradient);
			return UI.colors.green;
		});
		expect((mapped.resolve() as UIColor).output().rgbaString()).toBe(
			UI.colors.green.output().rgbaString(),
		);
	});
});
