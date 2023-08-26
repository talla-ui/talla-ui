import {
	app,
	UICell,
	UICloseLabel,
	UIExpandedLabel,
	UIHeading1,
	UIHeading2,
	UIHeading3,
	UILabel,
	UIParagraph,
	UIStyle,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UILabel", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with text", () => {
		let label = new UILabel("foo");
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Sub type constructors", () => {
		let expanded = new UIExpandedLabel("foo");
		expect(expanded.shrinkwrap).toBe(false);
		let close = new UICloseLabel("foo");
		expect(close.style).toBe(UIStyle.CloseLabel);

		let [h1, h2, h3] = [
			new UIHeading1("foo"),
			new UIHeading2("foo"),
			new UIHeading3("foo"),
		];
		expect(h1.headingLevel).toBe(1);
		expect(h2.headingLevel).toBe(2);
		expect(h3.headingLevel).toBe(3);

		let p = new UIParagraph("foo");
		expect(p.style.getIds().pop()).toMatchRegExp(/paragraph/);
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
		let style = new UIStyle("Custom1", undefined, {
			textStyle: { bold: true },
		});
		let MyLabel1 = UILabel.withText("one", style);
		let MyLabel2 = UILabel.withText("two", { bold: true });
		app.render(new UICell(new MyLabel1(), new MyLabel2()));
		let match = await t.expectOutputAsync(100, {
			type: "label",
			style: { textStyle: { bold: true } },
		});
		expect(match.elements).toBeArray(2);
	});

	test("Rendered with styles", async (t) => {
		let MyLabel = UILabel.with({
			text: "foo",
			textStyle: { bold: true },
			dimensions: { width: 100 },
		});
		let label = new MyLabel();
		app.render(label);
		await t.expectOutputAsync(100, {
			text: "foo",
			style: { dimensions: { width: 100 }, textStyle: { bold: true } },
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
