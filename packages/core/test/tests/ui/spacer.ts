import { ui, UISpacer } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

describe("UISpacer", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
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

	test("View builder using dimensions", () => {
		let spacer = ui.spacer(10, 10).create();
		expect(spacer).toHaveProperty("width").toBe(10);
		expect(spacer).toHaveProperty("height").toBe(10);
	});

	test("Rendered", async (t) => {
		t.render(ui.spacer(10, 10).create());
		await t.expectOutputAsync({ type: "spacer" });
	});
});
