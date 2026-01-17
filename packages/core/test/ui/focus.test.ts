import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIButton, UICell, ViewEvent, Widget } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Single element, initial focus", async () => {
	let myCell = UI.Cell().allowFocus().requestFocus();
	let cell = myCell.build();
	renderTestView(cell);
	let elt = (await expectOutputAsync({ type: "cell" })).getSingle();
	expect(elt.hasFocus()).toBeTruthy();
});

test("Single element, request focus", async () => {
	let myCell = UI.Cell().allowFocus();
	let cell = myCell.build();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Single widget, request focus", async () => {
	class MyWidget extends Widget {
		protected override get body() {
			return UI.Cell().allowFocus().build();
		}
	}
	let view = new MyWidget();
	renderTestView(view);
	await expectOutputAsync({ type: "cell" });
	view.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Focus requests", async () => {
	let myCell = UI.Cell(UI.Button("first").requestFocus(), UI.Button("second"));

	console.log("Focusing first");
	renderTestView(myCell.build());
	let out = await expectOutputAsync({ text: "first", focused: true });

	console.log("Focusing next");
	out.getSingleView(UIButton).requestFocusNext();
	out = await expectOutputAsync({ text: "second", focused: true });

	console.log("Focusing previous");
	out.getSingleView(UIButton).requestFocusPrevious();
	out = await expectOutputAsync({ text: "first", focused: true });
});

test("Focusing one element blurs another", async () => {
	let events: string[] = [];
	let done = false;
	class FocusTestWidget extends Widget {
		cell2?: UICell;

		protected override get body() {
			return UI.Cell(
				UI.Cell()
					.allowFocus()
					.onBeforeRender("Cell1Ref")
					.onFocusIn("Cell1Focus")
					.onFocusOut("Cell1Focus"),
				UI.Cell().allowFocus().onBeforeRender("Cell2Ref").onFocusIn("Done"),
			).build();
		}

		onCell1Ref(e: ViewEvent<UICell>) {
			e.source.requestFocus();
		}
		onCell1Focus(e: ViewEvent) {
			events.push(e.inner ? e.inner.name : "NO_INNER");
			if (!this.cell2) expect.fail("Cell 2 not set");
			else this.cell2.requestFocus();
		}
		onCell2Ref(e: ViewEvent<UICell>) {
			this.cell2 = e.source;
		}
		onDone() {
			done = true;
		}
	}
	renderTestView(new FocusTestWidget());
	await expect.poll(() => done).toBeTruthy();
	expect(events).toEqual(["FocusIn", "FocusOut"]);
});

test("isFocused() returns false when not rendered", () => {
	let cell = UI.Cell().allowFocus().build();
	expect(cell.isFocused()).toBe(false);
});

test("isFocused() returns true after requestFocus()", async () => {
	let cell = UI.Cell().allowFocus().build();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
	expect(cell.isFocused()).toBe(true);
});

test("isFocused() returns false after focus moves elsewhere", async () => {
	let cell1 = UI.Cell().allowFocus().build();
	let cell2 = UI.Cell().allowFocus().build();
	let container = new UICell();
	container.content.add(cell1, cell2);
	renderTestView(container);

	// Focus first cell
	cell1.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
	expect(cell1.isFocused()).toBe(true);

	// Focus second cell, first should lose focus
	cell2.requestFocus();
	await expect.poll(() => cell2.isFocused()).toBe(true);
	expect(cell1.isFocused()).toBe(false);
});
