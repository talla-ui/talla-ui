import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UI, UIColor } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
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

	test("Color value using constructor", () => {
		expect(new UIColor("Foo").toString()).toBe("Foo");
		expect(new UIColor("#000000").toString()).toBe("#000000");
	});

	test("Color value using predefined instance", () => {
		expect(UI.colors.black.toString()).toBe("#000000");
	});

	test("Color value using indirectly predefined instance", () => {
		let blue = UI.colors.blue;
		expect(blue.toString()).toBe("#2277ff");
		expect(UI.colors.accent.toString()).toBe("#222222");
		expect(UI.colors.text.toString()).toBe("#000");
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
		UIColor.setColors({
			customRed: "#ff0000",
			customBlue: new UIColor("#0000ff"),
		});
		expect(UIColor.getColor("customRed").toString()).toBe("#ff0000");
		expect(UIColor.getColor("customBlue").toString()).toBe("#0000ff");
	});

	test("UIColor.setColors updates existing colors", () => {
		UIColor.setColors({ testColor: "#111111" });
		let colorRef = UIColor.getColor("testColor");
		expect(colorRef.toString()).toBe("#111111");

		// Update the color
		UIColor.setColors({ testColor: "#222222" });
		// Same reference should now resolve to new value
		expect(colorRef.toString()).toBe("#222222");
	});

	test("UIColor.getColor returns cached references", () => {
		let ref1 = UIColor.getColor("accent");
		let ref2 = UIColor.getColor("accent");
		expect(ref1).toBe(ref2);
	});

	test("UIColor.getColor returns transparent for unknown colors", () => {
		let unknown = UIColor.getColor("unknownColorName");
		expect(unknown.toString()).toBe("transparent");
	});

	test("UI.color function returns color references", () => {
		UIColor.setColors({ myCustomColor: "#abcdef" });
		let color = UI.color("myCustomColor");
		expect(color.toString()).toBe("#abcdef");
	});

	test("UI.color returns same reference as UIColor.getColor", () => {
		let ref1 = UI.color("accent");
		let ref2 = UIColor.getColor("accent");
		expect(ref1).toBe(ref2);
	});

	test("UIColor.resolve creates dynamic color reference", () => {
		let baseColor = new UIColor("#123456");
		let resolved = UIColor.resolve(() => baseColor);
		expect(resolved.toString()).toBe("#123456");
	});

	test("UIColor.resolve returns transparent when factory returns undefined", () => {
		let resolved = UIColor.resolve(() => undefined);
		expect(resolved.toString()).toBe("transparent");
	});

	test("Derived colors update when base color changes", () => {
		UIColor.setColors({ derivedBase: "#000000" });
		let baseRef = UIColor.getColor("derivedBase");
		let derived = baseRef.brighten(0.5);

		// Get initial derived value
		let initialValue = derived.toString();

		// Update base color
		UIColor.setColors({ derivedBase: "#ffffff" });

		// Derived color should now produce different result
		let newValue = derived.toString();
		expect(newValue).not.toBe(initialValue);
	});
});

