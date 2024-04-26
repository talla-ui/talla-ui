import { ui, UISpacer } from "../../../dist/index.js";
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
		let spacer = new (ui.spacer(10, 10))();
		expect(spacer).toHaveProperty("width").toBe(10);
		expect(spacer).toHaveProperty("height").toBe(10);
	});

	test("Rendered", async (t) => {
		t.render(new UISpacer());
		await t.expectOutputAsync(50, { type: "spacer" });
	});
});
