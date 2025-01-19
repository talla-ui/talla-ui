import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { app, ui, UISeparator } from "../../dist/index.js";

beforeEach(() => {
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
	expect(sep).toHaveProperty("thickness", 2);
	expect(sep).toHaveProperty("margin", 8);
	expect(sep).toHaveProperty("color", ui.color.GREEN);
	expect(sep).toHaveProperty("vertical", true);
});

test("Rendered", async () => {
	renderTestView(new UISeparator());
	await expectOutputAsync({ type: "separator" });
});
