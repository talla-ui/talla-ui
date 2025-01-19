import { useTestContext } from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UIColor, ui } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

describe("Base colors", () => {
	test("Color value using constructor", () => {
		expect(new UIColor("Foo").toString()).toBe("Foo");
		expect(new UIColor("#000000").toString()).toBe("#000000");
	});

	test("Color value using predefined instance", () => {
		expect(ui.color.BLACK.toString()).toBe("#000000");
	});

	test("Color value using indirectly predefined instance", () => {
		let blue = ui.color("Blue").toString();
		expect(ui.color.PRIMARY.toString()).toBe(blue);
		expect(ui.color.TEXT.toString()).toBe("#000000");
	});
});

describe("Brightness and text color", () => {
	test("Default", () => {
		expect(UIColor.isBrightColor(new UIColor())).toBeTruthy();
	});

	test("Black and white", () => {
		expect(UIColor.isBrightColor(new UIColor())).toBeTruthy();
		expect(UIColor.isBrightColor(ui.color.BLACK)).toBeFalsy();
		expect(UIColor.isBrightColor(ui.color.WHITE)).toBeTruthy();
	});

	test("Black and white text", () => {
		let blackText = ui.color.WHITE.text();
		let whiteText = ui.color.BLACK.text();
		expect(UIColor.isBrightColor(blackText)).toBeFalsy();
		expect(UIColor.isBrightColor(whiteText)).toBeTruthy();
	});

	test("Hex color text", () => {
		let blackTextStr = ui.color.WHITE.text().toString();
		let whiteTextStr = ui.color.BLACK.text().toString();
		let textOnDarkStr = new UIColor("#333333").text().toString();
		let textOnLightStr = new UIColor("#cccccc").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("rgb color text", () => {
		let blackTextStr = ui.color.WHITE.text().toString();
		let whiteTextStr = ui.color.BLACK.text().toString();
		let textOnDarkStr = new UIColor("rgb(30,30,30)").text().toString();
		let textOnLightStr = new UIColor("rgb(200,200,200)").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("rgba color text", () => {
		let blackTextStr = ui.color.WHITE.text().toString();
		let whiteTextStr = ui.color.BLACK.text().toString();
		let textOnDarkStr = new UIColor("rgba(30,30,30, 128)").text().toString();
		let textOnLightStr = new UIColor("rgba(200,200,200,128)").text().toString();
		expect(textOnDarkStr).toBe(whiteTextStr);
		expect(textOnLightStr).toBe(blackTextStr);
	});

	test("Foreground selection", () => {
		let lightFg = ui.color.WHITE.fg(ui.color.RED, ui.color.GREEN);
		expect(lightFg.toString()).toBe(ui.color.RED.toString());
		let darkFg = ui.color.BLACK.fg(ui.color.RED, ui.color.GREEN);
		expect(darkFg.toString()).toBe(ui.color.GREEN.toString());
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
