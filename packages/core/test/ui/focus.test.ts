import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	ComponentView,
	UI,
	UIButton,
	UICell,
	ViewEvent,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Single element, initial focus", async () => {
	let myCell = UI.Cell().allowFocus().requestFocus();
	let cell = myCell.create();
	renderTestView(cell);
	let elt = (await expectOutputAsync({ type: "cell" })).getSingle();
	expect(elt.hasFocus()).toBeTruthy();
});

test("Single element, request focus", async () => {
	let myCell = UI.Cell().allowFocus();
	let cell = myCell.create();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Single component view, request focus", async () => {
	class MyView extends ComponentView {
		protected override viewBuilder() {
			return UI.Cell().allowFocus();
		}
	}
	let view = new MyView();
	renderTestView(view);
	await expectOutputAsync({ type: "cell" });
	view.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Focus requests", async () => {
	let myCell = UI.Cell(UI.Button("first").requestFocus(), UI.Button("second"));

	console.log("Focusing first");
	renderTestView(myCell.create());
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
	class MyView extends ComponentView {
		cell2?: UICell;

		protected override viewBuilder() {
			return UI.Cell(
				UI.Cell()
					.allowFocus()
					.intercept("BeforeRender", "Cell1Ref")
					.intercept("FocusIn", "Cell1Focus")
					.intercept("FocusOut", "Cell1Focus"),
				UI.Cell()
					.allowFocus()
					.intercept("BeforeRender", "Cell2Ref")
					.intercept("FocusIn", "Done"),
			);
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
	renderTestView(new MyView());
	await expect.poll(() => done).toBeTruthy();
	expect(events).toEqual(["FocusIn", "FocusOut"]);
});
