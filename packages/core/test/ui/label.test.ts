import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	Binding,
	ComponentView,
	ComponentViewBuilder,
	UI,
	UICell,
	UIRow,
	UIStyle,
	UIText,
} from "../../dist/index.js";

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
	expect((text.style as any).bold).toBeTruthy();
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
	function MyText() {
		return ComponentViewBuilder(
			class extends ComponentView {
				bar = "bar";
			},
			(v) => UI.Text.fmt("foo {}", v.bind("bar")),
		);
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

test("Rendered with styles (using view builder)", async () => {
	let myText1 = UI.Text("one").textStyle(
		UI.styles.text.default.override({ bold: true }),
	);
	let myText2 = UI.Text("two").bold();
	let row = new UIRow();
	row.content.add(myText1.build(), myText2.build());
	renderTestView(row);
	let match = await expectOutputAsync({
		type: "text",
		styles: { bold: true },
	});
	expect(match.elements).toHaveLength(2);
});

test("Rendered with combined styles", async () => {
	let ignoredStyle = UI.styles.text.default.override({ fontSize: 12 });
	let baseStyle = UI.styles.text.default.override({ bold: true });
	let myText = UI.Text("foo")
		.padding(8)
		.textStyle(ignoredStyle)
		.textStyle(baseStyle)
		.italic();
	let row = new UIRow();
	row.content.add(myText.build());
	renderTestView(row);
	let match = await expectOutputAsync({
		type: "text",
		styles: {
			padding: 8,
			bold: true,
			italic: true,
		},
	});
	expect(match.elements).toHaveLength(1);
});

test("Rendered with named style", async () => {
	UIStyle.theme.text.set({ test: new UIStyle({ bold: true, fontSize: 20 }) });
	let myText = UI.Text("foo").textStyle("test" as any);
	renderTestView(myText.build());
	await expectOutputAsync({
		type: "text",
		styles: {
			bold: true,
			fontSize: 20,
		},
	});
});

test("Rendered with named style and overrides", async () => {
	UIStyle.theme.text.set({ test: new UIStyle({ bold: true, fontSize: 20 }) });
	let myText = UI.Text("foo")
		.textStyle("test" as any)
		.bold(false)
		.underline(true);
	renderTestView(myText.build());
	await expectOutputAsync({
		type: "text",
		styles: {
			bold: false,
			underline: true,
			fontSize: 20,
		},
	});
});

test("Rendered with named color", async () => {
	let myText = UI.Text("foo").fg("blue");
	renderTestView(myText.build());
	await expectOutputAsync({
		type: "text",
		styles: {
			textColor: UI.colors.blue,
		},
	});
});

test("Rendered, hidden and shown", async () => {
	let text = new UIText("foo");
	let view = new UICell();
	view.content.add(text);
	renderTestView(view);
	await expectOutputAsync({ type: "text", text: "foo" });
	text.hidden = true;
	let out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "text" }).toBeEmpty();
	text.hidden = false;
	await expectOutputAsync({ type: "text", text: "foo" });
});

test("Rendered with bound named color", async () => {
	function MyText() {
		class MyTextView extends ComponentView {
			text = "Foo";
			color = "blue";
		}
		return ComponentViewBuilder(MyTextView, () =>
			UI.Text(new Binding("text")).fg(new Binding("color")),
		);
	}
	let view = MyText().build();
	renderTestView(view);
	await expectOutputAsync({
		type: "text",
		text: "Foo",
		styles: {
			textColor: UI.colors.blue,
		},
	});
});
