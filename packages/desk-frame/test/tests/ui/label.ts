import { describe, expect, test, useTestContext } from "@desk-framework/test";
import {
	app,
	UICell,
	UICloseLabel,
	UICloseLabelStyle,
	UIHeading1Label,
	UIHeading2Label,
	UIHeading3Label,
	UILabel,
	UILabelStyle,
	UIParagraphLabel,
	UIParagraphLabelStyle,
} from "../../../dist/index.js";

describe("UILabel", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with text", () => {
		let label = new UILabel("foo");
		expect(label).toHaveProperty("text").asString().toBe("foo");

		// check that findViewContent on controls
		// returns a frozen empty array
		let content = label.findViewContent(UILabel);
		expect(content).toBeArray(0);
		expect(() => {
			content.push(new UILabel("bar"));
		}).toThrowError();
	});

	test("Sub type constructors", () => {
		let close = new UICloseLabel("foo");
		expect(close.labelStyle).toBe(UICloseLabelStyle);

		let [h1, h2, h3] = [
			new UIHeading1Label("foo"),
			new UIHeading2Label("foo"),
			new UIHeading3Label("foo"),
		];
		expect(h1.headingLevel).toBe(1);
		expect(h2.headingLevel).toBe(2);
		expect(h3.headingLevel).toBe(3);

		let p = new UIParagraphLabel("foo");
		expect(p.labelStyle).toBe(UIParagraphLabelStyle);
	});

	test("Preset with properties", () => {
		let MyLabel = UILabel.with({ text: "foo" });
		let label = new MyLabel();
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Focusable follows keyboard focusable", () => {
		let plainLabel = new UILabel();
		expect(plainLabel.allowFocus).toBeFalsy();
		expect(plainLabel.allowKeyboardFocus).toBeFalsy();
		let focusableLabel = new (UILabel.with({ allowKeyboardFocus: true }))();
		expect(focusableLabel.allowFocus).toBeTruthy();
		expect(focusableLabel.allowKeyboardFocus).toBeTruthy();
	});

	test("Preset using withText", () => {
		let MyLabel = UILabel.withText("foo");
		let label = new MyLabel();
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Preset using withIcon", () => {
		let MyLabel = UILabel.withIcon("@foo");
		let label = new MyLabel();
		expect(label).toHaveProperty("icon").asString().toBe("@foo");
	});

	test("Rendered with text", async (t) => {
		let MyLabel = UILabel.with({
			text: "foo",
			accessibleLabel: "My label",
		});
		let label = new MyLabel();
		app.render(label);
		await t.expectOutputAsync(100, {
			text: "foo",
			accessibleLabel: "My label",
		});
	});

	test("Rendered with styles (using withText)", async (t) => {
		let MyLabel1 = UILabel.withText(
			"one",
			UILabelStyle.override({ bold: true }),
		);
		let MyLabel2 = UILabel.withText("two", { bold: true });
		app.render(new UICell(new MyLabel1(), new MyLabel2()));
		let match = await t.expectOutputAsync(100, {
			type: "label",
			styles: { bold: true },
		});
		expect(match.elements).toBeArray(2);
	});

	test("Rendered with styles", async (t) => {
		let MyLabel = UILabel.with({
			text: "foo",
			width: 100,
			labelStyle: { bold: true },
		});
		let label = new MyLabel();
		app.render(label);
		await t.expectOutputAsync(100, {
			text: "foo",
			styles: { width: 100, bold: true },
		});
	});

	test("Rendered, hidden and shown", async (t) => {
		let label = new UILabel("foo");
		let view = new UICell(label);
		app.render(view);
		await t.expectOutputAsync(100, { type: "label", text: "foo" });
		label.hidden = true;
		let out = await t.expectOutputAsync(100, {
			type: "cell",
		});
		out.containing({ type: "label" }).toBeEmpty();
		label.hidden = false;
		await t.expectOutputAsync(100, {
			type: "label",
			text: "foo",
		});
	});
});
