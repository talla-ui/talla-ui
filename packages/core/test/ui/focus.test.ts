import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	UIButton,
	UICell,
	ViewComposite,
	ViewEvent,
	ui,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Single element, initial focus", async () => {
	let myCell = ui.cell({ requestFocus: true, allowFocus: true });
	let cell = myCell.create();
	renderTestView(cell);
	let elt = (await expectOutputAsync({ type: "cell" })).getSingle();
	expect(elt.hasFocus()).toBeTruthy();
});

test("Single element, request focus", async () => {
	let myCell = ui.cell({ allowFocus: true });
	let cell = myCell.create();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Single view composite, request focus", async () => {
	const MyView = ViewComposite.define({}, ui.cell({ allowFocus: true }));
	let view = new MyView();
	renderTestView(view);
	await expectOutputAsync({ type: "cell" });
	view.requestFocus();
	await expectOutputAsync({ type: "cell", focused: true });
});

test("Focus requests", async () => {
	let myCell = ui.cell(
		ui.button("first", { requestFocus: true }),
		ui.button("second"),
	);

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
			if (!this.cell2) expect.fail("Cell 2 not set");
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
	renderTestView(new MyView());
	await expect.poll(() => done).toBeTruthy();
	expect(events).toEqual(["FocusIn", "FocusOut"]);
});
