import {
	app,
	UICell,
	UIColor,
	UILabel,
	UIStyle,
	UIStyleController,
	UITheme,
} from "../../../dist/index.js";
import { describe, test, expect, useTestContext } from "@desk-framework/test";

describe("UIStyle and UIStyleController", (scope) => {
	scope.beforeAll(() => {
		app.theme = undefined;
	});

	test("Conditional styles", () => {
		let base = new UIStyle("Base");
		let style1 = base.extend({}, { hover: { textStyle: { bold: true } } });
		expect(style1.getConditionalStyles().hover?.textStyle?.bold).toBeTruthy();
	});

	test("UIStyle applied to control", (t) => {
		let style = new UIStyle("TestControlStyle", undefined, {
			dimensions: { width: 1 },
			position: { top: 1 },
			decoration: { padding: 1 },
			textStyle: { bold: true },
		});
		let label = new UILabel();
		expect(UIStyle.isStyleOverride(label.textStyle, label.style)).toBeFalsy();
		t.log("Setting style");
		label.style = style;
		expect(label.dimensions.width).toBe(1);
		expect(label.position.top).toBe(1);
		expect(label.decoration.padding).toBe(1);
		expect(label.textStyle.bold).toBeTruthy();
		expect(UIStyle.isStyleOverride(label.textStyle, label.style)).toBeFalsy();
		t.log("Overriding textStyle");
		label.textStyle = { italic: true };
		expect(label.textStyle.bold).toBeFalsy();
		expect(UIStyle.isStyleOverride(label.textStyle, label.style)).toBeTruthy();
	});

	test("UIStyle applied to container", () => {
		let style = new UIStyle("TestContainerStyle", undefined, {
			dimensions: { width: 1 },
			position: { top: 1 },
			decoration: { padding: 1 },
			containerLayout: { distribution: "end" },
		});
		let cell = new UICell();
		cell.style = style;
		expect(cell.dimensions.width).toBe(1);
		expect(cell.position.top).toBe(1);
		expect(cell.decoration.padding).toBe(1);
		expect(cell.layout.distribution).toBe("end");
	});

	test("UIColor with unknown name is transparent", () => {
		let unknown = UITheme.getColor("foo");
		expect(unknown).asString().toBe("transparent");
	});

	test("UIColor value is cached but changes with theme", () => {
		let blue = UIColor.Blue.alpha(0.5);
		let first = String(blue);

		// set blue theme color for the first time
		app.theme = new UITheme();
		let colors = { ...app.theme.colors, Blue: new UIColor("#11f") };
		app.theme.colors = colors;
		let second = String(blue);
		expect(first).not.toBe(second);

		// set blue theme color directly, cache not affected
		colors.Blue = new UIColor("#22f");
		let third = String(blue);
		expect(third).toBe(second);

		// clone theme and get color again, must be different
		app.theme = app.theme.clone();
		app.theme.colors = { ...app.theme.colors, Blue: new UIColor("#33f") };
		let fourth = String(blue);
		expect(fourth).not.toBe(third);
	});

	describe("UIStyleController", (scope) => {
		scope.beforeAll(() => {
			useTestContext((options) => {
				options.renderFrequency = 5;
			});
		});
		scope.afterAll(() => {
			app.clear();
		});

		test("Constructor, true state with style object", () => {
			let cell = new UICell();
			let controller = new UIStyleController();
			controller.body = cell;
			controller.state = true; // default anyway
			controller.style = UIStyle.Cell.extend({
				decoration: { background: "yellow" },
			});
			expect(cell.decoration.background).toBe("yellow");
		});

		test("Constructor, true state with override; override first", () => {
			let cell = new UICell();
			let controller = new UIStyleController();
			controller.dimensions = { width: 100 };
			controller.body = cell;
			expect(cell.dimensions.width).toBe(100);
		});

		test("Constructor, true state with override; body first", () => {
			let cell = new UICell();
			let controller = new UIStyleController();
			controller.body = cell;
			controller.dimensions = { width: 100 };
			expect(cell.dimensions.width).toBe(100);
		});

		test("Constructor, false state with style object", () => {
			let cell = new UICell();
			let controller = new UIStyleController();
			controller.body = cell;
			controller.state = false;
			controller.style = UIStyle.Cell.extend({
				decoration: { background: "yellow" },
			});
			expect(cell.decoration.background).toBeUndefined();
			controller.state = true;
			expect(cell.decoration.background).toBe("yellow");
		});

		test("With style object, initially false state", (t) => {
			let Preset = UIStyleController.with(
				{
					state: false,
					style: UIStyle.Cell.extend({ decoration: { borderThickness: 0 } }),
				},
				UICell.with({
					decoration: { borderColor: "green", borderThickness: 123 },
					dimensions: { width: 123 },
					layout: { gravity: "stretch" },
					position: { top: 123 },
				})
			);
			let instance = new Preset();
			instance.render();
			expect(instance.state).toBeFalsy();
			let cell = instance.body as UICell;
			expect(cell.decoration.borderThickness).toBe(123);
			expect(cell.position.top).toBe(123);

			// set state to true and expect label style to change
			t.log("Set state to true");
			instance.state = true;
			expect(cell.decoration.borderThickness).toBe(0);
			expect(cell.decoration.borderColor).toBeUndefined();
			expect(cell.position.top).not.toBe(123);

			// now change it back
			t.log("Set state back to false");
			instance.state = false;
			expect(cell.decoration.borderThickness).toBe(123);
			expect(cell.position.top).toBe(123);
		});

		test("With named style, from theme", (t) => {
			if (!app.theme) throw Error(); // avoid theme? below
			app.theme.styles.testItalic = UIStyle.Label.extend("testItalic", {
				textStyle: { italic: true },
			});
			app.theme.styles.testBold = UIStyle.Label.extend("testBold", {
				textStyle: { bold: true },
			});
			let Preset = UIStyleController.with(
				{ style: "@testItalic" },
				UILabel.withText("foo", "@testBold")
			);
			let instance = new Preset();
			instance.render();
			let label = instance.body as UILabel;
			expect(label.textStyle.italic).toBeTruthy();
			expect(label.textStyle.bold).toBeFalsy();

			// now change it back
			t.log("Set state to false");
			instance.state = false;
			expect(label.textStyle.bold).toBeTruthy();
			expect(label.textStyle.italic).toBeFalsy();
		});

		test("With style overrides, rendered, then updated", async (t) => {
			let Preset = UIStyleController.with(
				{ textStyle: { bold: true } },
				UILabel.withText("foo")
			);
			let instance = new Preset();
			app.render(instance);
			let out = await t.expectOutputAsync(100, { type: "label" });
			let styles = out.getSingle().styles;
			expect(styles.textStyle.bold).toBeTruthy();

			instance.textStyle = { italic: true };
			instance.dimensions = { width: 100 };
			out = await t.expectOutputAsync(100, { type: "label" });
			styles = out.getSingle().styles;
			expect(styles.textStyle.bold).toBeFalsy();
			expect(styles.textStyle.italic).toBeTruthy();
			expect(styles.dimensions.width).toBe(100);
		});
	});
});
