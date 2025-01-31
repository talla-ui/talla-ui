import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { ui, UISpacer } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor", () => {
	let spacer = new UISpacer(1, 2, 3, 4);
	expect(spacer).toMatchObject({
		width: 1,
		height: 2,
		minWidth: 3,
		minHeight: 4,
	});
});

test("View builder using dimensions", () => {
	let spacer = ui.spacer(10, 10).create();
	expect(spacer).toHaveProperty("width", 10);
	expect(spacer).toHaveProperty("height", 10);
});

test("Rendered", async () => {
	renderTestView(ui.spacer(10, 10).create());
	await expectOutputAsync({ type: "spacer" });
});
