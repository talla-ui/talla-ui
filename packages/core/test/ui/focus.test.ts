import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIButton, UIColumn, ViewEvent, Widget } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Single element, initial focus", async () => {
	let myColumn = UI.Column().allowFocus().requestFocus();
	let column = myColumn.build();
	renderTestView(column);
	let elt = (await expectOutputAsync({ type: "column" })).getSingle();
	expect(elt.hasFocus()).toBeTruthy();
});

test("Single element, request focus", async () => {
	let myColumn = UI.Column().allowFocus();
	let column = myColumn.build();
	renderTestView(column);
	await expectOutputAsync({ type: "column" });
	column.requestFocus();
	await expectOutputAsync({ type: "column", focused: true });
});

test("Single widget, request focus", async () => {
	class MyWidget extends Widget {
		protected override get body() {
			return UI.Column().allowFocus().build();
		}
	}
	let view = new MyWidget();
	renderTestView(view);
	await expectOutputAsync({ type: "column" });
	view.requestFocus();
	await expectOutputAsync({ type: "column", focused: true });
});

test("Focus requests", async () => {
	let myColumn = UI.Column(
		UI.Button("first").requestFocus(),
		UI.Button("second"),
	);

	console.log("Focusing first");
	renderTestView(myColumn.build());
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
		column2?: UIColumn;

		protected override get body() {
			return UI.Column(
				UI.Column()
					.allowFocus()
					.onBeforeRender("Column1Ref")
					.onFocusIn("Column1Focus")
					.onFocusOut("Column1Focus"),
				UI.Column().allowFocus().onBeforeRender("Column2Ref").onFocusIn("Done"),
			).build();
		}

		onColumn1Ref(e: ViewEvent<UIColumn>) {
			e.source.requestFocus();
		}
		onColumn1Focus(e: ViewEvent) {
			events.push(e.inner ? e.inner.name : "NO_INNER");
			if (!this.column2) expect.fail("Column 2 not set");
			else this.column2.requestFocus();
		}
		onColumn2Ref(e: ViewEvent<UIColumn>) {
			this.column2 = e.source;
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
	let column = UI.Column().allowFocus().build();
	expect(column.isFocused()).toBe(false);
});

test("isFocused() returns true after requestFocus()", async () => {
	let column = UI.Column().allowFocus().build();
	renderTestView(column);
	await expectOutputAsync({ type: "column" });
	column.requestFocus();
	await expectOutputAsync({ type: "column", focused: true });
	expect(column.isFocused()).toBe(true);
});

test("isFocused() returns false after focus moves elsewhere", async () => {
	let column1 = UI.Column().allowFocus().build();
	let column2 = UI.Column().allowFocus().build();
	let container = new UIColumn();
	container.content.add(column1, column2);
	renderTestView(container);

	// Wait for columns to render before requesting focus
	await expectOutputAsync({ type: "column" });

	// Focus first column
	column1.requestFocus();
	await expectOutputAsync({ type: "column", focused: true });
	expect(column1.isFocused()).toBe(true);

	// Focus second column, first should lose focus
	column2.requestFocus();
	await expect.poll(() => column2.isFocused()).toBe(true);
	expect(column1.isFocused()).toBe(false);
});
