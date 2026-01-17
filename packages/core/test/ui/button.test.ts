import {
	clickOutputAsync,
	expectNavAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { Activity, app, UI, UIButton, Widget } from "../../dist/index.js";

beforeEach(() => {
	useTestContext((options) => {
		options.navigationDelay = 0;
	});
});

test("Constructor with text", () => {
	let button = new UIButton("foo");
	expect(String(button.text)).toBe("foo");
});

test("View builder with properties", () => {
	let myButton = UI.Button("foo");
	let button = myButton.build();
	expect(button.text).toBe("foo");
	expect(button.disableKeyboardFocus).toBeFalsy();
});

test("View builder using text", () => {
	let myButton = UI.Button("foo");
	let button = myButton.build();
	expect(button.text).toBe("foo");
});

test("View builder using text and accessible label", () => {
	let myButton = UI.Button("foo").accessibleLabel("test");
	let button = myButton.build();
	expect(button.accessibleLabel).toBe("test");
	expect(button.text).toBe("foo");
});

test("Button with chevron", async () => {
	let myButton = UI.Button("More").chevron("down", 12);
	let button = myButton.build();
	expect(button.chevron).toBe("down");
	expect(button.chevronStyle).toEqual({ size: 12 });
});

test("Button with both icon and chevron", async () => {
	let myButton = UI.Button("Settings").icon("menu").chevron("next");
	let button = myButton.build();
	expect(button.icon).toBeDefined();
	expect(button.chevron).toBe("next");
});

test("Navigation button sets accessible role to link", async () => {
	let myButton = UI.Button("Link").navigateTo("/test");
	let button = myButton.build();
	expect(button.accessibleRole).toBe("link");
});

test("Rendered with text", async () => {
	let myButton = UI.Button("foo").accessibleLabel("My button");
	renderTestView(myButton.build());
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My button",
	});
});

test("Rendered with fmt", async () => {
	class MyButtonWidget extends Widget {
		bar = "bar";
	}
	function MyButton() {
		return MyButtonWidget.builder((v) =>
			UI.Button.fmt("foo {}", v.bind("bar")),
		);
	}
	let myButton = MyButton().build();
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
	let button = myButton.build();
	expect(button.disabled).toBe(true);

	renderTestView(button);
	await expectOutputAsync({
		text: "Disabled",
		disabled: true,
	});
});

test("Button pressed state rendered", async () => {
	let myButton = UI.Button("Toggle").pressed();
	let button = myButton.build();
	expect(button.pressed).toBe(true);

	renderTestView(button);
	await expectOutputAsync({
		text: "Toggle",
		pressed: true,
	});
});

test("Rendered with styles", async () => {
	let myButton = UI.Button("foo").border(1, "orange").bold();
	renderTestView(myButton.build());
	await expectOutputAsync({
		text: "foo",
		style: {
			borderColor: UI.colors.orange,
			bold: true,
		},
	});
});

