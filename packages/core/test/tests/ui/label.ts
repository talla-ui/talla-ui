import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";
import { UICell, UILabel, UIRow, ui } from "../../../dist/index.js";

describe("UILabel", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
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

	test("Preset using object and text", () => {
		let MyLabel = ui.label("foo", { bold: true });
		let label = new MyLabel();
		expect(label).toHaveProperty("bold").toBeTruthy();
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Rendered with text", async (t) => {
		let MyLabel = ui.label({
			text: "foo",
			accessibleLabel: "My label",
		});
		let label = new MyLabel();
		t.render(label);
		await t.expectOutputAsync({
			text: "foo",
			accessibleLabel: "My label",
		});
	});

	test("Rendered with styles (using preset)", async (t) => {
		let MyLabel1 = ui.label("one", {
			style: ui.style.LABEL.override({ bold: true }),
		});
		let MyLabel2 = ui.label("two", { bold: true });
		t.render(new UIRow(new MyLabel1(), new MyLabel2()));
		let match = await t.expectOutputAsync({
			type: "label",
			styles: { bold: true },
		});
		expect(match.elements).toBeArray(2);
	});

	test("Rendered with combined styles", async (t) => {
		let MyLabel = ui.label("foo", {
			style: ui.style(
				ui.style.LABEL_SMALL, // ignored
				ui.style.LABEL.override({ bold: true }), // base
				{ italic: true }, // override
			),
		});
		t.render(new UIRow(new MyLabel()));
		let match = await t.expectOutputAsync({
			type: "label",
			styles: { bold: true, italic: true },
		});
		expect(match.elements).toBeArray(1);
	});

	test("Rendered with styles", async (t) => {
		let MyLabel = ui.label({
			text: "foo",
			width: 100,
			style: { bold: true },
		});
		let label = new MyLabel();
		t.render(label);
		await t.expectOutputAsync({
			text: "foo",
			styles: { width: 100, bold: true },
		});
	});

	test("Rendered, hidden and shown", async (t) => {
		let label = new UILabel("foo");
		let view = new UICell(label);
		t.render(view);
		await t.expectOutputAsync({ type: "label", text: "foo" });
		label.hidden = true;
		let out = await t.expectOutputAsync({ type: "cell" });
		out.containing({ type: "label" }).toBeEmpty();
		label.hidden = false;
		await t.expectOutputAsync({ type: "label", text: "foo" });
	});
});
