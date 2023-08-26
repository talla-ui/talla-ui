import { app, UISpacer } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UISpacer", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor", () => {
		let spacer = new UISpacer();
		expect(spacer).toHaveProperty("shrinkwrap").toBeFalsy();
	});

	test("Preset using min width", () => {
		let spacer = new (UISpacer.withWidth(10))();
		expect(spacer.dimensions).toHaveProperty("minWidth").toBe(10);
		expect(spacer.dimensions.minHeight).toBeUndefined();
	});

	test("Preset using min height", () => {
		let spacer = new (UISpacer.withHeight(10))();
		expect(spacer.dimensions).toHaveProperty("minHeight").toBe(10);
		expect(spacer.dimensions.minWidth).toBeUndefined();
	});

	test("Preset using width and height", () => {
		let MySpacer = UISpacer.with({
			width: 10,
			height: 10,
		});
		let spacer = new MySpacer();
		expect(spacer.dimensions).toHaveProperty("minHeight").toBe(10);
		expect(spacer.dimensions).toHaveProperty("minWidth").toBe(10);
	});

	test("Rendered", async (t) => {
		app.render(new UISpacer());
		await t.expectOutputAsync(50, { type: "spacer" });
	});
});
