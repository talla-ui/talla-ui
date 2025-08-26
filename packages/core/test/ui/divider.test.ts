import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIDivider } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with defaults", () => {
	let divider = new UIDivider();
	expect(divider.lineWidth).toBe(1);
	expect(divider.lineMargin).toBe(undefined);
});

test("View builder with properties", () => {
	let myDivider = UI.Divider(2, "green", 8).vertical();
	let divider = myDivider.create();
	expect(divider).toHaveProperty("lineWidth", 2);
	expect(divider).toHaveProperty("lineMargin", 8);
	expect(divider.lineColor).toBe(UI.colors.green);
	expect(divider).toHaveProperty("vertical", true);
});

test("Rendered", async () => {
	renderTestView(new UIDivider());
	await expectOutputAsync({ type: "divider" });
});
