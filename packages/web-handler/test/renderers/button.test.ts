import { app, UI } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

describe("UIButtonRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders button element with text", async () => {
			const button = UI.Button("Click me").build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el).not.toBeNull();
			expect(el?.textContent).toBe("Click me");
			expect(el?.type).toBe("button");
		});

		test("Empty button renders without text", async () => {
			const button = UI.Button().build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el).not.toBeNull();
			expect(el?.textContent).toBe("");
		});
	});

	describe("Icon rendering", () => {
		test("Renders icon element", async () => {
			const button = UI.Button("With Icon").icon("check").build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el?.querySelector("svg")).not.toBeNull();
		});

		test("Renders chevron element", async () => {
			const button = UI.Button("Dropdown").chevron("down").build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el?.querySelector("._chevron-wrapper")).not.toBeNull();
		});

		test("Renders both icon and chevron", async () => {
			const button = UI.Button("Menu").icon("check").chevron("down").build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el?.querySelector("svg")).not.toBeNull();
			expect(el?.querySelector("._chevron-wrapper")).not.toBeNull();
		});
	});

	describe("Disabled state", () => {
		test("Sets disabled and aria-disabled attributes", async () => {
			const button = UI.Button("Disabled").disabled().build();
			await renderView(button);

			const el = document.querySelector("button") as HTMLButtonElement;
			expect(el.disabled).toBe(true);
			expect(el.getAttribute("aria-disabled")).toBe("true");
		});

		test("Updates disabled state dynamically", async () => {
			const button = UI.Button("Toggle").build();
			await renderView(button);

			const el = document.querySelector("button") as HTMLButtonElement;
			expect(el.disabled).toBe(false);
			expect(el.getAttribute("aria-disabled")).toBeNull();

			button.disabled = true;
			await waitForRender();

			expect(el.disabled).toBe(true);
			expect(el.getAttribute("aria-disabled")).toBe("true");
		});
	});

	describe("Pressed state", () => {
		test("Sets aria-pressed attribute", async () => {
			const pressedTrue = UI.Button("Pressed").pressed().build();
			await renderView(pressedTrue);
			expect(
				document.querySelector("button")?.getAttribute("aria-pressed"),
			).toBe("true");

			const pressedFalse = UI.Button("Not Pressed").pressed(false).build();
			await renderView(pressedFalse);
			expect(
				document.querySelector("button")?.getAttribute("aria-pressed"),
			).toBe("false");

			const noPressedProp = UI.Button("Normal").build();
			await renderView(noPressedProp);
			expect(
				document.querySelector("button")?.getAttribute("aria-pressed"),
			).toBeNull();
		});

		test("Updates pressed state dynamically", async () => {
			const button = UI.Button("Toggle").build();
			await renderView(button);

			const el = document.querySelector("button");
			expect(el?.getAttribute("aria-pressed")).toBeNull();

			button.pressed = true;
			await waitForRender();
			expect(el?.getAttribute("aria-pressed")).toBe("true");

			button.pressed = false;
			await waitForRender();
			expect(el?.getAttribute("aria-pressed")).toBe("false");

			button.pressed = undefined;
			await waitForRender();
			expect(el?.getAttribute("aria-pressed")).toBeNull();
		});
	});

	describe("Button as link", () => {
		test("accessibleRole link renders as anchor", async () => {
			const button = UI.Button("Link").accessibleRole("link").build();
			await renderView(button);

			expect(document.querySelector("a")).not.toBeNull();
			expect(document.querySelector("button")).toBeNull();
		});

		test("navigateTo sets link role automatically", async () => {
			const button = UI.Button("Navigate").navigateTo("/home").build();
			await renderView(button);

			expect(document.querySelector("a")).not.toBeNull();
		});
	});

	describe("Keyboard focus", () => {
		test("Default button has tabIndex 0", async () => {
			const button = UI.Button("Focusable").build();
			await renderView(button);
			expect(document.querySelector("button")?.tabIndex).toBe(0);
		});

		test("disableKeyboardFocus sets tabIndex -1", async () => {
			const button = UI.Button("No Keyboard").disableKeyboardFocus().build();
			await renderView(button);
			expect(document.querySelector("button")?.tabIndex).toBe(-1);
		});
	});

	describe("Dynamic updates", () => {
		test("Text updates when property changes", async () => {
			const button = UI.Button("Initial").build();
			await renderView(button);

			expect(document.querySelector("button")?.textContent).toBe("Initial");

			button.text = "Updated";
			await waitForRender();
			expect(document.querySelector("button")?.textContent).toBe("Updated");
		});
	});
});
