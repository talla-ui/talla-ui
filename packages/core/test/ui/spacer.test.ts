import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, test } from "vitest";
import { UI } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Rendered", async () => {
	renderTestView(UI.Spacer(10, 10).create());
	await expectOutputAsync({
		type: "spacer",
		styles: { minWidth: 10, minHeight: 10 },
	});
});

test("Rendered, flexible", async () => {
	renderTestView(UI.Spacer().create());
	await expectOutputAsync({
		type: "spacer",
		styles: { grow: true },
	});
});
