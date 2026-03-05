import { app, UI, UITextField } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	renderView,
	setupWebContext,
	simulateInput,
	waitForRender,
} from "../helpers.js";

describe("UITextFieldRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders input element with correct defaults", async () => {
			const field = UI.TextField().build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input).not.toBeNull();
			expect(input.tabIndex).toBe(0);
			expect(input.type).toBe("text");
			expect(input.className).toContain("-textfield");
		});

		test("Multiline renders textarea element", async () => {
			const field = UI.TextField().multiline().build();
			await renderView(field);

			const textarea = document.querySelector("textarea");
			expect(textarea).not.toBeNull();
			expect(textarea?.tabIndex).toBe(0);
		});

		test("Multiline height sets style", async () => {
			const field = UI.TextField().multiline(true, 100).build();
			await renderView(field);

			const textarea = document.querySelector(
				"textarea",
			) as HTMLTextAreaElement;
			expect(textarea.style.height).toBe("6.25rem"); // 100/16
		});
	});

	describe("Placeholder", () => {
		test("Sets placeholder attribute", async () => {
			const field = UI.TextField("Enter text").build();
			await renderView(field);
			expect(document.querySelector("input")?.placeholder).toBe("Enter text");
		});

		test("Empty placeholder uses space for layout", async () => {
			const field = UI.TextField().build();
			await renderView(field);
			expect(document.querySelector("input")?.placeholder).toBe(" ");
		});

		test("Updates placeholder dynamically", async () => {
			const field = UI.TextField("Initial").build() as UITextField;
			await renderView(field);

			field.placeholder = "Updated";
			await waitForRender();

			expect(document.querySelector("input")?.placeholder).toBe("Updated");
		});
	});

	describe("Value", () => {
		test("Sets and updates value", async () => {
			const field = UI.TextField().value("Initial").build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.value).toBe("Initial");

			field.value = "Updated";
			await waitForRender();
			expect(input.value).toBe("Updated");

			(field as any).value = null;
			await waitForRender();
			expect(input.value).toBe("");
		});
	});

	describe("Disabled state", () => {
		test("Sets and updates disabled attribute", async () => {
			const field = UI.TextField().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.disabled).toBe(false);

			field.disabled = true;
			await waitForRender();
			expect(input.disabled).toBe(true);
		});

		test("Disabled field ignores input events", async () => {
			const field = UI.TextField().disabled().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			simulateInput(input, "test");

			expect(field.value).toBe("");
		});
	});

	describe("ReadOnly state", () => {
		test("Sets and updates readOnly attribute", async () => {
			const field = UI.TextField().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.readOnly).toBe(false);

			field.readOnly = true;
			await waitForRender();
			expect(input.readOnly).toBe(true);
		});
	});

	describe("Input types", () => {
		test.each(["password", "email", "number", "date", "search"] as const)(
			"type %s sets input type",
			async (type) => {
				const field = UI.TextField().type(type).build();
				await renderView(field);
				expect(document.querySelector("input")?.type).toBe(type);
			},
		);

		test("numeric type sets inputMode and type=text", async () => {
			const field = UI.TextField().type("numeric").build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.inputMode).toBe("numeric");
			expect(input.type).toBe("text");
		});

		test("decimal type sets inputMode and type=text", async () => {
			const field = UI.TextField().type("decimal").build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.inputMode).toBe("decimal");
			expect(input.type).toBe("text");
		});
	});

	describe("Name attribute", () => {
		test("Sets name on input and textarea", async () => {
			const field = UI.TextField().name("username").build();
			await renderView(field);
			expect(document.querySelector("input")?.name).toBe("username");

			const multiline = UI.TextField().multiline().name("description").build();
			await renderView(multiline);
			expect(document.querySelector("textarea")?.name).toBe("description");
		});
	});

	describe("User input", () => {
		test("Input event updates UITextField value", async () => {
			const field = UI.TextField().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			simulateInput(input, "typed text");

			expect(field.value).toBe("typed text");
		});

		test("Textarea input updates value", async () => {
			const field = UI.TextField().multiline().build() as UITextField;
			await renderView(field);

			const textarea = document.querySelector(
				"textarea",
			) as HTMLTextAreaElement;
			textarea.value = "multiline input";
			textarea.dispatchEvent(new Event("input", { bubbles: true }));

			expect(field.value).toBe("multiline input");
		});
	});

	describe("enterKeyHint", () => {
		test.each(["go", "search", "send", "done", "next"] as const)(
			"enterKeyHint %s",
			async (hint) => {
				const field = UI.TextField().enterKeyHint(hint).build();
				await renderView(field);
				expect(document.querySelector("input")?.enterKeyHint).toBe(hint);
			},
		);
	});

	describe("Spellcheck", () => {
		test("disableSpellCheck sets spellcheck=false", async () => {
			const field = UI.TextField().disableSpellCheck().build();
			await renderView(field);
			expect(document.querySelector("input")?.spellcheck).toBe(false);
		});

		test("Default does not set spellcheck attribute", async () => {
			const field = UI.TextField().build();
			await renderView(field);
			expect(document.querySelector("input")?.hasAttribute("spellcheck")).toBe(
				false,
			);
		});
	});

	describe("selectOnFocus", () => {
		test("Selects text on focus when enabled", async () => {
			const field = UI.TextField().value("select me").selectOnFocus().build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			input.focus();
			input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

			expect(input.selectionStart).toBe(0);
			expect(input.selectionEnd).toBe(input.value.length);
		});

		test("Does not auto-select when disabled", async () => {
			const field = UI.TextField().value("no select").build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			input.selectionStart = 3;
			input.selectionEnd = 3;

			input.focus();
			input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

			expect(input.selectionStart).toBe(3);
			expect(input.selectionEnd).toBe(3);
		});
	});

	describe("Trim", () => {
		test("Trims whitespace from value", async () => {
			const field = UI.TextField().trim().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			simulateInput(input, "  trimmed  ");

			expect(field.value).toBe("trimmed");
		});

		test("Trims on focusout", async () => {
			const field = UI.TextField().trim().build() as UITextField;
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			input.value = "  whitespace  ";
			input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

			expect(input.value).toBe("whitespace");
		});

		test("Does not trim when disabled", async () => {
			const field = UI.TextField().build() as UITextField;
			await renderView(field);

			simulateInput(document.querySelector("input"), "  not trimmed  ");
			expect(field.value).toBe("  not trimmed  ");
		});
	});

	describe("Style", () => {
		test("Width and padding styles apply", async () => {
			const field = UI.TextField().width(200).padding(8).build();
			await renderView(field);

			const input = document.querySelector("input") as HTMLInputElement;
			expect(input.style.width).toBe("12.5rem"); // 200/16
			expect(input.style.padding).toContain("0.5rem");
		});
	});
});
