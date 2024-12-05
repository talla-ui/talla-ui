import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";
import {
	UIButton,
	UICell,
	ViewComposite,
	ViewEvent,
	ui,
} from "../../../dist/index.js";

describe("Focus management", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
	});

	test("Single element, initial focus", async (t) => {
		let myCell = ui.cell({ requestFocus: true, allowFocus: true });
		let cell = myCell.create();
		t.render(cell);
		let elt = (await t.expectOutputAsync({ type: "cell" })).getSingle();
		expect(elt.hasFocus()).toBeTruthy();
	});

	test("Single element, request focus", async (t) => {
		let myCell = ui.cell({ allowFocus: true });
		let cell = myCell.create();
		t.render(cell);
		await t.expectOutputAsync({ type: "cell" });
		cell.requestFocus();
		await t.expectOutputAsync({ type: "cell", focused: true });
	});

	test("Single view composite, request focus", async (t) => {
		const MyView = ViewComposite.define({}, ui.cell({ allowFocus: true }));
		let view = new MyView();
		t.render(view);
		await t.expectOutputAsync({ type: "cell" });
		view.requestFocus();
		await t.expectOutputAsync({ type: "cell", focused: true });
	});

	test("Focus requests", async (t) => {
		let myCell = ui.cell(
			ui.button("first", { requestFocus: true }),
			ui.button("second"),
		);

		t.log("Focusing first");
		t.render(myCell.create());
		let out = await t.expectOutputAsync({ text: "first", focused: true });

		t.log("Focusing next");
		out.getSingleView(UIButton).requestFocusNext();
		out = await t.expectOutputAsync({ text: "second", focused: true });

		t.log("Focusing previous");
		out.getSingleView(UIButton).requestFocusPrevious();
		out = await t.expectOutputAsync({ text: "first", focused: true });
	});

	test("Focusing one element blurs another", async (t) => {
		let events: string[] = [];
		let done = false;
		class MyView extends ViewComposite {
			protected override defineView() {
				return ui.cell(
					ui.cell({
						onBeforeRender: "Cell1Ref",
						onFocusIn: "+Cell1Focus",
						onFocusOut: "+Cell1Focus",
						allowFocus: true,
					}),
					ui.cell({
						onBeforeRender: "Cell2Ref",
						onFocusIn: "+Done",
						allowFocus: true,
					}),
				);
			}
			onCell1Ref(e: ViewEvent<UICell>) {
				e.source.requestFocus();
			}
			onCell1Focus(e: ViewEvent) {
				events.push(e.inner ? e.inner.name : "NO_INNER");
				if (!this.cell2) t.fail("Cell 2 not set");
				else this.cell2.requestFocus();
			}
			onCell2Ref(e: ViewEvent<UICell>) {
				this.cell2 = e.source;
			}
			cell2?: UICell;
			onDone() {
				done = true;
			}
		}
		t.render(new MyView());
		await t.pollAsync(() => done, 5);
		expect(events).toBeArray(["FocusIn", "FocusOut"]);
	});
});
