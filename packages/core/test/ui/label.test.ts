import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	CustomView,
	UI,
	UICell,
	UILabel,
	UIRow,
	UIStyle,
	bind,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with text", () => {
	let label = new UILabel("foo");
	expect(label.text?.toString()).toBe("foo");

	// check that findViewContent on controls
	// returns a frozen empty array
	let content = label.findViewContent(UILabel);
	expect(content).toHaveLength(0);
	expect(() => {
		content.push(new UILabel("bar"));
	}).toThrowError();
});

test("View builder with properties", () => {
	let myLabel = UI.Label("foo");
	let label = myLabel.create();
	expect(label.text?.toString()).toBe("foo");
});

test("Focusable follows keyboard focusable", () => {
	let plainLabel = new UILabel();
	expect(plainLabel.allowFocus).toBeFalsy();
	expect(plainLabel.allowKeyboardFocus).toBeFalsy();
	let focusableLabel = UI.Label().allowKeyboardFocus().create();
	expect(focusableLabel.allowFocus).toBeTruthy();
	expect(focusableLabel.allowKeyboardFocus).toBeTruthy();
});

test("View builder using text", () => {
	let myLabel = UI.Label("foo");
	let label = myLabel.create();
	expect(label.text?.toString()).toBe("foo");
});

test("View builder using text and style", () => {
	let myLabel = UI.Label("foo").bold();
	let label = myLabel.create();
	expect(label.text?.toString()).toBe("foo");
	expect((label.style as any).bold).toBeTruthy();
});

test("Rendered with text", async () => {
	let myLabel = UI.Label("foo").accessibleLabel("My label");
	let label = myLabel.create();
	renderTestView(label);
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My label",
	});
});

test("Rendered with fmt", async () => {
	function MyLabel() {
		class MyLabelView extends CustomView {
			bar = "bar";
		}
		return MyLabelView.builder(() => UI.Label.fmt("foo {}", bind("bar")));
	}
	let myLabel = MyLabel().create();
	renderTestView(myLabel);
	await expectOutputAsync({
		text: "foo bar",
	});
	myLabel.bar = "baz";
	await expectOutputAsync({
		text: "foo baz",
	});
});

test("Rendered with styles (using view builder)", async () => {
	let myLabel1 = UI.Label("one").labelStyle(
		UI.styles.label.default.override({ bold: true }),
	);
	let myLabel2 = UI.Label("two").bold();
	let row = new UIRow();
	row.content.add(myLabel1.create(), myLabel2.create());
	renderTestView(row);
	let match = await expectOutputAsync({
		type: "label",
		styles: { bold: true },
	});
	expect(match.elements).toHaveLength(2);
});

test("Rendered with combined styles", async () => {
	let ignoredStyle = UI.styles.label.default.override({ fontSize: 12 });
	let baseStyle = UI.styles.label.default.override({ bold: true });
	let myLabel = UI.Label("foo")
		.padding(8)
		.labelStyle(ignoredStyle)
		.labelStyle(baseStyle)
		.italic();
	let row = new UIRow();
	row.content.add(myLabel.create());
	renderTestView(row);
	let match = await expectOutputAsync({
		type: "label",
		styles: {
			padding: 8,
			bold: true,
			italic: true,
		},
	});
	expect(match.elements).toHaveLength(1);
});

test("Rendered with named style", async () => {
	UIStyle.theme.label.set({ test: new UIStyle({ bold: true, fontSize: 20 }) });
	let myLabel = UI.Label("foo").labelStyle("test" as any);
	renderTestView(myLabel.create());
	await expectOutputAsync({
		type: "label",
		styles: {
			bold: true,
			fontSize: 20,
		},
	});
});

test("Rendered with named style and overrides", async () => {
	UIStyle.theme.label.set({ test: new UIStyle({ bold: true, fontSize: 20 }) });
	let myLabel = UI.Label("foo")
		.labelStyle("test" as any)
		.bold(false)
		.underline(true);
	renderTestView(myLabel.create());
	await expectOutputAsync({
		type: "label",
		styles: {
			bold: false,
			underline: true,
			fontSize: 20,
		},
	});
});

test("Rendered with named color", async () => {
	let myLabel = UI.Label("foo").fg("blue");
	renderTestView(myLabel.create());
	await expectOutputAsync({
		type: "label",
		styles: {
			textColor: UI.colors.blue,
		},
	});
});

test("Rendered, hidden and shown", async () => {
	let label = new UILabel("foo");
	let view = new UICell();
	view.content.add(label);
	renderTestView(view);
	await expectOutputAsync({ type: "label", text: "foo" });
	label.hidden = true;
	let out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "label" }).toBeEmpty();
	label.hidden = false;
	await expectOutputAsync({ type: "label", text: "foo" });
});

test("Rendered with bound named color", async () => {
	function MyLabel() {
		class MyLabelView extends CustomView {
			text = "Foo";
			color = "blue";
		}
		return MyLabelView.builder(() => UI.Label(bind("text")).fg(bind("color")));
	}
	let view = MyLabel().create();
	renderTestView(view);
	await expectOutputAsync({
		type: "label",
		text: "Foo",
		styles: {
			textColor: UI.colors.blue,
		},
	});
});