describe("Brightness and text color", () => {
	test("Default", () => {
		expect(UIColor.isBrightColor(new UIColor())).toBeTruthy();
	});

	test("Black and white", () => {
		expect(UIColor.isBrightColor(new UIColor())).toBeTruthy();
		expect(UIColor.isBrightColor(UI.colors.black)).toBeFalsy();
		expect(UIColor.isBrightColor(UI.colors.white)).toBeTruthy();
	});

	test("Black and white text", () => {
		let blackText = UI.colors.white.text();
		let whiteText = UI.colors.black.text();
		expect(UIColor.isBrightColor(blackText)).toBeFalsy();
		expect(UIColor.isBrightColor(whiteText)).toBeTruthy();
	});

	test("Hex color text", () => {
		let blackTextStr = UI.colors.white.text().toString();
		let whiteTextStr = UI.colors.black.text().toString();
		let textOnDarkStr = new UIColor("#333333").text().toString();
		let textOnLightStr = new UIColor("#cccccc").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("rgb color text", () => {
		let blackTextStr = UI.colors.white.text().toString();
		let whiteTextStr = UI.colors.black.text().toString();
		let textOnDarkStr = new UIColor("rgb(30,30,30)").text().toString();
		let textOnLightStr = new UIColor("rgb(200,200,200)").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("rgba color text", () => {
		let blackTextStr = UI.colors.white.text().toString();
		let whiteTextStr = UI.colors.black.text().toString();
		let textOnDarkStr = new UIColor("rgba(30,30,30, 128)").text().toString();
		let textOnLightStr = new UIColor("rgba(200,200,200,128)").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("Foreground selection", () => {
		let lightFg = UI.colors.white.fg(UI.colors.red, UI.colors.green);
		expect(lightFg.toString()).toBe(UI.colors.red.toString());
		let darkFg = UI.colors.black.fg(UI.colors.red, UI.colors.green);
		expect(darkFg.toString()).toBe(UI.colors.green.toString());
	});
});

describe("Color mixing", () => {
	test("Single mix, hex with transparent", () => {
		let red = new UIColor("#f00");
		let none = new UIColor();
		expect(red.mix(none, 0).toString()).toBe("rgb(255,0,0)");
		expect(red.mix(none, 1).toString()).toBe("rgba(0,0,0,0)");
		expect(red.mix(none, 0.5).toString()).toBe("rgba(128,0,0,0.5)");
		expect(none.mix(red, 0.5).toString()).toBe("rgba(128,0,0,0.5)");
	});

	test("Single mix, hex", () => {
		let red = new UIColor("#f00");
		let blue = new UIColor("#00f");
		expect(red.mix(blue, 0).toString()).toBe("rgb(255,0,0)");
		expect(red.mix(blue, 1).toString()).toBe("rgb(0,0,255)");
		expect(red.mix(blue, 0.5).toString()).toBe("rgb(128,0,128)");
	});

	test("Single mix, rgb", () => {
		let red = new UIColor("rgb(255,0,0)");
		let blue = new UIColor("rgb(0,0,255)");
		expect(red.mix(blue, 0).toString()).toBe("rgb(255,0,0)");
		expect(red.mix(blue, 1).toString()).toBe("rgb(0,0,255)");
		expect(red.mix(blue, 0.5).toString()).toBe("rgb(128,0,128)");
	});

	test("Single mix, rgba", () => {
		let red = new UIColor("rgba(255,0,0,.1)");
		let blue = new UIColor("rgba(0,0,255,.2)");
		expect(red.mix(blue, 0).toString()).toBe("rgba(255,0,0,0.1)");
		expect(red.mix(blue, 1).toString()).toBe("rgba(0,0,255,0.2)");
		expect(red.mix(blue, 0.5).toString()).toBe("rgba(128,0,128,0.15)");
	});

	test("Alpha, hex", () => {
		let black = new UIColor("#000000");
		let color = new UIColor("#123");
		expect(black.alpha(1).toString()).toBe("rgb(0,0,0)");
		expect(color.alpha(1).toString()).toBe("rgb(17,34,51)");
		expect(black.alpha(0).toString()).toBe("rgba(0,0,0,0)");
		expect(color.alpha(0).toString()).toBe("rgba(17,34,51,0)");
		expect(black.alpha(0.5).toString()).toBe("rgba(0,0,0,0.5)");
		expect(color.alpha(0.5).toString()).toBe("rgba(17,34,51,0.5)");
	});

	test("Alpha, rgb", () => {
		let black = new UIColor("rgb(0,0,0)");
		let color = new UIColor("rgb(17,34,51)");
		expect(black.alpha(1).toString()).toBe("rgb(0,0,0)");
		expect(color.alpha(1).toString()).toBe("rgb(17,34,51)");
		expect(black.alpha(0).toString()).toBe("rgba(0,0,0,0)");
		expect(color.alpha(0).toString()).toBe("rgba(17,34,51,0)");
		expect(black.alpha(0.5).toString()).toBe("rgba(0,0,0,0.5)");
		expect(color.alpha(0.5).toString()).toBe("rgba(17,34,51,0.5)");
	});

	test("Alpha, rgba", () => {
		let black = new UIColor("rgba(0,0,0,0.1)");
		let color = new UIColor("rgba(17,34,51,.2)");
		expect(black.alpha(1).toString()).toBe("rgba(0,0,0,0.1)");
		expect(color.alpha(1).toString()).toBe("rgba(17,34,51,0.2)");
		expect(black.alpha(0).toString()).toBe("rgba(0,0,0,0)");
		expect(color.alpha(0).toString()).toBe("rgba(17,34,51,0)");
		expect(black.alpha(0.5).toString()).toBe("rgba(0,0,0,0.05)");
		expect(color.alpha(0.5).toString()).toBe("rgba(17,34,51,0.1)");
	});

	test("Lum, hex", () => {
		let grey1 = new UIColor("#222"); // 0x22 = 34
		let grey2 = new UIColor("#ccc"); // 0xCC = 204
		expect(grey1.brighten(1).toString()).toBe("rgb(255,255,255)");
		expect(grey1.brighten(-1).toString()).toBe("rgb(0,0,0)");
		expect(grey1.brighten(0).toString()).toBe("rgb(34,34,34)");
		expect(grey1.brighten(0.5).toString()).toBe("rgb(145,145,145)");
		expect(grey1.brighten(-0.5).toString()).toBe("rgb(17,17,17)");
		expect(grey2.brighten(0.5).toString()).toBe("rgb(230,230,230)");
		expect(grey2.brighten(-0.5).toString()).toBe("rgb(102,102,102)");
	});

	test("Lum, rgb", () => {
		let grey1 = new UIColor("rgb(34,34,34)");
		let grey2 = new UIColor("rgb(204,204,204)");
		expect(grey1.brighten(1).toString()).toBe("rgb(255,255,255)");
		expect(grey1.brighten(-1).toString()).toBe("rgb(0,0,0)");
		expect(grey1.brighten(0).toString()).toBe("rgb(34,34,34)");
		expect(grey1.brighten(0.5).toString()).toBe("rgb(145,145,145)");
		expect(grey1.brighten(-0.5).toString()).toBe("rgb(17,17,17)");
		expect(grey2.brighten(0.5).toString()).toBe("rgb(230,230,230)");
		expect(grey2.brighten(-0.5).toString()).toBe("rgb(102,102,102)");
	});

	test("Lum, rgba", () => {
		let grey1 = new UIColor("rgba(34,34,34,.5)");
		let grey2 = new UIColor("rgba(204,204,204,.5)");
		expect(grey1.brighten(1).toString()).toBe("rgba(255,255,255,0.5)");
		expect(grey1.brighten(-1).toString()).toBe("rgba(0,0,0,0.5)");
		expect(grey1.brighten(0).toString()).toBe("rgba(34,34,34,0.5)");
		expect(grey1.brighten(0.5).toString()).toBe("rgba(145,145,145,0.5)");
		expect(grey1.brighten(-0.5).toString()).toBe("rgba(17,17,17,0.5)");
		expect(grey2.brighten(0.5).toString()).toBe("rgba(230,230,230,0.5)");
		expect(grey2.brighten(-0.5).toString()).toBe("rgba(102,102,102,0.5)");
	});

	test("Contrast, hex", () => {
		let grey1 = new UIColor("#222"); // 0x22 = 34
		let grey2 = new UIColor("#ccc"); // 0xCC = 204
		expect(grey1.contrast(0).toString()).toBe("rgb(34,34,34)");
		expect(grey1.contrast(0.5).toString()).toBe("rgb(17,17,17)");
		expect(grey1.contrast(-0.5).toString()).toBe("rgb(145,145,145)");
		expect(grey2.contrast(0.5).toString()).toBe("rgb(226,226,226)");
		expect(grey2.contrast(-0.5).toString()).toBe("rgb(117,117,117)");
	});

	test("Contrast, rgb", () => {
		let grey1 = new UIColor("rgb(34,34,34)");
		let grey2 = new UIColor("rgb(204,204,204)");
		expect(grey1.contrast(0).toString()).toBe("rgb(34,34,34)");
		expect(grey1.contrast(0.5).toString()).toBe("rgb(17,17,17)");
		expect(grey1.contrast(-0.5).toString()).toBe("rgb(145,145,145)");
		expect(grey2.contrast(0.5).toString()).toBe("rgb(226,226,226)");
		expect(grey2.contrast(-0.5).toString()).toBe("rgb(117,117,117)");
	});

	test("Contrast, rgba", () => {
		let grey1 = new UIColor("rgba(34,34,34,.5)");
		let grey2 = new UIColor("rgba(204,204,204,.5)");
		expect(grey1.contrast(0).toString()).toBe("rgba(34,34,34,0.5)");
		expect(grey1.contrast(0.5).toString()).toBe("rgba(17,17,17,0.5)");
		expect(grey1.contrast(-0.5).toString()).toBe("rgba(145,145,145,0.5)");
		expect(grey2.contrast(0.5).toString()).toBe("rgba(226,226,226,0.5)");
		expect(grey2.contrast(-0.5).toString()).toBe("rgba(117,117,117,0.5)");
	});

	test("Not throwing with invalid values", () => {
		expect(() => UIColor.mixColors("foo", 1 as any, 2)).not.toThrowError();
	});
});
