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
	app,
	ui,
} from "../../../dist/index.js";

describe("UIButton", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
			options.navigationDelay = 0;
		});
	});

	test("Constructor with label", () => {
		let button = new UIButton("foo");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Preset with properties", () => {
		let MyButton = ui.button({ label: "foo" });
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
		expect(button.disableKeyboardFocus).toBeFalsy();
	});

	test("Preset using label", () => {
		let MyButton = ui.button("foo");
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Preset using object and label", () => {
		let MyButton = ui.button({ accessibleLabel: "test" }, "foo");
		let button = new MyButton();
		expect(button).toHaveProperty("accessibleLabel").toBe("test");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Preset with +Event:target", () => {
		let MyButton = ui.button({ label: "foo", onClick: "+Test:foo" });
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
		let MyButton = ui.button({
			label: "foo",
			accessibleLabel: "My button",
		});
		app.showPage(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			accessibleLabel: "My button",
		});
	});

	test("Rendered with styles", async (t) => {
		let MyButton = ui.button({
			label: "foo",
			style: {
				borderColor: ui.color.ORANGE,
				bold: true,
			},
		});
		app.showPage(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			styles: {
				borderColor: ui.color.ORANGE,
				bold: true,
			},
		});
	});

	test("Click event propagation", async (t) => {
		const ViewBody = ui.cell(ui.button("Button", "ButtonClicked"));
		class MyActivity extends Activity {
			protected override ready() {
				this.view = new ViewBody();
				app.showPage(this.view);
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
		let MyButton = ui.button({
			label: "foo",
			navigateTo: "/foo",
		});
		class MyActivity extends Activity {
			protected override ready() {
				this.view = new MyButton();
				app.showPage(this.view);
			}
		}
		app.addActivity(new MyActivity(), true);
		let elt = (await t.expectOutputAsync(100, { text: "foo" })).getSingle();
		elt.click();
		await t.sleep(2);
		expect(app.activities.navigationController.pageId).toBe("foo");
	});
});
