import { app, ObservableList, ObservableObject, UI } from "@talla-ui/core";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { renderView, setupWebContext, waitForRender } from "../helpers.js";

class ListItem extends ObservableObject {
	constructor(public name: string) {
		super();
	}
}

describe("UIContainerRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	describe("Basic rendering", () => {
		test("Column renders children in order", async () => {
			const column = UI.Column(
				UI.Text("First"),
				UI.Text("Second"),
				UI.Text("Third"),
			).build();
			await renderView(column);

			const spans = document.querySelectorAll("span");
			expect(spans.length).toBe(3);
			expect(spans[0]?.textContent).toBe("First");
			expect(spans[1]?.textContent).toBe("Second");
			expect(spans[2]?.textContent).toBe("Third");
		});

		test("Row renders children", async () => {
			const row = UI.Row(UI.Text("A"), UI.Text("B")).build();
			await renderView(row);

			const spans = document.querySelectorAll("span");
			expect(spans.length).toBe(2);
			expect(spans[0]?.textContent).toBe("A");
			expect(spans[1]?.textContent).toBe("B");
		});

		test("Nested containers render correctly", async () => {
			const column = UI.Column(
				UI.Text("Outer"),
				UI.Row(UI.Text("Inner A"), UI.Text("Inner B")),
			).build();
			await renderView(column);

			const spans = document.querySelectorAll("span");
			expect(spans.length).toBe(3);
			expect(spans[0]?.textContent).toBe("Outer");
		});

		test("Empty container renders", async () => {
			const column = UI.Column().build();
			await renderView(column);

			expect(document.querySelector("container")).not.toBeNull();
		});

		test.each([
			["Row", UI.Row(UI.Text("A"), UI.Text("B")).reverse()],
			["Column", UI.Column(UI.Text("First"), UI.Text("Second")).reverse()],
		])("%s with reverse renders children reversed", async (_name, builder) => {
			await renderView(builder.build());

			const spans = document.querySelectorAll("span");
			expect(spans[0]?.textContent).toMatch(/^(B|Second)$/);
			expect(spans[1]?.textContent).toMatch(/^(A|First)$/);
		});
	});

	describe("Accessibility", () => {
		test("accessibleLabel sets aria-label", async () => {
			const col = UI.Column().accessibleLabel("Main content area").build();
			await renderView(col);

			expect(
				document.querySelector("container")?.getAttribute("aria-label"),
			).toBe("Main content area");
		});
	});

	describe("Form rendering", () => {
		test("Form role creates form element", async () => {
			const column = UI.Column(UI.TextField(), UI.Button("Submit"))
				.accessibleRole("form")
				.build();
			await renderView(column);

			expect(document.querySelector("form")).not.toBeNull();
		});

		test("Form emits Submit event", async () => {
			let submitted = false;
			const column = UI.Column(UI.Button("Submit"))
				.accessibleRole("form")
				.build();
			column.listen((e) => {
				if (e.name === "Submit") submitted = true;
			});
			await renderView(column);

			const form = document.querySelector("form") as HTMLFormElement;
			form.dispatchEvent(new Event("submit", { bubbles: true }));
			expect(submitted).toBe(true);
		});
	});

	describe("Dynamic list updates", () => {
		test("Adding and removing items updates DOM", async () => {
			const list = new ObservableList<ListItem>();
			const view = UI.List(list, (item) => UI.Text(item.bind("name"))).build();
			await renderView(view);

			expect(document.querySelectorAll("span").length).toBe(0);

			list.add(new ListItem("First"));
			await waitForRender();
			expect(document.querySelectorAll("span").length).toBe(1);
			expect(document.querySelector("span")?.textContent).toBe("First");

			const second = new ListItem("Second");
			list.add(second);
			await waitForRender();
			expect(document.querySelectorAll("span").length).toBe(2);

			list.remove(second);
			await waitForRender();
			expect(document.querySelectorAll("span").length).toBe(1);

			list.clear();
			await waitForRender();
			expect(document.querySelectorAll("span").length).toBe(0);
		});
	});
});

describe("UIContainerRenderer focus/hover", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	test("Column renders children", async () => {
		const column = UI.Column(UI.Text("Column content")).build();
		await renderView(column);

		expect(document.querySelector("span")?.textContent).toBe("Column content");
	});

	test("allowKeyboardFocus sets tabIndex=0", async () => {
		const column = UI.Column(UI.Text("Focusable")).allowKeyboardFocus().build();
		await renderView(column);

		expect((document.querySelector("container") as HTMLElement).tabIndex).toBe(
			0,
		);
	});

	test("MouseEnter and MouseLeave events", async () => {
		let entered = false;
		let left = false;
		const column = UI.Column(UI.Text("Hover me")).trackHover().build();
		column.listen((e) => {
			if (e.name === "MouseEnter") entered = true;
			if (e.name === "MouseLeave") left = true;
		});
		await renderView(column);

		const container = document.querySelector("container") as HTMLElement;
		container.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
		expect(entered).toBe(true);

		container.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
		expect(left).toBe(true);
	});

	test("tabIndex changes when child receives/loses focus", async () => {
		const column = UI.Column(UI.Button("Focusable"))
			.allowKeyboardFocus()
			.build();
		await renderView(column);

		const container = document.querySelector("container") as HTMLElement;
		const button = document.querySelector("button") as HTMLElement;

		expect(container.tabIndex).toBe(0);

		button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		expect(container.tabIndex).toBe(-1);

		button.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
		expect(container.tabIndex).toBe(0);
	});
});

describe("UIScrollViewRenderer", () => {
	beforeEach(() => setupWebContext());
	afterEach(() => app.clear());

	test("Renders with overflow auto", async () => {
		const scrollView = UI.Column(UI.Text("Content")).scroll().build();
		await renderView(scrollView);

		const containers = document.querySelectorAll("container");
		const scrollContainer = Array.from(containers).find(
			(c) => (c as HTMLElement).style.overflowY === "auto",
		);
		expect(scrollContainer).not.toBeUndefined();
	});

	test("Emits Scroll event", async () => {
		let scrolled = false;
		const scrollView = UI.Column(UI.Text("Content"))
			.scroll()
			.onScroll(() => {
				scrolled = true;
			})
			.build();
		await renderView(scrollView);

		const containers = document.querySelectorAll("container");
		const scrollContainer = Array.from(containers).find(
			(c) => (c as HTMLElement).style.overflowY === "auto",
		);

		scrollContainer?.dispatchEvent(new Event("scroll"));
		await waitForRender();
		expect(scrolled).toBe(true);
	});
});
