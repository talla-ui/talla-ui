import {
	expectOutputAsync,
	renderTestView,
	TestRenderer,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	$view,
	Activity,
	app,
	bind,
	StringConvertible,
	ui,
	UILabel,
	UITextField,
	UIViewRenderer,
	ViewComposite,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext({ renderFrequency: 5 });
});

test("Constructor", () => {
	let viewRenderer = new UIViewRenderer();
	expect(viewRenderer).toHaveProperty("view", undefined);
});

test("Set simple view and render", async () => {
	let myCell = ui.cell(ui.label("foo"));
	let viewRenderer = new UIViewRenderer();
	viewRenderer.view = myCell.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	expect(viewRenderer.findViewContent(UILabel)).toHaveLength(1);
});

test("Change view after rendering", async () => {
	let myCell1 = ui.cell(ui.label("foo"));
	let myCell2 = ui.cell(ui.label("bar"));
	let viewRenderer = new UIViewRenderer();
	viewRenderer.view = myCell1.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.view = myCell2.create();
	await expectOutputAsync({ text: "bar" });
});

test("Unlink view after rendering", async () => {
	let myCell = ui.cell(ui.label("foo"));
	let viewRenderer = new UIViewRenderer();
	viewRenderer.view = myCell.create();
	renderTestView(viewRenderer);
	await expectOutputAsync({ text: "foo" });
	viewRenderer.view!.unlink();
	await new Promise((resolve) => setTimeout(resolve, 20));
	expect((app.renderer as TestRenderer).hasOutput()).toBeFalsy();
});

test("Set view using view composite, and render", async () => {
	const CompView = ViewComposite.define(
		{ text: StringConvertible.EMPTY },
		ui.label($view.string("text")),
	);
	const vb = ui.use(CompView, { text: "foo" });
	class MyActivity extends Activity {
		protected override createView() {
			return ui.renderView({ view: bind("vc") }).create();
		}
		vc = this.attach(vb.create());
	}
	app.addActivity(new MyActivity(), true);
	await expectOutputAsync({ text: "foo" });
});

test("Set view and focus", async () => {
	let viewRenderer = new UIViewRenderer();
	viewRenderer.view = new UITextField();
	renderTestView(viewRenderer);
	await expectOutputAsync({ type: "textfield", focused: false });
	viewRenderer.requestFocus();
	await expectOutputAsync({ type: "textfield", focused: true });
});

test("Use activity view and render", async () => {
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
					ui.renderView({
						view: bind("second.view"),
						propagateEvents: true,
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
