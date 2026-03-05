import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIColumn, UIText, Widget } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with text", () => {
	let text = new UIText("foo");
	expect(text.text?.toString()).toBe("foo");

	// check that findViewContent on controls
	// returns a frozen empty array
	let content = text.findViewContent(UIText);
	expect(content).toHaveLength(0);
	expect(() => {
		content.push(new UIText("bar"));
	}).toThrowError();
});

test("View builder with properties", () => {
	let myText = UI.Text("foo");
	let text = myText.build();
	expect(text.text?.toString()).toBe("foo");
});

test("Focusable follows keyboard focusable", () => {
	let plainText = new UIText();
	expect(plainText.allowFocus).toBeFalsy();
	expect(plainText.allowKeyboardFocus).toBeFalsy();
	let focusableText = UI.Text().allowKeyboardFocus().build();
	expect(focusableText.allowFocus).toBeTruthy();
	expect(focusableText.allowKeyboardFocus).toBeTruthy();
});

test("View builder using text", () => {
	let myText = UI.Text("foo");
	let text = myText.build();
	expect(text.text?.toString()).toBe("foo");
});

test("View builder using text and style", () => {
	let myText = UI.Text("foo").bold();
	let text = myText.build();
	expect(text.text?.toString()).toBe("foo");
	expect(text.style?.bold).toBe(true);
});

test("Text with style overrides via style method", async () => {
	let myText = UI.Text("styled text").style({
		fontSize: "1.25rem",
		bold: true,
	});
	let text = myText.build();
	expect(text.style?.bold).toBe(true);

	renderTestView(text);
	await expectOutputAsync({
		text: "styled text",
		style: { bold: true },
	});
});

test("Rendered with text", async () => {
	let myText = UI.Text("foo").accessibleLabel("My label");
	let text = myText.build();
	renderTestView(text);
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My label",
	});
});

test("Rendered with fmt", async () => {
	class MyTextWidget extends Widget {
		bar = "bar";
	}
	function MyText() {
		return MyTextWidget.builder((v) => UI.Text.fmt("foo {}", v.bind("bar")));
	}
	let myText = MyText().build();
	renderTestView(myText);
	await expectOutputAsync({
		text: "foo bar",
	});
	myText.bar = "baz";
	await expectOutputAsync({
		text: "foo baz",
	});
});

test("Rendered, hidden and shown", async () => {
	let text = new UIText("foo");
	let view = new UIColumn();
	view.content.add(text);
	renderTestView(view);
	await expectOutputAsync({ type: "text", text: "foo" });
	text.hidden = true;
	let out = await expectOutputAsync({ type: "column" });
	out.containing({ type: "text" }).toBeEmpty();
	text.hidden = false;
	await expectOutputAsync({ type: "text", text: "foo" });
});

test("Text with style overrides object", async () => {
	let myText = UI.Text("Styled").style({ bold: true, fontSize: 20 });
	let text = myText.build();
	expect(text.style).toEqual({ bold: true, fontSize: 20 });

	renderTestView(text);
	await expectOutputAsync({
		text: "Styled",
		style: { bold: true, fontSize: 20 },
	});
});

test("Text with style overrides and additional methods", async () => {
	let myText = UI.Text("Both").larger().italic().textColor("accent");
	let text = myText.build();
	expect(text.style?.fontSize).toBe("larger");
	expect(text.style?.italic).toBe(true);
	expect(text.style?.textColor).toBe(UI.colors.accent);
});
