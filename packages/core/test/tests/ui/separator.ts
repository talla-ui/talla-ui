import { app, ui, UISeparator } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

describe("UISeparator", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
	});

	test("Constructor with defaults", () => {
		let sep = new UISeparator();
		expect(sep.thickness).toBe(1);
		expect(sep.margin).toBe(app.theme?.separatorMargin);
	});

	test("View builder with properties", () => {
		let mySeparator = ui.separator({
			thickness: 2,
			margin: 8,
			color: ui.color.GREEN,
			vertical: true,
		});
		let sep = mySeparator.create();
		expect(sep).toHaveProperty("thickness").toBe(2);
		expect(sep).toHaveProperty("margin").toBe(8);
		expect(sep).toHaveProperty("color").toBe(ui.color.GREEN);
		expect(sep).toHaveProperty("vertical").toBe(true);
	});

	test("Rendered", async (t) => {
		t.render(new UISeparator());
		await t.expectOutputAsync({ type: "separator" });
	});
});
