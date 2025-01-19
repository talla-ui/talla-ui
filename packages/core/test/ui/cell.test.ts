import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UICell, UILabel, ui } from "../../dist/index.js";

beforeEach(() => {
	useTestContext({ renderFrequency: 5 });
});

test("Constructor with content", () => {
	let label1 = new UILabel("foo");
	let label2 = new UILabel("bar");
	let cell = new UICell(label1, label2);
	expect(cell.content.toArray()).toEqual([label1, label2]);
	expect(cell.findViewContent(UILabel)).toHaveLength(2);
});

test("View builder with properties", () => {
	let myCell = ui.cell({ hidden: true });
	let cell = myCell.create();
	expect(cell.hidden).toBe(true);
});

test("View builder animation cell with properties", () => {
	let myCell = ui.animatedCell({
		hidden: true,
		animationDuration: 200,
		animationTiming: "ease",
	});
	let cell = myCell.create();
	expect(cell.animationDuration).toBe(200);
	expect(cell.animationTiming).toBe("ease");
});

test("View builder with allowKeyboardFocus", () => {
	let myCell = ui.cell({ allowKeyboardFocus: true });
	let cell = myCell.create();
	expect(cell.allowFocus).toBe(true);
	expect(cell.allowKeyboardFocus).toBe(true);
});

test("View builder with content", () => {
	let myCell = ui.cell({ hidden: true }, ui.label("foo"));
	let cell = myCell.create();
	expect(cell.hidden).toBe(true);
	expect(cell.content.toArray()).toHaveLength(1);
	let label = cell.content.first() as UILabel;
	expect(label.text).toBe("foo");
});

test("Rendered as cell", async () => {
	let cell = new UICell();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
});

test("Rendered as animated cell", async () => {
	let myCell = ui.animatedCell(ui.label("foo"), ui.label("bar"));
	renderTestView(myCell.create());
	await expectOutputAsync({ text: "bar" });
});

test("Rendered with content", async () => {
	let myCell = ui.cell({ layout: { gravity: "end" } }, ui.label("foo"));
	renderTestView(myCell.create());
	let out = await expectOutputAsync({
		type: "cell",
		styles: { gravity: "end" },
	});
	out.containing({ type: "label", text: "foo" }).toBeRendered();
});

test("Rendered with style", async () => {
	let myCell = ui.cell(
		{
			padding: 16,
			style: { borderColor: ui.color.GREEN, borderThickness: 1 },
			layout: { distribution: "start" },
		},
		ui.label("foo"),
	);
	renderTestView(myCell.create());
	await expectOutputAsync({
		type: "cell",
		styles: {
			distribution: "start",
			padding: 16,
			borderColor: ui.color.GREEN,
			borderThickness: 1,
		},
	});
});

test("Rendered, then update style", async () => {
	let cell = new UICell();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.borderRadius = 8;
	cell.layout = { distribution: "start" };
	await expectOutputAsync({
		styles: {
			borderRadius: 8,
			distribution: "start",
		},
	});
});

test("Rendered, then update content", async () => {
	let cell = new UICell(new UILabel("foo"), new UILabel("bar"));
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.content.add(new UILabel("baz"));
	let out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "label", text: "foo" }).toBeRendered();
	out.containing({ type: "label", text: "bar" }).toBeRendered();
	out.containing({ type: "label", text: "baz" }).toBeRendered();
	cell.content.clear();
	out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "label" }).toBeEmpty();
});

test("Move content between cells", async () => {
	let label1 = new UILabel("foo");
	let label2 = new UILabel("bar");
	let cell1 = new UICell(label1, label2);
	let cell2 = new UICell();

	// render cell 1 with labels first
	renderTestView(new UICell(cell1, cell2));
	let out1 = await expectOutputAsync({ source: cell1 }, { text: "foo" });
	let uid = out1.getSingle().uid;

	// now move label 1 to cell 2 and watch the output
	cell2.content.add(label1);
	let out2 = await expectOutputAsync({ source: cell2 }, { text: "foo" });

	expect(out2.getSingle().uid).toBe(uid);
});
