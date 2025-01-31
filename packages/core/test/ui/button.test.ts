import {
	clickOutputAsync,
	expectNavAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { Activity, UIButton, app, ui } from "../../dist/index.js";

beforeEach(() => {
	useTestContext({
		navigationDelay: 0,
	});
});

test("Constructor with label", () => {
	let button = new UIButton("foo");
	expect(String(button.label)).toBe("foo");
});

test("View builder with properties", () => {
	let myButton = ui.button({ label: "foo" });
	let button = myButton.create();
	expect(button.label).toBe("foo");
	expect(button.disableKeyboardFocus).toBeFalsy();
});

test("View builder using label", () => {
	let myButton = ui.button("foo");
	let button = myButton.create();
	expect(button.label).toBe("foo");
});

test("View builder using object and label", () => {
	let myButton = ui.button("foo", { accessibleLabel: "test" });
	let button = myButton.create();
	expect(button.accessibleLabel).toBe("test");
	expect(button.label).toBe("foo");
});

test("Rendered with label", async () => {
	let myButton = ui.button({
		label: "foo",
		accessibleLabel: "My button",
	});
	renderTestView(myButton.create());
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My button",
	});
});

test("Rendered with styles", async () => {
	let myButton = ui.button("foo", {
		style: {
			borderColor: ui.color.ORANGE,
			bold: true,
		},
	});
	renderTestView(myButton.create());
	await expectOutputAsync({
		text: "foo",
		styles: {
			borderColor: ui.color.ORANGE,
			bold: true,
		},
	});
});

test("Rendered and clicked, event has value", async () => {
	let myButton = ui.button("Foo button", { value: "foo" });
	let btn = myButton.create();
	let clickValue: any;
	btn.listen((e) => {
		if (e.name === "Click") clickValue = e.data.value;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	expect(clickValue).toBe("foo");
});

test("Click event propagation", async () => {
	let clicked = 0;
	const view = ui.cell(ui.button("Button", { onClick: "ButtonClicked" }));
	class MyActivity extends Activity {
		protected override createView() {
			return view.create();
		}
		onButtonClicked() {
			clicked++;
		}
	}
	app.addActivity(new MyActivity(), true);
	await clickOutputAsync({ text: "Button" });
	expect(clicked).toBe(1);
});

test("Button navigation with navigateTo", async () => {
	class MyActivity extends Activity {
		protected override createView() {
			return ui.button("foo", { navigateTo: "/foo" }).create();
		}
	}
	app.addActivity(new MyActivity(), true);
	await clickOutputAsync({ text: "foo" });
	await new Promise((r) => setTimeout(r, 2));
	expect(app.navigation.pageId).toBe("foo");
});

test("Back button navigation", async () => {
	class MyActivity extends Activity {
		protected override createView() {
			return ui.button("back", { onClick: "NavigateBack" }).create();
		}
	}
	app.addActivity(new MyActivity(), true);
	app.navigate("foo");
	await expectNavAsync({ pageId: "foo" });
	app.navigate("bar");
	await expectNavAsync({ pageId: "bar" });
	await clickOutputAsync({ text: "back" });
	await expectNavAsync({ pageId: "foo" });
});
