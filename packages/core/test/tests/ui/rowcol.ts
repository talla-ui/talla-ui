import { ui, UIColumn, UILabel, UIRow } from "../../../dist/index.js";
import { describe, test, expect, useTestContext } from "@talla-ui/test-handler";

describe("UIRow and UIColumn", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
	});

	test("Row constructor with content", () => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let row = new UIRow(label1, label2);
		expect(row).toHaveProperty("content").asArray().toBeArray([label1, label2]);
	});

	test("Column constructor with content", () => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let col = new UIColumn(label1, label2);
		expect(col).toHaveProperty("content").asArray().toBeArray([label1, label2]);
	});

	test("Row preset with height and content", () => {
		let MyRow = ui.row({ height: 123 }, UILabel);
		let row = new MyRow();
		expect(row).toHaveProperty("height").toBe(123);
		expect(row).toHaveProperty("content").asArray().toBeArray(1);
	});

	test("Column preset with width", () => {
		let MyCol = ui.column({ width: 123 }, UILabel);
		let col = new MyCol();
		expect(col).toHaveProperty("width").toBe(123);
		expect(col).toHaveProperty("content").asArray().toBeArray(1);
	});

	test("Rendered as row", async (t) => {
		let row = new UIRow();
		t.render(row);
		await t.expectOutputAsync({ type: "row" });
	});

	test("Rendered as column", async (t) => {
		let col = new UIColumn();
		t.render(col);
		await t.expectOutputAsync({ type: "column" });
	});

	test("Rendered as row with content", async (t) => {
		let row = new UIRow(new UILabel("A"), new UILabel("B"));
		t.render(row);
		let labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["A", "B"]);
	});

	test("Rendered as column with content", async (t) => {
		let col = new UIColumn(new UILabel("A"), new UILabel("B"));
		t.render(col);
		let labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["A", "B"]);
	});

	test("Rendered as row with content, reversed", async (t) => {
		let row = new UIRow(new UILabel("A"), new UILabel("B"));
		row.reverse = true;
		t.render(row);
		let labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["B", "A"]);
	});

	test("Rendered as column with content, reversed", async (t) => {
		let col = new UIColumn(new UILabel("A"), new UILabel("B"));
		col.reverse = true;
		t.render(col);
		let labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["B", "A"]);
	});

	test("Rendered as row with content, reversed after rendering", async (t) => {
		let row = new UIRow(new UILabel("A"), new UILabel("B"));
		t.render(row);
		let labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["A", "B"]);
		row.reverse = true;
		labelOut = await t.expectOutputAsync({ type: "label" });
		expect(labelOut.elements.map((out) => out.text)).toBeArray(["B", "A"]);
	});

	test("Rendered with height and width", async (t) => {
		let Preset = ui.row(
			{ height: 123 },
			ui.column({ width: 123 }, ui.label("foo")),
		);
		t.render(new Preset());

		// wait for row > col > label to be rendered
		// and check row height
		let out = await t.expectOutputAsync({ type: "row" });
		expect(out.getSingle().styles).toHaveProperties({ height: 123 });

		// check column width
		out = out.containing({ type: "column" });
		expect(out.getSingle().styles).toHaveProperties({ width: 123 });

		// check if label is there, too
		out.containing({ type: "label" }).getSingle();
	});
});
