import { app, UISpacer } from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UISpacer", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor", () => {
		let spacer = new UISpacer(1, 2, 3, 4);
		expect(spacer).toHaveProperties({
			width: 1,
			height: 2,
			minWidth: 3,
			minHeight: 4,
		});
	});

	test("Preset using dimensions", () => {
		let widthSpacer = new (UISpacer.withWidth(10))();
		expect(widthSpacer).toHaveProperty("width").toBe(10);
		let heightSpacer = new (UISpacer.withHeight(10))();
		expect(heightSpacer).toHaveProperty("height").toBe(10);
	});

	test("Rendered", async (t) => {
		app.showPage(new UISpacer());
		await t.expectOutputAsync(50, { type: "spacer" });
	});
});
