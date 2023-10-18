import {
	app,
	UIButton,
	UICell,
	ViewComposite,
	ViewEvent,
} from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("Focus management", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Single element, initial focus", async (t) => {
		let MyCell = UICell.with({ requestFocus: true, allowFocus: true });
		let cell = new MyCell();
		app.render(cell);
		let elt = (await t.expectOutputAsync(100, { type: "cell" })).getSingle();
		expect(elt.hasFocus()).toBeTruthy();
	});

	test("Single element, request focus", async (t) => {
		let MyCell = UICell.with({ allowFocus: true });
		let cell = new MyCell();
		app.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
		cell.requestFocus();
		await t.expectOutputAsync(100, { type: "cell", focused: true });
	});

	test("Single view composite, request focus", async (t) => {
		const Preset = UICell.with({ allowFocus: true });
		class MyView extends ViewComposite {
			protected override createView() {
				return new Preset();
			}
		}
		let view = new MyView();
		app.render(view);
		await t.expectOutputAsync(100, { type: "cell" });
		view.requestFocus();
		await t.expectOutputAsync(100, { type: "cell", focused: true });
	});

	test("Focus requests", async (t) => {
		let MyCell = UICell.with(
			UIButton.withLabel("first").with({ requestFocus: true }),
			UIButton.withLabel("second"),
		);

		t.log("Focusing first");
		app.render(new MyCell());
		let out = await t.expectOutputAsync(100, { text: "first", focused: true });

		t.log("Focusing next");
		out.getSingleView(UIButton).requestFocusNext();
		out = await t.expectOutputAsync(100, { text: "second", focused: true });

		t.log("Focusing previous");
		out.getSingleView(UIButton).requestFocusPrevious();
		out = await t.expectOutputAsync(100, { text: "first", focused: true });
	});

	test("Focusing one element blurs another", async (t) => {
		let events: string[] = [];
		let done = false;
		const Preset = UICell.with(
			UICell.with({
				onBeforeRender: "Cell1Ref",
				onFocusIn: "+Cell1Focus",
				onFocusOut: "+Cell1Focus",
				allowFocus: true,
			}),
			UICell.with({
				onBeforeRender: "Cell2Ref",
				onFocusIn: "+Done",
				allowFocus: true,
			}),
		);
		class MyView extends ViewComposite {
			protected override createView() {
				return new Preset();
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
		app.render(new MyView());
		await t.pollAsync(() => done, 5);
		expect(events).toBeArray(["FocusIn", "FocusOut"]);
	});
});