test("Disabled button does not emit click event", async () => {
	let myButton = UI.Button("Foo button").disabled();
	let btn = myButton.build();
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
	let btn = myButton.build();
	let clickValue: any;
	btn.listen((e) => {
		if (e.name === "Click") clickValue = e.data.value;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	expect(clickValue).toBe("foo");
});

test("Rendered and clicked, using callback function", async () => {
	let myButton = UI.Button("Foo button").onClick((e, button) => {
		button.emit(e, true);
		button.emit("Foo", { value: "foo" });
	});
	let btn = myButton.build();
	let clickValue: any;
	let clickEmitted = false;
	btn.listen((e) => {
		if (e.name === "Click") clickEmitted = true;
		if (e.name === "Foo") clickValue = e.data.value;
	});
	renderTestView(btn);
	await clickOutputAsync({ type: "button" });
	expect(clickValue).toBe("foo");
	expect(clickEmitted).toBe(true);
});

test("Click event propagation", async () => {
	let clicked = 0;
	class MyActivity extends Activity {
		static override View() {
			return UI.Cell(UI.Button("Button").onClick("ButtonClicked"));
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
		static override View() {
			return UI.Button("foo").navigateTo("/foo");
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
		static override View() {
			return UI.Button("bar").navigateTo("./bar");
		}
	}
	app.addActivity(new MyActivity());
	app.navigation?.set("foo");
	await clickOutputAsync({ text: "bar" });
	await expectNavAsync({ path: "foo/bar" });
});

test("Back button navigation", async () => {
	class MyActivity extends Activity {
		static override View() {
			return UI.Button("back").onClick("NavigateBack");
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
	let button = myButton.build();

	renderTestView(button);
	button.requestFocus();

	await expectOutputAsync({
		text: "Focus me",
		focused: true,
	});
});

test("Button with style name", async () => {
	let myButton = UI.Button("Styled").style("accent");
	let button = myButton.build();
	expect(button.styleName).toBe("accent");

	renderTestView(button);
	await expectOutputAsync({
		text: "Styled",
		styleName: "accent",
	});
});

test("Button with style overrides object", async () => {
	let myButton = UI.Button("Custom").style({ bold: true, fontSize: 18 });
	let button = myButton.build();
	expect(button.style).toEqual({ bold: true, fontSize: 18 });

	renderTestView(button);
	await expectOutputAsync({
		text: "Custom",
		style: { bold: true, fontSize: 18 },
	});
});

test("Button with style name and additional overrides", async () => {
	let myButton = UI.Button("Both").style("danger").bold().fontSize(20);
	let button = myButton.build();
	expect(button.styleName).toBe("danger");
	expect(button.style?.bold).toBe(true);
	expect(button.style?.fontSize).toBe(20);

	renderTestView(button);
	await expectOutputAsync({
		text: "Both",
		styleName: "danger",
		style: { bold: true, fontSize: 20 },
	});
});

test("Button default styleName", async () => {
	let button = UI.Button("Default").build();
	// Element styleName is undefined, renderer substitutes "default"
	expect(button.styleName).toBeUndefined();

	renderTestView(button);
	await expectOutputAsync({
		text: "Default",
		styleName: "default",
	});
});

test("Button style with binding (styleName)", async () => {
	class MyButtonWidget extends Widget {
		buttonStyle = "default";
	}
	function MyButton() {
		return MyButtonWidget.builder((v) =>
			UI.Button("Dynamic style").style(v.bind("buttonStyle")),
		);
	}
	let myButton = MyButton().build();
	renderTestView(myButton);

	// Initial style
	await expectOutputAsync({
		text: "Dynamic style",
		styleName: "default",
	});

	// Change style
	myButton.buttonStyle = "accent";
	await expectOutputAsync({
		text: "Dynamic style",
		styleName: "accent",
	});
});

test("Button style overrides with binding", async () => {
	class MyButtonWidget extends Widget {
		isBold = false;
	}
	function MyButton() {
		return MyButtonWidget.builder((v) =>
			UI.Button("Bold toggle").bold(v.bind("isBold")),
		);
	}
	let myButton = MyButton().build();
	renderTestView(myButton);

	// Initially not bold
	let initial = await expectOutputAsync({ text: "Bold toggle" });
	expect(initial.getSingle().style.bold).toBeFalsy();

	// Change to bold
	myButton.isBold = true;
	let bolded = await expectOutputAsync({
		text: "Bold toggle",
		style: { bold: true },
	});
	expect(bolded.getSingle().style.bold).toBe(true);
});

test("Button with background color", async () => {
	let myButton = UI.Button("Colored").background("accent");
	let button = myButton.build();
	expect(button.style?.background).toBe(UI.colors.accent);

	renderTestView(button);
	await expectOutputAsync({
		text: "Colored",
		style: { background: UI.colors.accent },
	});
});

test("Button with textColor", async () => {
	let myButton = UI.Button("Text color").textColor("accent");
	let button = myButton.build();
	expect(button.style?.textColor).toBe(UI.colors.accent);

	renderTestView(button);
	await expectOutputAsync({
		text: "Text color",
		style: { textColor: UI.colors.accent },
	});
});

test("Button with padding and margin", async () => {
	let myButton = UI.Button("Spaced").padding(16).margin(8);
	let button = myButton.build();
	expect(button.style?.padding).toBe(16);
	expect(button.style?.margin).toBe(8);

	renderTestView(button);
	await expectOutputAsync({
		text: "Spaced",
		style: { padding: 16, margin: 8 },
	});
});

test("Button with width and height", async () => {
	let myButton = UI.Button("Sized").width(100).height(50);
	let button = myButton.build();
	expect(button.style?.width).toBe(100);
	expect(button.style?.height).toBe(50);

	renderTestView(button);
	await expectOutputAsync({
		text: "Sized",
		style: { width: 100, height: 50 },
	});
});

test("Button with position", async () => {
	let myButton = UI.Button("Positioned").position("end", 10, 20);
	let button = myButton.build();
	expect(button.position?.gravity).toBe("end");
	expect(button.position?.top).toBe(10);
	expect(button.position?.end).toBe(20);

	renderTestView(button);
	await expectOutputAsync({
		text: "Positioned",
		position: { gravity: "end", top: 10, end: 20 },
	});
});

test("Button with opacity and dim", async () => {
	let myButton = UI.Button("Dimmed").dim();
	let button = myButton.build();
	expect(button.style?.opacity).toBe(0.5);

	let myButton2 = UI.Button("Custom opacity").opacity(0.75);
	let button2 = myButton2.build();
	expect(button2.style?.opacity).toBe(0.75);
});

test("Button with multiple chained style methods", async () => {
	let myButton = UI.Button("Styled")
		.style("accent")
		.bold()
		.italic()
		.underline()
		.fontSize(18)
		.textColor("text")
		.background("accent")
		.padding(12)
		.borderRadius(8);

	let button = myButton.build();
	expect(button.styleName).toBe("accent");
	expect(button.style?.bold).toBe(true);
	expect(button.style?.italic).toBe(true);
	expect(button.style?.underline).toBe(true);
	expect(button.style?.fontSize).toBe(18);
	expect(button.style?.textColor).toBe(UI.colors.text);
	expect(button.style?.background).toBe(UI.colors.accent);
	expect(button.style?.padding).toBe(12);
	expect(button.style?.borderRadius).toBe(8);

	renderTestView(button);
	await expectOutputAsync({
		text: "Styled",
		styleName: "accent",
		style: {
			bold: true,
			italic: true,
			underline: true,
			fontSize: 18,
			padding: 12,
			borderRadius: 8,
		},
	});
});
