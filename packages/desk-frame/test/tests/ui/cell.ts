import { app, UICell, UILabel, UIAnimatedCell } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UICell", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with content", () => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let cell = new UICell(label1, label2);
		expect(cell)
			.toHaveProperty("content")
			.asArray()
			.toBeArray([label1, label2]);
	});

	test("Preset with properties", () => {
		let MyCell = UICell.with({ hidden: true });
		let cell = new MyCell();
		expect(cell).toHaveProperty("hidden").toBeTruthy();
	});

	test("Preset animation cell with properties", () => {
		let MyCell = UIAnimatedCell.with({
			hidden: true,
			animationDuration: 200,
			animationTiming: "ease",
		});
		let cell = new MyCell();
		expect(cell).toHaveProperty("animationDuration").toBe(200);
		expect(cell).toHaveProperty("animationTiming").toBe("ease");
	});

	test("Preset with focusable", () => {
		let MyCell = UICell.with({ allowKeyboardFocus: true });
		let cell = new MyCell();
		expect(cell.allowFocus).toBe(true);
		expect(cell.allowKeyboardFocus).toBe(true);
	});

	test("Preset with content", () => {
		let MyCell = UICell.with(
			{ hidden: true },
			UILabel.withText("foo"),
			UILabel.withText("bar"),
		);
		let cell = new MyCell();
		expect(cell).toHaveProperty("hidden").toBeTruthy();
		expect(cell).toHaveProperty("content").asArray().toBeArray(2);
		let label1 = cell.content.first() as UILabel;
		expect(label1).toHaveProperty("text").asString().toBe("foo");
	});

	test("Select/deselect properties", () => {
		let cell = new UICell();
		expect(cell.selected).toBeFalsy();
		cell.emit("Select");
		expect(cell).toHaveProperty("selected").toBeTruthy();
		cell.emit("Select");
		expect(cell).toHaveProperty("selected").toBeTruthy();
		cell.emit("Deselect");
		expect(cell).toHaveProperty("selected").toBeFalsy();
	});

	test("Rendered as cell", async (t) => {
		let cell = new UICell();
		app.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
	});

	test("Rendered with content", async (t) => {
		let MyCell = UICell.with(
			{ layout: { gravity: "end" } },
			UILabel.withText("foo"),
			UILabel.withText("bar"),
		);
		app.render(new MyCell());
		let out = await t.expectOutputAsync(100, {
			type: "cell",
			style: { containerLayout: { gravity: "end" } },
		});
		out.containing({ type: "label", text: "foo" }).toBeRendered();
	});

	test("Rendered with style", async (t) => {
		let MyCell = UICell.with(
			{
				padding: 16,
				distribution: "start",
				borderThickness: 1,
				decoration: { borderColor: "@Green" },
			},
			UILabel.withText("foo"),
		);
		app.render(new MyCell());
		await t.expectOutputAsync(100, {
			type: "cell",
			style: {
				containerLayout: {
					distribution: "start",
				},
				decoration: {
					padding: 16,
					borderColor: "@Green",
					borderThickness: 1,
				},
			},
		});
	});

	test("Rendered, then update style", async (t) => {
		let cell = new UICell();
		app.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
		cell.borderRadius = 8;
		cell.distribution = "start";
		await t.expectOutputAsync(100, {
			style: {
				decoration: { borderRadius: 8 },
				containerLayout: { distribution: "start" },
			},
		});
	});

	test("Rendered, then update content", async (t) => {
		let cell = new UICell(new UILabel("foo"), new UILabel("bar"));
		app.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
		cell.content.add(new UILabel("baz"));
		let out = await t.expectOutputAsync(100, { type: "cell" });
		out.containing({ type: "label", text: "foo" }).toBeRendered();
		out.containing({ type: "label", text: "bar" }).toBeRendered();
		out.containing({ type: "label", text: "baz" }).toBeRendered();
		cell.content.clear();
		out = await t.expectOutputAsync(100, { type: "cell" });
		out.containing({ type: "label" }).toBeEmpty();
	});

	test("Move content between cells", async (t) => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let cell1 = new UICell(label1, label2);
		let cell2 = new UICell();

		// render cell 1 with labels first
		app.render(new UICell(cell1, cell2));
		let out1 = await t.expectOutputAsync(
			100,
			{ source: cell1 },
			{ text: "foo" },
		);
		let uid = out1.getSingle().uid;

		// now move label 1 to cell 2 and watch the output
		cell2.content.add(label1);
		let out2 = await t.expectOutputAsync(
			100,
			{ source: cell2 },
			{ text: "foo" },
		);

		expect(out2.getSingle().uid).toBe(uid);
	});

	test("Rendered and selected using FocusIn", async (t) => {
		let MyCell = UICell.with(
			{ allowFocus: true, onFocusIn: "Select" },
			UILabel.with({ allowFocus: true, text: "foo" }),
		);
		let cell = new MyCell();
		app.render(cell);
		let out = await t.expectOutputAsync(100, { text: "foo" });
		out.getSingle().focus();
		expect(cell).toHaveProperty("selected").toBeTruthy();
		await t.expectOutputAsync(100, { selected: true });
	});
});
