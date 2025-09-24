import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UIColumn, UIRow, UIText } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Row view builder with height and content", () => {
	let myRow = UI.Row(UI.Text("foo")).height(123);
	let row = myRow.build();
	expect((row.style as any).height).toBe(123);
	expect(row.content.toArray()).toHaveLength(1);
});

test("Column view builder with width", () => {
	let myCol = UI.Column(UI.Text("foo")).width(123);
	let col = myCol.build();
	expect((col.style as any).width).toBe(123);
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
	let row = new UIRow();
	row.content.add(new UIText("A"), new UIText("B"));
	renderTestView(row);
	let textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
});

test("Rendered as column with content", async () => {
	let col = new UIColumn();
	col.content.add(new UIText("A"), new UIText("B"));
	renderTestView(col);
	let textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
});

test("Rendered as row with content, reversed", async () => {
	let row = new UIRow();
	row.content.add(new UIText("A"), new UIText("B"));
	row.reverse = true;
	renderTestView(row);
	let textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});

test("Rendered as column with content, reversed", async () => {
	let col = new UIColumn();
	col.content.add(new UIText("A"), new UIText("B"));
	col.reverse = true;
	renderTestView(col);
	let textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});

test("Rendered as row with content, reversed after rendering", async () => {
	let row = new UIRow();
	row.content.add(new UIText("A"), new UIText("B"));
	renderTestView(row);
	let textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
	row.reverse = true;
	textOut = await expectOutputAsync({ type: "text" });
	expect(textOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
});
