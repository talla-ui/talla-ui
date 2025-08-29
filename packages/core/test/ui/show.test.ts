import {
	expectOutputAsync,
	renderTestView,
	TestRenderer,
	useTestContext,
} from "@talla-ui/test-handler";
import { StringConvertible } from "@talla-ui/util";
import { beforeEach, expect, test } from "vitest";
import {
	Activity,
	app,
	bind,
	CustomView,
	CustomViewBuilder,
	ObservableObject,
	UI,
	UICell,
	UIColumn,
	UILabel,
	UIRow,
	UIShowView,
	UITextField,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Set state directly with when", () => {
	let myShow = UI.Show(UI.Cell());
	let show = myShow.create();
	expect(show.body).toBeInstanceOf(UICell);
	expect(ObservableObject.whence(show.body)).toBe(show);
	show.when = false;
	expect(show.body).toBeUndefined();
});

test("Set state directly with unless", () => {
	let myShow = UI.ShowUnless(true, UI.Cell());
	let show = myShow.create();
	expect(show.body).toBeUndefined();

	show.unless = false;
	expect(show.body).toBeInstanceOf(UICell);
	expect(ObservableObject.whence(show.body)).toBe(show);

	show.unless = true;
	expect(show.body).toBeUndefined();
});

test("When both when and unless are set, unless takes precedence", () => {
	let myShow = UI.Show(UI.Cell()).when(true).unless(true);
	let show = myShow.create();
	expect(show.body).toBeUndefined();

	show.when = false;
	expect(show.body).toBeUndefined();

	show.unless = false;
	expect(show.body).toBeUndefined();

	show.when = true;
	expect(show.body).toBeInstanceOf(UICell);
});

test("When and else", () => {
	let myShow = UI.ShowWhen(true, UI.Column(), UI.Row());
	let show = myShow.create();
	expect(show.body).toBeInstanceOf(UIColumn);
	show.when = false;
	expect(show.body).toBeInstanceOf(UIRow);
	show.when = true;
	expect(show.body).toBeInstanceOf(UIColumn);
});

test("Unless and else", () => {
	let myShow = UI.ShowUnless(false, UI.Column(), UI.Row());
	let show = myShow.create();
	expect(show.body).toBeInstanceOf(UIColumn);
	show.unless = true;
	expect(show.body).toBeInstanceOf(UIRow);
	show.unless = false;
	expect(show.body).toBeInstanceOf(UIColumn);
});

test("Body view events are propagated", async () => {
	let myCell = UI.Cell(UI.Show(UI.Button("Click me").emit("ButtonClick")));

	// create instance and listen for events on cell
	let count = 0;
	let cell = myCell.create();
	cell.listen((e) => {
		if (e.name === "ButtonClick") count++;
	});
	renderTestView(cell);
	let expectButton = await expectOutputAsync({ type: "button" });

	console.log("Clicking button");
	expectButton.getSingle().click();
	expect(count).toBe(1);
});

test("Rendering content using bound state", async () => {
	// Create a simple object with observable state
	function TestView() {
		class TestView extends CustomView {
			condition = false;
		}
		return CustomViewBuilder(TestView, () =>
			UI.Cell(UI.ShowWhen(bind("condition"), UI.Label("foo"))),
		);
	}

	console.log("Creating view");
	useTestContext();
	let testView = TestView().create();

	console.log("Rendering view");
	renderTestView(testView);

	// after rendering, there should be a cell but no label
	console.log("Checking for cell but no label");
	let expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();

	// when condition becomes true, label should be rendered
	console.log("Setting state to true");
	testView.condition = true;
	await expectOutputAsync({ text: "foo" });

	// when condition becomes false, label should be removed
	console.log("Setting state to false");
	testView.condition = false;
	expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();
});

