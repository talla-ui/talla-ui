import { app, UI, UIToggle } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

describe("UIToggleRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders checkbox with label", async () => {
			const toggle = UI.Toggle().build();
			await renderView(toggle);

			const span = document.querySelector("span");
			expect(span).not.toBeNull();

			const checkbox = span?.querySelector("input[type='checkbox']");
			expect(checkbox).not.toBeNull();

			const label = span?.querySelector("label");
			expect(label).not.toBeNull();
		});

		test("Checkbox comes before label in DOM", async () => {
			const toggle = UI.Toggle().build();
			await renderView(toggle);

			const span = document.querySelector("span");
			const children = span?.children;
			expect(children?.[0].tagName).toBe("INPUT");
			expect(children?.[1].tagName).toBe("LABEL");
		});

		test("Label htmlFor matches checkbox id", async () => {
			const toggle = UI.Toggle().build();
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			const label = document.querySelector("label") as HTMLLabelElement;

			expect(checkbox.id).toBeTruthy();
			expect(label.htmlFor).toBe(checkbox.id);
		});
	});

	describe("Text", () => {
		test("Label displays and updates text", async () => {
			const toggle = UI.Toggle("Accept terms").build() as UIToggle;
			await renderView(toggle);

			expect(document.querySelector("label")?.textContent).toBe("Accept terms");

			toggle.text = "Updated";
			await waitForRender();
			expect(document.querySelector("label")?.textContent).toBe("Updated");
		});

		test("Label hidden when no text", async () => {
			const toggle = UI.Toggle().build() as UIToggle;
			await renderView(toggle);

			const label = document.querySelector("label") as HTMLLabelElement;
			expect(label.style.display).toBe("none");

			toggle.text = "Some text";
			await waitForRender();
			expect(label.style.display).toBe("");

			toggle.text = undefined;
			await waitForRender();
			expect(label.style.display).toBe("none");
		});
	});

	describe("Value", () => {
		test("Checkbox checked reflects toggle value", async () => {
			const toggleTrue = UI.Toggle().value(true).build();
			await renderView(toggleTrue);
			expect(
				(document.querySelector("input[type='checkbox']") as HTMLInputElement)
					.checked,
			).toBe(true);

			const toggleFalse = UI.Toggle().value(false).build();
			await renderView(toggleFalse);
			expect(
				(document.querySelector("input[type='checkbox']") as HTMLInputElement)
					.checked,
			).toBe(false);
		});

		test("Value updates checkbox dynamically", async () => {
			const toggle = UI.Toggle().value(false).build() as UIToggle;
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			expect(checkbox.checked).toBe(false);

			toggle.value = true;
			await waitForRender();
			expect(checkbox.checked).toBe(true);

			toggle.value = false;
			await waitForRender();
			expect(checkbox.checked).toBe(false);
		});
	});

	describe("Disabled state", () => {
		test("Sets disabled on checkbox and wrapper", async () => {
			const toggle = UI.Toggle("Label").disabled(true).build();
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			const span = document.querySelector("span");
			const label = document.querySelector("label");

			expect(checkbox.disabled).toBe(true);
			expect(span?.getAttribute("disabled")).toBe("disabled");
			expect(label?.getAttribute("disabled")).toBe("disabled");
		});

		test("Enabled toggle has no disabled attributes", async () => {
			const toggle = UI.Toggle("Label").disabled(false).build();
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;
			expect(checkbox.disabled).toBe(false);
			expect(document.querySelector("span")?.hasAttribute("disabled")).toBe(
				false,
			);
		});
	});

	describe("User input", () => {
		test("Checkbox input updates toggle value", async () => {
			const toggle = UI.Toggle().value(false).build() as UIToggle;
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;

			checkbox.checked = true;
			checkbox.dispatchEvent(new Event("input", { bubbles: true }));
			await waitForRender();

			expect(toggle.value).toBe(true);
		});

		test("Disabled toggle ignores input", async () => {
			const toggle = UI.Toggle()
				.value(false)
				.disabled(true)
				.build() as UIToggle;
			await renderView(toggle);

			const checkbox = document.querySelector(
				"input[type='checkbox']",
			) as HTMLInputElement;

			checkbox.checked = true;
			checkbox.dispatchEvent(new Event("input", { bubbles: true }));
			await waitForRender();

			expect(toggle.value).toBe(false);
		});
	});

	describe("Name attribute", () => {
		test("Sets name on checkbox", async () => {
			const toggle = UI.Toggle().name("myToggle").build();
			await renderView(toggle);

			expect(
				(document.querySelector("input[type='checkbox']") as HTMLInputElement)
					.name,
			).toBe("myToggle");
		});
	});

	describe("Text style", () => {
		test("textStyle applies to label", async () => {
			const toggle = UI.Toggle("Styled")
				.textStyle({ fontWeight: "bold", fontSize: 20 })
				.build();
			await renderView(toggle);

			const label = document.querySelector("label") as HTMLElement;
			expect(label.style.fontWeight).toBe("bold");
			expect(label.style.fontSize).toBe("1.25rem"); // 20/16
		});
	});
});
