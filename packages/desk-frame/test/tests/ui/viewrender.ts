import {
	bound,
	ManagedEvent,
	PageViewActivity,
	app,
	UIButton,
	UICell,
	UILabel,
	UIViewRenderer,
	ViewActivity,
	UITextField,
	View,
} from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	TestRenderer,
	useTestContext,
} from "@desk-framework/test";

describe("UIViewRenderer", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor", () => {
		let viewRenderer = new UIViewRenderer();
		expect(viewRenderer).toHaveProperty("view").toBeUndefined();
	});

	test("Set simple view and render", async (t) => {
		let MyCell = UICell.with(UILabel.withText("foo"));
		let viewRenderer = new UIViewRenderer();
		viewRenderer.view = new MyCell();
		app.render(viewRenderer);
		await t.expectOutputAsync(50, { text: "foo" });
	});

	test("Change view after rendering", async (t) => {
		let MyCell1 = UICell.with(UILabel.withText("foo"));
		let MyCell2 = UICell.with(UILabel.withText("bar"));
		let viewRenderer = new UIViewRenderer();
		viewRenderer.view = new MyCell1();
		app.render(viewRenderer);
		await t.expectOutputAsync(50, { text: "foo" });
		viewRenderer.view = new MyCell2();
		await t.expectOutputAsync(50, { text: "bar" });
	});

	test("Unlink view after rendering", async (t) => {
		let MyCell = UICell.with(UILabel.withText("foo"));
		let viewRenderer = new UIViewRenderer();
		viewRenderer.view = new MyCell();
		app.render(viewRenderer);
		await t.expectOutputAsync(50, { text: "foo" });
		viewRenderer.view.unlink();
		await t.sleep(20);
		expect((app.renderer as TestRenderer).hasOutput()).toBeFalsy();
	});

	test("Set view using view composite, and render", async (t) => {
		const CompView = View.compose((p: { text: string }) =>
			UILabel.withText(p.text)
		);
		const Preset = CompView.with({ text: "foo" });
		class MyActivity extends PageViewActivity {
			static override ViewBody = UIViewRenderer.with({ view: bound("vc") });
			vc = this.attach(new Preset());
		}
		app.addActivity(new MyActivity(), true);
		await t.expectOutputAsync(50, { text: "foo" });
	});

	test("Set view and focus", async (t) => {
		let viewRenderer = new UIViewRenderer();
		viewRenderer.view = new UITextField();
		app.render(viewRenderer);
		await t.expectOutputAsync(50, { type: "textfield", focused: false });
		viewRenderer.requestFocus();
		await t.expectOutputAsync(50, { type: "textfield", focused: true });
	});

	test("Use activity as view and render", async (t) => {
		// activity that will be rendered as nested view
		class MySecondActivity extends ViewActivity {
			static override ViewBody = UICell.with(
				UIButton.withLabel("foo", "+ButtonPress")
			);
			onButtonPress() {
				this.emit("Foo");
			}
		}

		// containing view activity
		class MyActivity extends PageViewActivity {
			static override ViewBody = UICell.with(
				{ accessibleLabel: "outer" },
				UIViewRenderer.with({ view: bound("second") })
			);
			constructor() {
				super();
				this.observeAttach("second");
				this.second = new MySecondActivity();
			}
			declare second?: MySecondActivity;
			onFoo(e: ManagedEvent) {
				t.count("foo");
				if (e.delegate instanceof UIViewRenderer) t.count("delegate");
			}
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);

		// view should only show up when `second` is activated
		let out = await t.expectOutputAsync(50, {
			type: "cell",
			accessibleLabel: "outer",
		});
		out.containing({ text: "foo" }).toBeEmpty();
		await activity.second!.activateAsync();
		out = await t.expectOutputAsync(
			50,
			{ accessibleLabel: "outer" },
			{ text: "foo" }
		);

		// clicking the button should propagate all events
		out.getSingle().click();
		t.expectCount("foo").toBe(1);
		t.expectCount("delegate").toBe(1);

		// destroying the second activity should clear the view
		activity.second!.unlink();
		expect(activity).toHaveProperty("second").toBeUndefined();
		out = await t.expectOutputAsync(50, {
			type: "cell",
			accessibleLabel: "outer",
		});
		out.containing({ text: "foo" }).toBeEmpty();
	});
});
