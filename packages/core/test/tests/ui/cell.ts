import { UICell, UILabel, ui } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

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
		expect(cell.findViewContent(UILabel)).toBeArray(2);
	});

	test("Preset with properties", () => {
		let MyCell = ui.cell({ hidden: true });
		let cell = new MyCell();
		expect(cell).toHaveProperty("hidden").toBeTruthy();
	});

	test("Preset animation cell with properties", () => {
		let MyCell = ui.animatedCell({
			hidden: true,
			animationDuration: 200,
			animationTiming: "ease",
		});
		let cell = new MyCell();
		expect(cell).toHaveProperty("animationDuration").toBe(200);
		expect(cell).toHaveProperty("animationTiming").toBe("ease");
	});

	test("Preset with focusable", () => {
		let MyCell = ui.cell({ allowKeyboardFocus: true });
		let cell = new MyCell();
		expect(cell.allowFocus).toBe(true);
		expect(cell.allowKeyboardFocus).toBe(true);
	});

	test("Preset with content", () => {
		let MyCell = ui.cell({ hidden: true }, ui.label("foo"));
		let cell = new MyCell();
		expect(cell).toHaveProperty("hidden").toBeTruthy();
		expect(cell).toHaveProperty("content").asArray().toBeArray(1);
		let label = cell.content.first() as UILabel;
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Rendered as cell", async (t) => {
		let cell = new UICell();
		t.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
	});

	test("Rendered with content", async (t) => {
		let MyCell = ui.cell({ layout: { gravity: "end" } }, ui.label("foo"));
		t.render(new MyCell());
		let out = await t.expectOutputAsync(100, {
			type: "cell",
			styles: { gravity: "end" },
		});
		out.containing({ type: "label", text: "foo" }).toBeRendered();
	});

	test("Rendered with style", async (t) => {
		let MyCell = ui.cell(
			{
				padding: 16,
				style: { borderColor: ui.color.GREEN, borderThickness: 1 },
				layout: { distribution: "start" },
			},
			ui.label("foo"),
		);
		t.render(new MyCell());
		await t.expectOutputAsync(100, {
			type: "cell",
			styles: {
				distribution: "start",
				padding: 16,
				borderColor: ui.color.GREEN,
				borderThickness: 1,
			},
		});
	});

	test("Rendered, then update style", async (t) => {
		let cell = new UICell();
		t.render(cell);
		await t.expectOutputAsync(100, { type: "cell" });
		cell.borderRadius = 8;
		cell.layout = { distribution: "start" };
		await t.expectOutputAsync(100, {
			styles: {
				borderRadius: 8,
				distribution: "start",
			},
		});
	});

	test("Rendered, then update content", async (t) => {
		let cell = new UICell(new UILabel("foo"), new UILabel("bar"));
		t.render(cell);
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
		t.render(new UICell(cell1, cell2));
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
});
