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
	Binding,
	ObservableObject,
	UI,
	UICell,
	UIColumn,
	UIRow,
	UIShowView,
	UIText,
	UITextField,
	Widget,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Set state directly with when", () => {
	let myShow = UI.Show(UI.Cell());
	let show = myShow.build();
	expect(show.body).toBeInstanceOf(UICell);
	expect(ObservableObject.whence(show.body)).toBe(show);
	show.when = false;
	expect(show.body).toBeUndefined();
});

test("Set state directly with unless", () => {
	let myShow = UI.ShowUnless(true, UI.Cell());
	let show = myShow.build();
	expect(show.body).toBeUndefined();

	show.unless = false;
	expect(show.body).toBeInstanceOf(UICell);
	expect(ObservableObject.whence(show.body)).toBe(show);

	show.unless = true;
	expect(show.body).toBeUndefined();
});

test("When both when and unless are set, unless takes precedence", () => {
	let myShow = UI.Show(UI.Cell()).when(true).unless(true);
	let show = myShow.build();
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
	let show = myShow.build();
	expect(show.body).toBeInstanceOf(UIColumn);
	show.when = false;
	expect(show.body).toBeInstanceOf(UIRow);
	show.when = true;
	expect(show.body).toBeInstanceOf(UIColumn);
});

test("Unless and else", () => {
	let myShow = UI.ShowUnless(false, UI.Column(), UI.Row());
	let show = myShow.build();
	expect(show.body).toBeInstanceOf(UIColumn);
	show.unless = true;
	expect(show.body).toBeInstanceOf(UIRow);
	show.unless = false;
	expect(show.body).toBeInstanceOf(UIColumn);
});

test("Body view events are propagated", async () => {
	let myCell = UI.Cell(UI.Show(UI.Button("Click me").onClick("ButtonClick")));

	// create instance and listen for events on cell
	let count = 0;
	let cell = myCell.build();
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
	const TestView = () =>
		class extends Widget {
			condition = false;
		}.builder((v) => {
			return UI.Cell(UI.ShowWhen(v.bind("condition"), UI.Text("foo")));
		});

	console.log("Creating view");
	useTestContext();
	let testView = TestView().build();

	console.log("Rendering view");
	renderTestView(testView);

	// after rendering, there should be a cell but no text
	console.log("Checking for cell but no text");
	let expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();

	// when condition becomes true, text should be rendered
	console.log("Setting state to true");
	testView.condition = true;
	await expectOutputAsync({ text: "foo" });

	// when condition becomes false, text should be removed
	console.log("Setting state to false");
	testView.condition = false;
	expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();
});

test("Build view using function and render", async () => {
	let viewRenderer = UI.ShowWhen(true, () => UI.Cell(UI.Text("foo"))).build();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	expect(viewRenderer.findViewContent(UIText)).toHaveLength(1);
});

test("Set inserted view and render", async () => {
	let myCell = UI.Cell(UI.Text("foo"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell.build();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	expect(viewRenderer.findViewContent(UIText)).toHaveLength(1);
});

test("Change inserted view after rendering", async () => {
	let myCell1 = UI.Cell(UI.Text("foo"));
	let myCell2 = UI.Cell(UI.Text("bar"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell1.build();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.insert = myCell2.build();
	await expectOutputAsync({ text: "bar" });
});

test("Unlink inserted view after rendering", async () => {
	let myCell = UI.Cell(UI.Text("foo"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell.build();
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
	let parent = UI.Cell(UI.Text("foo")).build();
	let viewRenderer = new UIShowView();
	parent.content.add(viewRenderer);
	viewRenderer.insert = parent;
	renderTestView(parent);
	await expectOutputAsync({ text: "foo" }); // text rendered, no errors
});

test("Set inserted view using widget, and render", async () => {
	// Create a widget builder function
	class MyContentWidget extends Widget {
		text = StringConvertible.EMPTY;
	}
	const MyContent = () =>
		MyContentWidget.builder((v) => UI.Text(v.bind("text"))).extend({
			text(text: StringConvertible) {
				this.initializer.set("text", text);
				return this;
			},
		});

	class MyActivity extends Activity {
		static override View() {
			return UI.Show(new Binding("vc"));
		}
		vc = this.attach(MyContent().text("foo").build());
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
		static override View() {
			return UI.Cell(UI.Button("foo").onClick("ButtonPress"));
		}
		constructor() {
			super();
			this.setRenderMode("none");
		}
		onButtonPress() {
			countSecond++;
		}
	}

	// containing activity
	class MyActivity extends Activity {
		static override View() {
			return UI.Cell()
				.accessibleLabel("outer")
				.with(UI.Show(new Binding("second.view"), true));
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
	activity.second!.activate();
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
