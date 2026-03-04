import { app, UI } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

describe("UIDividerRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders hr element", async () => {
			const divider = UI.Divider().build();
			await renderView(divider);

			const el = document.querySelector("hr");
			expect(el).not.toBeNull();
		});
	});

	describe("Line width", () => {
		test("Default width is 1px", async () => {
			const divider = UI.Divider().build();
			await renderView(divider);

			const el = document.querySelector("hr") as HTMLElement;
			expect(el.style.borderWidth).toBe("0.0625rem"); // 1/16
		});

		test("Numeric width applies", async () => {
			const divider = UI.Divider(3).build();
			await renderView(divider);

			const el = document.querySelector("hr") as HTMLElement;
			expect(el.style.borderWidth).toBe("0.1875rem"); // 3/16
		});

		test("String width applies", async () => {
			const divider = UI.Divider("2px").build();
			await renderView(divider);

			const el = document.querySelector("hr") as HTMLElement;
			expect(el.style.borderWidth).toBe("2px");
		});
	});

	describe("Dynamic updates", () => {
		test("Property changes update styles", async () => {
			const divider = UI.Divider().build();
			await renderView(divider);

			const el = document.querySelector("hr") as HTMLElement;

			divider.lineWidth = 4;
			await waitForRender();
			expect(el.style.borderWidth).toBe("0.25rem"); // 4/16
		});
	});
});

describe("UISpacerRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders spacer element with flex-grow", async () => {
			const spacer = UI.Spacer().build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el).not.toBeNull();
			expect(el.style.flexGrow).toBe("1");
		});
	});

	describe("Dimensions", () => {
		test("minWidth applies", async () => {
			const spacer = UI.Spacer(100).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.minWidth).toBe("6.25rem"); // 100/16
		});

		test("minHeight applies", async () => {
			const spacer = UI.Spacer(undefined, 50).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.minHeight).toBe("3.125rem"); // 50/16
		});

		test("Both minWidth and minHeight default to same value", async () => {
			const spacer = UI.Spacer(80).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.minWidth).toBe("5rem"); // 80/16
			expect(el.style.minHeight).toBe("5rem");
		});

		test("Fixed width and height apply", async () => {
			const spacer = UI.Spacer().width(200).height(100).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.width).toBe("12.5rem"); // 200/16
			expect(el.style.height).toBe("6.25rem"); // 100/16
		});
	});

	describe("Flex properties", () => {
		test("flex with custom grow applies", async () => {
			const spacer = UI.Spacer(50).flex(2).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.flexGrow).toBe("2");
		});

		test("flex with shrink applies", async () => {
			const spacer = UI.Spacer().flex(0, 1).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.flexGrow).toBe("0");
			expect(el.style.flexShrink).toBe("1");
		});
	});

	describe("Position", () => {
		test.each([
			["center", "center"],
			["start", "flex-start"],
			["end", "flex-end"],
		] as const)("gravity %s sets alignSelf %s", async (gravity, expected) => {
			const spacer = UI.Spacer().position({ gravity }).build();
			await renderView(spacer);

			const el = document.querySelector("spacer") as HTMLElement;
			expect(el.style.alignSelf).toBe(expected);
		});
	});
});
