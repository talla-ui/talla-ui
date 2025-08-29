import {
	clickOutputAsync,
	expectNavAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	Activity,
	app,
	bind,
	CustomView,
	CustomViewBuilder,
	UI,
	UIButton,
	UIColor,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext({
		navigationDelay: 0,
	});
});

test("Constructor with text", () => {
	let button = new UIButton("foo");
	expect(String(button.text)).toBe("foo");
});

test("View builder with properties", () => {
	let myButton = UI.Button("foo");
	let button = myButton.create();
	expect(button.text).toBe("foo");
	expect(button.disableKeyboardFocus).toBeFalsy();
});

test("View builder using text", () => {
	let myButton = UI.Button("foo");
	let button = myButton.create();
	expect(button.text).toBe("foo");
});

test("View builder using text and accessible label", () => {
	let myButton = UI.Button("foo").accessibleLabel("test");
	let button = myButton.create();
	expect(button.accessibleLabel).toBe("test");
	expect(button.text).toBe("foo");
});

test("Button with chevron", async () => {
	let myButton = UI.Button("More").chevron("down", 12);
	let button = myButton.create();
	expect(button.chevron).toBe("down");
	expect(button.chevronStyle).toEqual({ size: 12 });
});

test("Button with both icon and chevron", async () => {
	let myButton = UI.Button("Settings").icon("menu").chevron("next");
	let button = myButton.create();
	expect(button.icon).toBeDefined();
	expect(button.chevron).toBe("next");
});

test("Navigation button sets accessible role to link", async () => {
	let myButton = UI.Button("Link").navigateTo("/test");
	let button = myButton.create();
	expect(button.accessibleRole).toBe("link");
});

test("Rendered with text", async () => {
	let myButton = UI.Button("foo").accessibleLabel("My button");
	renderTestView(myButton.create());
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My button",
	});
});

test("Rendered with fmt", async () => {
	function MyButton() {
		class MyButtonView extends CustomView {
			bar = "bar";
		}
		return CustomViewBuilder(MyButtonView, () =>
			UI.Button.fmt("foo {}", bind("bar")),
		);
	}
	let myButton = MyButton().create();
	renderTestView(myButton);
	await expectOutputAsync({
		text: "foo bar",
	});
	myButton.bar = "baz";
	await expectOutputAsync({
		text: "foo baz",
	});
});

test("Disabled button rendered", async () => {
	let myButton = UI.Button("Disabled").disabled();
	let button = myButton.create();
	expect(button.disabled).toBe(true);

	renderTestView(button);
	await expectOutputAsync({
		text: "Disabled",
		disabled: true,
	});
});

test("Button pressed state rendered", async () => {
	let myButton = UI.Button("Toggle").pressed();
	let button = myButton.create();
	expect(button.pressed).toBe(true);

	renderTestView(button);
	await expectOutputAsync({
		text: "Toggle",
		pressed: true,
	});
});

test("Rendered with styles", async () => {
	let myButton = UI.Button("foo").border(1, "orange").bold();
	renderTestView(myButton.create());
	await expectOutputAsync({
		text: "foo",
		styles: {
			borderColor: UIColor.theme.ref("orange"),
			bold: true,
		},
	});
});

test("Disabled button does not emit click event", async () => {
	let myButton = UI.Button("Foo button").disabled();
	let btn = myButton.create();
	let hasEmitted = false;
	btn.listen((e) => {
		if (e.name === "Click") hasEmitted = true;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	await new Promise((r) => setTimeout(r, 20));
	expect(hasEmitted).toBe(false);
});

test("Rendered and clicked, event has value", async () => {
	let myButton = UI.Button("Foo button").value("foo");
	let btn = myButton.create();
	let clickValue: any;
	btn.listen((e) => {
		if (e.name === "Click") clickValue = e.data.value;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	expect(clickValue).toBe("foo");
});

test("Rendered and clicked, event has emit data parameter", async () => {
	let myButton = UI.Button("Foo button").emit("Foo", { value: "foo" });
	let btn = myButton.create();
	let clickValue: any;
	btn.listen((e) => {
		if (e.name === "Foo") clickValue = e.data.value;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	expect(clickValue).toBe("foo");
});

test("Click event propagation", async () => {
	let clicked = 0;
	const view = UI.Cell(UI.Button("Button").emit("ButtonClicked"));
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
			return UI.Button("foo").navigateTo("/foo").create();
		}
	}
	app.addActivity(new MyActivity(), true);
	await clickOutputAsync({ text: "foo" });
	expect(app.navigation?.path).toBe("foo");
	await expectNavAsync({ path: "foo" });
});

test("Button navigation with navigateTo, relative path", async () => {
	class MyActivity extends Activity {
		override navigationPath = "foo";
		protected override createView() {
			return UI.Button("bar").navigateTo("./bar").create();
		}
	}
	app.addActivity(new MyActivity());
	app.navigation?.set("foo");
	await clickOutputAsync({ text: "bar" });
	await expectNavAsync({ path: "foo/bar" });
});

test("Back button navigation", async () => {
	class MyActivity extends Activity {
		protected override createView() {
			return UI.Button("back").emit("NavigateBack").create();
		}
	}
	app.addActivity(new MyActivity(), true);
	app.navigate("foo");
	await expectNavAsync({ path: "foo" });
	app.navigate("bar");
	await expectNavAsync({ path: "bar" });
	await clickOutputAsync({ text: "back" });
	await expectNavAsync({ path: "foo" });
});

test("Request button focus", async () => {
	let myButton = UI.Button("Focus me");
	let button = myButton.create();

	renderTestView(button);
	button.requestFocus();

	await expectOutputAsync({
		text: "Focus me",
		focused: true,
	});
});
