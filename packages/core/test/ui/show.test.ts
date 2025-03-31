import {
	expectOutputAsync,
	renderTestView,
	TestRenderer,
	useTestContext,
} from "@talla-ui/test-handler";
import { StringConvertible } from "@talla-ui/util";
import { beforeEach, expect, test } from "vitest";
import {
	$bind,
	$view,
	Activity,
	app,
	ObservedObject,
	ui,
	UICell,
	UIComponent,
	UILabel,
	UIShowView,
	UITextField,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Set state directly", () => {
	let myShow = ui.show({}, ui.cell());
	let show = myShow.create();
	expect(show.body).toBeInstanceOf(UICell);
	expect(ObservedObject.whence(show.body)).toBe(show);
	show.state = false;
	expect(show.body).toBeUndefined();
});

test("Body view events are propagated", async () => {
	let myCell = ui.cell(
		ui.show(ui.button("Click me", { onClick: "ButtonClick" })),
	);

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
	const MyUIComponent = UIComponent.define(
		{ condition: false },
		ui.cell(
			ui.show(
				{ state: $view.boolean("condition") },
				// label should only be rendered when condition is true
				ui.label("foo"),
			),
		),
	);
	const myUIComponent = ui.use(MyUIComponent, { condition: false });

	console.log("Creating view");
	useTestContext();
	let myView = myUIComponent.create();

	console.log("Rendering view");
	renderTestView(myView);

	// after rendering, there should be a cell but no label
	console.log("Checking for cell but no label");
	let expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();

	// when condition becomes true, label should be rendered
	console.log("Setting state to true");
	myView.condition = true;
	await expectOutputAsync({ text: "foo" });

	// when condition becomes false, label should be removed
	console.log("Setting state to false");
	myView.condition = false;
	expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();
});

test("Set inserted view and render", async () => {
	let myCell = ui.cell(ui.label("foo"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	expect(viewRenderer.findViewContent(UILabel)).toHaveLength(1);
});

test("Change inserted view after rendering", async () => {
	let myCell1 = ui.cell(ui.label("foo"));
	let myCell2 = ui.cell(ui.label("bar"));
	let viewRenderer = new UIShowView();
	viewRenderer.insert = myCell1.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.insert = myCell2.create();
	await expectOutputAsync({ text: "bar" });
});

test("Unlink inserted view after rendering", async () => {
	let myCell = ui.cell(ui.label("foo"));
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
	let parent = ui.cell(ui.label("foo")).create();
	let viewRenderer = new UIShowView();
	parent.content.add(viewRenderer);
	viewRenderer.insert = parent;
	renderTestView(parent);
	await expectOutputAsync({ text: "foo" }); // label rendered, no errors
});

test("Set inserted view using UI component, and render", async () => {
	const CompView = UIComponent.define(
		{ text: StringConvertible.EMPTY },
		ui.label($view.string("text")),
	);
	const vb = ui.use(CompView, { text: "foo" });
	class MyActivity extends Activity {
		protected override createView() {
			return ui.show({ insert: $bind("vc") }).create();
		}
		vc = this.attach(vb.create());
	}
	app.addActivity(new MyActivity(), true);
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
			return ui.cell(ui.button("foo", { onClick: "+ButtonPress" })).create();
		}
		onButtonPress() {
			countSecond++;
		}
	}

	// containing activity
	class MyActivity extends Activity {
		protected override createView() {
			return ui
				.cell(
					{ accessibleLabel: "outer" },
					ui.show({
						insert: $bind("second.view"),
						propagateInsertedEvents: true,
					}),
				)
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
