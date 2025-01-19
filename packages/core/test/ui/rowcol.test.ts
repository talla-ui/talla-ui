import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { ui, UIColumn, UILabel, UIRow } from "../../dist/index.js";

beforeEach(() => {
	useTestContext({ renderFrequency: 5 });
});

test("Row constructor with content", () => {
	let label1 = new UILabel("foo");
	let label2 = new UILabel("bar");
	let row = new UIRow(label1, label2);
	expect(row.content.toArray()).toEqual([label1, label2]);
});

test("Column constructor with content", () => {
	let label1 = new UILabel("foo");
	let label2 = new UILabel("bar");
	let col = new UIColumn(label1, label2);
	expect(col.content.toArray()).toEqual([label1, label2]);
});

test("Row view builder with height and content", () => {
	let myRow = ui.row({ height: 123 }, ui.label("foo"));
	let row = myRow.create();
	expect(row).toHaveProperty("height", 123);
	expect(row.content.toArray()).toHaveLength(1);
});

test("Column view builder with width", () => {
	let myCol = ui.column({ width: 123 }, ui.label("foo"));
	let col = myCol.create();
	expect(col).toHaveProperty("width", 123);
	expect(col.content.toArray()).toHaveLength(1);
});

test("Rendered as row", async () => {
	let row = new UIRow();
	renderTestView(row);
	await expectOutputAsync({ type: "row" });
});

test("Rendered as column", async () => {
	let col = new UIColumn();
	renderTestView(col);
	await expectOutputAsync({ type: "column" });
});

test("Rendered as row with content", async () => {
	let row = new UIRow(new UILabel("A"), new UILabel("B"));
	renderTestView(row);
	let labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
});

test("Rendered as column with content", async () => {
	let col = new UIColumn(new UILabel("A"), new UILabel("B"));
	renderTestView(col);
	let labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
});

test("Rendered as row with content, reversed", async () => {
	let row = new UIRow(new UILabel("A"), new UILabel("B"));
	row.reverse = true;
	renderTestView(row);
	let labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});

test("Rendered as column with content, reversed", async () => {
	let col = new UIColumn(new UILabel("A"), new UILabel("B"));
	col.reverse = true;
	renderTestView(col);
	let labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});

test("Rendered as row with content, reversed after rendering", async () => {
	let row = new UIRow(new UILabel("A"), new UILabel("B"));
	renderTestView(row);
	let labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
	row.reverse = true;
	labelOut = await expectOutputAsync({ type: "label" });
	expect(labelOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});

test("Rendered with height and width", async () => {
	let myRow = ui.row(
		{ height: 123 },
		ui.column({ width: 123 }, ui.label("foo")),
	);
	renderTestView(myRow.create());

	// wait for row > col > label to be rendered
	// and check row height
	let out = await expectOutputAsync({ type: "row" });
	expect(out.getSingle().styles.height).toBe(123);

	// check column width
	out = out.containing({ type: "column" });
	expect(out.getSingle().styles.width).toBe(123);

	// check if label is there, too
	out.containing({ type: "label" }).getSingle();
});
