import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UICell, UILabel, UIRow, ui } from "../../dist/index.js";

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
	let myLabel = ui.label({ text: "foo" });
	let label = myLabel.create();
	expect(label.text?.toString()).toBe("foo");
});

test("Focusable follows keyboard focusable", () => {
	let plainLabel = new UILabel();
	expect(plainLabel.allowFocus).toBeFalsy();
	expect(plainLabel.allowKeyboardFocus).toBeFalsy();
	let focusableLabel = ui.label({ allowKeyboardFocus: true }).create();
	expect(focusableLabel.allowFocus).toBeTruthy();
	expect(focusableLabel.allowKeyboardFocus).toBeTruthy();
});

test("View builder using text", () => {
	let myLabel = ui.label("foo");
	let label = myLabel.create();
	expect(label.text?.toString()).toBe("foo");
});

test("View builder using object and text", () => {
	let myLabel = ui.label("foo", { bold: true });
	let label = myLabel.create();
	expect(label.bold).toBeTruthy();
	expect(label.text?.toString()).toBe("foo");
});

test("Rendered with text", async () => {
	let myLabel = ui.label({
		text: "foo",
		accessibleLabel: "My label",
	});
	let label = myLabel.create();
	renderTestView(label);
	await expectOutputAsync({
		text: "foo",
		accessibleLabel: "My label",
	});
});

test("Rendered with styles (using view builder)", async () => {
	let myLabel1 = ui.label("one", {
		style: ui.style.LABEL.override({ bold: true }),
	});
	let myLabel2 = ui.label("two", { bold: true });
	renderTestView(new UIRow(myLabel1.create(), myLabel2.create()));
	let match = await expectOutputAsync({
		type: "label",
		styles: { bold: true },
	});
	expect(match.elements).toHaveLength(2);
});

test("Rendered with combined styles", async () => {
	let myLabel = ui.label("foo", {
		padding: 8,
		style: ui.style(
			ui.style.LABEL.extend({ fontSize: 12 }), // ignored
			ui.style.LABEL.override({ bold: true }), // base
			{ italic: true }, // override
		),
	});
	renderTestView(new UIRow(myLabel.create()));
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

test("Rendered with styles", async () => {
	let myLabel = ui.label({
		text: "foo",
		width: 100,
		style: { bold: true },
	});
	let label = myLabel.create();
	renderTestView(label);
	await expectOutputAsync({
		text: "foo",
		styles: { width: 100, bold: true },
	});
});

test("Rendered, hidden and shown", async () => {
	let label = new UILabel("foo");
	let view = new UICell(label);
	renderTestView(view);
	await expectOutputAsync({ type: "label", text: "foo" });
	label.hidden = true;
	let out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "label" }).toBeEmpty();
	label.hidden = false;
	await expectOutputAsync({ type: "label", text: "foo" });
});
