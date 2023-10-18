import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";
import {
	ManagedEvent,
	Activity,
	UIButton,
	UICell,
	UIIconButton,
	UIIconButtonStyle,
	UIPlainButton,
	UIPlainButtonStyle,
	UIPrimaryButton,
	UIPrimaryButtonStyle,
	app,
} from "../../../dist/index.js";

describe("UIButton", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
			options.pathDelay = 0;
		});
	});

	test("Constructor with label", () => {
		let button = new UIButton("foo");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Sub type constructors", () => {
		let buttons = [
			new UIButton("foo"),
			new UIPrimaryButton("foo"),
			new UIPlainButton("foo"),
			new UIIconButton("foo"),
		];
		expect(buttons.map((b) => b.buttonStyle)).toBeArray([
			undefined,
			UIPrimaryButtonStyle,
			UIPlainButtonStyle,
			UIIconButtonStyle,
		]);
	});

	test("Preset with properties", () => {
		let MyButton = UIButton.with({ label: "foo" });
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
		expect(button.disableKeyboardFocus).toBeFalsy();
	});

	test("Preset using withLabel", () => {
		let MyButton = UIButton.withLabel("foo");
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Preset using withIcon", () => {
		let MyButton = UIButton.withIcon("@foo");
		let button = new MyButton();
		expect(button).toHaveProperty("icon").asString().toBe("@foo");
	});

	test("Preset with +Event:target", () => {
		let MyButton = UIButton.with({ label: "foo", onClick: "+Test:foo" });
		let button = new MyButton();
		let events: ManagedEvent[] = [];
		button.listen((e) => {
			events.push(e);
		});
		button.emit("Click", { test: 123 });
		expect(events).toBeArray(2);
		expect(events[0]).toHaveProperty("name").toBe("Click");
		expect(events[1]).toHaveProperty("name").toBe("Test");
		expect(events[1])
			.toHaveProperty("data")
			.toHaveProperty("target")
			.toBe("foo");
	});

	test("Rendered with label", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			accessibleLabel: "My button",
		});
		app.render(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			accessibleLabel: "My button",
		});
	});

	test("Rendered with styles", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			buttonStyle: {
				borderColor: "@orange",
				bold: true,
			},
		});
		app.render(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			styles: {
				borderColor: "@orange",
				bold: true,
			},
		});
	});

	test("Click event propagation", async (t) => {
		const ViewBody = UICell.with(UIButton.withLabel("Button", "ButtonClicked"));
		class MyActivity extends Activity {
			protected override ready() {
				this.view = new ViewBody();
				app.render(this.view);
			}
			onButtonClicked() {
				t.count("clicked");
			}
		}
		app.addActivity(new MyActivity(), true);
		let out = await t.expectOutputAsync(100, { text: "Button" });
		out.getSingle().click();
		t.expectCount("clicked").toBe(1);
	});

	test("Button navigation with navigateTo", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			navigateTo: "/foo",
		});
		class MyActivity extends Activity {
			protected override ready() {
				this.view = new MyButton();
				app.render(this.view);
			}
		}
		app.addActivity(new MyActivity(), true);
		let elt = (await t.expectOutputAsync(100, { text: "foo" })).getSingle();
		elt.click();
		await t.sleep(2);
		expect(app.getPath()).toBe("foo");
	});
});
