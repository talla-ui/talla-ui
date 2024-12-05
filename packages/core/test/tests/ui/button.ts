import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";
import { Activity, UIButton, app, ui } from "../../../dist/index.js";

describe("UIButton", (scope) => {
	scope.beforeEach(() => {
		useTestContext({
			renderFrequency: 5,
			navigationDelay: 0,
		});
	});

	test("Constructor with label", () => {
		let button = new UIButton("foo");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("View builder with properties", () => {
		let myButton = ui.button({ label: "foo" });
		let button = myButton.create();
		expect(button).toHaveProperty("label").asString().toBe("foo");
		expect(button.disableKeyboardFocus).toBeFalsy();
	});

	test("View builder using label", () => {
		let myButton = ui.button("foo");
		let button = myButton.create();
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("View builder using object and label", () => {
		let myButton = ui.button("foo", { accessibleLabel: "test" });
		let button = myButton.create();
		expect(button).toHaveProperty("accessibleLabel").toBe("test");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Rendered with label", async (t) => {
		let myButton = ui.button({
			label: "foo",
			accessibleLabel: "My button",
		});
		t.render(myButton.create());
		await t.expectOutputAsync({
			text: "foo",
			accessibleLabel: "My button",
		});
	});

	test("Rendered with styles", async (t) => {
		let myButton = ui.button("foo", {
			style: {
				borderColor: ui.color.ORANGE,
				bold: true,
			},
		});
		t.render(myButton.create());
		await t.expectOutputAsync({
			text: "foo",
			styles: {
				borderColor: ui.color.ORANGE,
				bold: true,
			},
		});
	});

	test("Rendered and clicked, event has value", async (t) => {
		let myButton = ui.button("Foo button", { value: "foo" });
		let btn = myButton.create();
		let clickValue: any;
		btn.listen((e) => {
			if (e.name === "Click") clickValue = e.data.value;
		});
		t.render(btn);
		await t.clickOutputAsync({ type: "button" });
		expect(clickValue).toBe("foo");
	});

	test("Click event propagation", async (t) => {
		const view = ui.cell(ui.button("Button", { onClick: "ButtonClicked" }));
		class MyActivity extends Activity {
			protected override createView() {
				return view.create();
			}
			onButtonClicked() {
				t.count("clicked");
			}
		}
		app.addActivity(new MyActivity(), true);
		await t.clickOutputAsync({ text: "Button" });
		t.expectCount("clicked").toBe(1);
	});

	test("Button navigation with navigateTo", async (t) => {
		class MyActivity extends Activity {
			protected override createView() {
				return ui.button("foo", { navigateTo: "/foo" }).create();
			}
		}
		app.addActivity(new MyActivity(), true);
		await t.clickOutputAsync({ text: "foo" });
		await t.sleep(2);
		expect(app.navigation.pageId).toBe("foo");
	});

	test("Back button navigation", async (t) => {
		class MyActivity extends Activity {
			protected override createView() {
				return ui.button("back", { onClick: "NavigateBack" }).create();
			}
		}
		app.addActivity(new MyActivity(), true);
		app.navigate("foo");
		await t.expectNavAsync({ pageId: "foo" });
		app.navigate("bar");
		await t.expectNavAsync({ pageId: "bar" });
		await t.clickOutputAsync({ text: "back" });
		await t.expectNavAsync({ pageId: "foo" });
	});
});
