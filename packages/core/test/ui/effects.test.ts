import { UI } from "@talla-ui/core";
import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";

describe("Renderer effects (test-handler)", () => {
	beforeEach(() => {
		useTestContext();
	});

	describe("Rendering with effects", () => {
		test("View with effect renders without error", async () => {
			const column = UI.Column(UI.Text("Content")).effect("fade").build();
			renderTestView(column);
			await expectOutputAsync({ type: "column" });
		});

		test("View with multiple effects renders without error", async () => {
			const column = UI.Column(UI.Text("Content"))
				.effect("fade-in")
				.effect("scale-out")
				.build();
			renderTestView(column);
			await expectOutputAsync({ type: "column" });
		});

		test("UIShowView with effect on content renders without error", async () => {
			const show = UI.Show(UI.Text("Visible").effect("fade")).when(true);
			renderTestView(show.build());
			await expectOutputAsync({ text: "Visible" });
		});

		test("UIShowView with effect on content hides correctly", async () => {
			const show = UI.Show(UI.Text("Hidden").effect("fade")).when(false);
			renderTestView(show.build());
			// Content should not be visible
			await expect(
				expectOutputAsync({ text: "Hidden", timeout: 50 }),
			).rejects.toThrow(/timeout/);
		});
	});

	describe("Drag effects in test environment", () => {
		test("drag-modal effect renders without error", async () => {
			const column = UI.Column(UI.Text("Draggable")).effect("drag-modal").build();
			renderTestView(column);
			await expectOutputAsync({ type: "column" });
		});

		test("drag-relative effect renders without error", async () => {
			const column = UI.Column(UI.Text("Draggable"))
				.effect("drag-relative")
				.build();
			renderTestView(column);
			await expectOutputAsync({ type: "column" });
		});
	});
});
