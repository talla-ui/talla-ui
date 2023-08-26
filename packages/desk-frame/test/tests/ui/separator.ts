import { app, UISeparator } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UISeparator", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with defaults", () => {
		let sep = new UISeparator();
		expect(sep.thickness).toBe(1);
		expect(sep.margin).toBeUndefined();
	});

	test("Preset with properties", () => {
		let MySeparator = UISeparator.with({
			thickness: 2,
			margin: 8,
			color: "@Green",
			vertical: true,
		});
		let sep = new MySeparator();
		expect(sep).toHaveProperty("thickness").toBe(2);
		expect(sep).toHaveProperty("margin").toBe(8);
		expect(sep).toHaveProperty("color").toBe("@Green");
		expect(sep).toHaveProperty("vertical").toBe(true);
	});

	test("Rendered", async (t) => {
		app.render(new UISeparator());
		await t.expectOutputAsync(100, { type: "separator" });
	});
});
