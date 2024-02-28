import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";
import { app, ui, UICell, UILabel, UIRow } from "../../../dist/index.js";

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

	test("Preset with properties", () => {
		let MyLabel = ui.label({ text: "foo" });
		let label = new MyLabel();
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Focusable follows keyboard focusable", () => {
		let plainLabel = new UILabel();
		expect(plainLabel.allowFocus).toBeFalsy();
		expect(plainLabel.allowKeyboardFocus).toBeFalsy();
		let focusableLabel = new (ui.label({ allowKeyboardFocus: true }))();
		expect(focusableLabel.allowFocus).toBeTruthy();
		expect(focusableLabel.allowKeyboardFocus).toBeTruthy();
	});

	test("Preset using text", () => {
		let MyLabel = ui.label("foo");
		let label = new MyLabel();
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Rendered with text", async (t) => {
		let MyLabel = ui.label({
			text: "foo",
			accessibleLabel: "My label",
		});
		let label = new MyLabel();
		app.showPage(label);
		await t.expectOutputAsync(100, {
			text: "foo",
			accessibleLabel: "My label",
		});
	});

	test("Rendered with styles (using text preset)", async (t) => {
		let MyLabel1 = ui.label("one", ui.style.LABEL.override({ bold: true }));
		let MyLabel2 = ui.label("two", { bold: true });
		app.showPage(new UIRow(new MyLabel1(), new MyLabel2()));
		let match = await t.expectOutputAsync(100, {
			type: "label",
			styles: { bold: true },
		});
		expect(match.elements).toBeArray(2);
	});

	test("Rendered with styles", async (t) => {
		let MyLabel = ui.label({
			text: "foo",
			width: 100,
			style: { bold: true },
		});
		let label = new MyLabel();
		app.showPage(label);
		await t.expectOutputAsync(100, {
			text: "foo",
			styles: { width: 100, bold: true },
		});
	});

	test("Rendered, hidden and shown", async (t) => {
		let label = new UILabel("foo");
		let view = new UICell(label);
		app.showPage(view);
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