test("Set inserted view and render", async () => {
	let myCell = UI.Cell(UI.Label("foo"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	expect(viewRenderer.findViewContent(UILabel)).toHaveLength(1);
});

test("Change inserted view after rendering", async () => {
	let myCell1 = UI.Cell(UI.Label("foo"));
	let myCell2 = UI.Cell(UI.Label("bar"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell1.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.insert = myCell2.create();
	await expectOutputAsync({ text: "bar" });
});

test("Unlink inserted view after rendering", async () => {
	let myCell = UI.Cell(UI.Label("foo"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.insert!.unlink();
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect((app.renderer as TestRenderer).hasOutput()).toBeFalsy();
});

test("Rendering self as inserted view fails silently", async () => {
	let viewRenderer = new UIShowView();
	viewRenderer.insert = viewRenderer;
	renderTestView(viewRenderer);
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect((app.renderer as TestRenderer).hasOutput()).toBeFalsy();
});

test("Rendering parent as inserted view fails silently", async () => {
	let parent = UI.Cell(UI.Label("foo")).create();
	let viewRenderer = new UIShowView();
	parent.content.add(viewRenderer);
	viewRenderer.insert = parent;
	renderTestView(parent);
	await expectOutputAsync({ text: "foo" }); // label rendered, no errors
});

test("Set inserted view using custom view, and render", async () => {
	// Create a custom view builder function
	function MyContent() {
		class MyContentView extends CustomView {
			text = StringConvertible.EMPTY;
		}
		return {
			...CustomViewBuilder(MyContentView, () => UI.Label(bind("text"))),
			text(text: StringConvertible) {
				this.initializer.set("text", text);
				return this;
			},
		};
	}

	class MyActivity extends Activity {
		protected override createView() {
			return UI.Show(bind("vc")).create();
		}
		vc = this.attach(MyContent().text("foo").create());
	}

	let activity = new MyActivity();
	app.addActivity(activity, true);
	await expectOutputAsync({ text: "foo" });
});

test("Set inserted view and focus", async () => {
	let viewRenderer = new UIShowView();
	viewRenderer.insert = new UITextField();
	renderTestView(viewRenderer);
	await expectOutputAsync({ type: "textfield", focused: false });
	viewRenderer.insert!.requestFocus();
	await expectOutputAsync({ type: "textfield", focused: true });
});

test("Use activity view as inserted view and render", async () => {
	let countSecond = 0;
	let countOuter = 0;

	// activity that will be rendered as nested view
	class MySecondActivity extends Activity {
		protected override createView() {
			this.setRenderMode("none");
			return UI.Cell(UI.Button("foo").emit("ButtonPress")).create();
		}
		onButtonPress() {
			countSecond++;
		}
	}

	// containing activity
	class MyActivity extends Activity {
		protected override createView() {
			return UI.Cell()
				.accessibleLabel("outer")
				.with(UI.Show(bind("second.view"), true))
				.create();
		}
		readonly second = this.attach(new MySecondActivity());
		onButtonPress() {
			countOuter++;
		}
	}
	console.log("Adding activity...");
	let activity = new MyActivity();
	app.addActivity(activity, true);

	// view should only show up when `second` is activated
	console.log("Testing without `second`...");
	let out = await expectOutputAsync({
		type: "cell",
		accessibleLabel: "outer",
	});
	out.containing({ text: "foo" }).toBeEmpty();
	console.log("Activating `second`...");
	await activity.second!.activateAsync();
	out = await expectOutputAsync({ accessibleLabel: "outer" }, { text: "foo" });

	// clicking the button should propagate all events
	console.log("Clicking button...");
	out.getSingle().click();
	expect(countSecond).toBe(1);
	expect(countOuter).toBe(1);

	// destroying the second activity should clear the view
	console.log("Destroying `second`...");
	activity.second!.unlink();
	expect(activity.second).toHaveProperty("view", undefined);
	out = await expectOutputAsync({
		type: "cell",
		accessibleLabel: "outer",
	});
	out.containing({ text: "foo" }).toBeEmpty();
});

// NOTE: animations are not tested here because the test renderer does not support them
