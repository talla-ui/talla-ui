import { app, UI, UIIconResource } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

describe("UITextRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Renders text in span element", async () => {
			const text = UI.Text("Hello World").build();
			await renderView(text);

			const el = document.querySelector("span");
			expect(el).not.toBeNull();
			expect(el?.textContent).toBe("Hello World");
		});

		test("Empty text renders empty span", async () => {
			const text = UI.Text().build();
			await renderView(text);

			const el = document.querySelector("span");
			expect(el).not.toBeNull();
			expect(el?.textContent).toBe("");
		});

		test("Special characters are escaped", async () => {
			const text = UI.Text("Test <>&\"'").build();
			await renderView(text);
			expect(document.querySelector("span")?.textContent).toBe("Test <>&\"'");
		});
	});

	describe("Text with icon", () => {
		test("Creates icon element with text", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const text = UI.Text("With Icon").icon(icon).build();
			await renderView(text);

			const el = document.querySelector("span");
			expect(el?.querySelector("icon")).not.toBeNull();

			const textSpans = el?.querySelectorAll(":scope > span");
			const textSpan = Array.from(textSpans || []).find(
				(span) => span.textContent === "With Icon",
			);
			expect(textSpan).toBeDefined();
		});

		test("Icon without text renders only icon", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const text = UI.Text().icon(icon).build();
			await renderView(text);

			expect(document.querySelector("span icon")).not.toBeNull();
		});

		test("Custom icon size applies width", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const text = UI.Text("Text").icon(icon, { size: 32 }).build();
			await renderView(text);

			const iconEl = document.querySelector("icon") as HTMLElement;
			expect(iconEl.style.width).toBe("2rem"); // 32/16
		});

		test("Margin on icon element between icon and text", async () => {
			const icon = new UIIconResource('<svg viewBox="0 0 24 24"></svg>');
			const text = UI.Text("With Margin").icon(icon, { margin: 16 }).build();
			await renderView(text);

			const iconEl = document.querySelector("icon") as HTMLElement;
			expect(iconEl.style.marginInlineEnd).toBe("1rem"); // 16/16
		});
	});

	describe("Heading levels", () => {
		test.each([1, 2, 3, 4, 5, 6] as const)(
			"headingLevel %i renders as h%i",
			async (level) => {
				const text = UI.Text(`Heading ${level}`).headingLevel(level).build();
				await renderView(text);
				expect(document.querySelector(`h${level}`)).not.toBeNull();
			},
		);

		test("No heading level renders as span", async () => {
			const text = UI.Text("Regular").build();
			await renderView(text);

			expect(document.querySelector("span")).not.toBeNull();
			expect(document.querySelector("h1")).toBeNull();
		});
	});

	describe("Accessibility", () => {
		test("accessibleRole sets role attribute", async () => {
			const text = UI.Text("Click me").accessibleRole("button").build();
			await renderView(text);
			expect(document.querySelector("span")?.getAttribute("role")).toBe(
				"button",
			);
		});

		test("accessibleLabel sets aria-label", async () => {
			const text = UI.Text("Icon").accessibleLabel("Close button").build();
			await renderView(text);
			expect(document.querySelector("span")?.getAttribute("aria-label")).toBe(
				"Close button",
			);
		});
	});

	describe("HTML format", () => {
		test("html() renders via innerHTML", async () => {
			const text = UI.Text().html("<strong>Bold</strong> text").build();
			await renderView(text);

			const el = document.querySelector("span");
			expect(el?.innerHTML).toBe("<strong>Bold</strong> text");
			expect(el?.querySelector("strong")).not.toBeNull();
		});

		test("Plain text escapes HTML", async () => {
			const text = UI.Text("<strong>Not Bold</strong>").build();
			await renderView(text);

			const el = document.querySelector("span");
			expect(el?.textContent).toBe("<strong>Not Bold</strong>");
			expect(el?.querySelector("strong")).toBeNull();
		});
	});

	describe("Selectable", () => {
		test("selectable sets user-select style", async () => {
			const text = UI.Text("Selectable").selectable(true).build();
			await renderView(text);

			const el = document.querySelector("span") as HTMLElement;
			const userSelect =
				el.style.userSelect || (el.style as any).webkitUserSelect;
			expect(userSelect).not.toBe("none");
		});
	});

	describe("Focus", () => {
		test("allowKeyboardFocus sets tabIndex=0", async () => {
			const text = UI.Text("Focusable").allowKeyboardFocus(true).build();
			await renderView(text);
			expect((document.querySelector("span") as HTMLElement).tabIndex).toBe(0);
		});

		test("allowFocus sets tabIndex=-1", async () => {
			const text = UI.Text("Focusable").allowFocus(true).build();
			await renderView(text);
			expect((document.querySelector("span") as HTMLElement).tabIndex).toBe(-1);
		});

		test("Neither focus property leaves tabIndex unset", async () => {
			const text = UI.Text("Not Focusable").build();
			await renderView(text);
			expect(document.querySelector("span")?.hasAttribute("tabindex")).toBe(
				false,
			);
		});
	});

	describe("Content updates", () => {
		test("Text updates when property changes", async () => {
			const text = UI.Text("Initial").build();
			await renderView(text);

			expect(document.querySelector("span")?.textContent).toBe("Initial");

			text.text = "Updated";
			await waitForRender();
			expect(document.querySelector("span")?.textContent).toBe("Updated");

			text.text = "";
			await waitForRender();
			expect(document.querySelector("span")?.textContent).toBe("");
		});

		test("Icon updates when property changes", async () => {
			const icon1 = new UIIconResource(
				'<svg id="icon1" viewBox="0 0 24 24"></svg>',
			);
			const icon2 = new UIIconResource(
				'<svg id="icon2" viewBox="0 0 24 24"></svg>',
			);
			const text = UI.Text("Text").icon(icon1).build();
			await renderView(text);

			expect(document.querySelector("svg")?.id).toBe("icon1");

			text.icon = icon2;
			await waitForRender();
			expect(document.querySelector("svg")?.id).toBe("icon2");
		});
	});

	describe("Style", () => {
		test("Style properties apply inline styles", async () => {
			const text = UI.Text("Styled")
				.bold()
				.italic()
				.fontSize(24)
				.textColor(UI.colors.accent)
				.build();
			await renderView(text);

			const el = document.querySelector("span") as HTMLElement;
			expect(el.style.fontWeight).toBe("bold");
			expect(el.style.fontStyle).toBe("italic");
			expect(el.style.fontSize).toBe("1.5rem"); // 24/16
			expect(el.style.color).toMatch(/^rgb/);
		});
	});
});
