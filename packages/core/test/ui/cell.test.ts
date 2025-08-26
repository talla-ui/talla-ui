import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UICell, UILabel, UI, UIColor } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with content", () => {
	let label1 = new UILabel("foo");
	let label2 = new UILabel("bar");
	let cell = new UICell();
	cell.content.add(label1, label2);
	expect(cell.content.toArray()).toEqual([label1, label2]);
	expect(cell.findViewContent(UILabel)).toHaveLength(2);
});

test("View builder with properties", () => {
	let myCell = UI.Cell().hideWhen(true);
	let cell = myCell.create();
	expect(cell.hidden).toBe(true);
});

test("View builder with allowKeyboardFocus", () => {
	let myCell = UI.Cell().allowKeyboardFocus();
	let cell = myCell.create();
	expect(cell.allowFocus).toBe(true);
	expect(cell.allowKeyboardFocus).toBe(true);
});

test("View builder with content", () => {
	let myCell = UI.Cell(UI.Label("foo")).hideWhen(true);
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

test("Rendered with content and layout", async () => {
	let myCell = UI.Cell(UI.Label("foo")).layout({ gravity: "end" });
	renderTestView(myCell.create());
	let out = await expectOutputAsync({
		type: "cell",
		styles: { gravity: "end" },
	});
	out.containing({ type: "label", text: "foo" }).toBeRendered();
});

test("Rendered with style", async () => {
	let myCell = UI.Cell(UI.Label("foo"))
		.padding(16)
		.border(1, "green")
		.layout({ distribution: "start" });
	renderTestView(myCell.create());
	await expectOutputAsync({
		type: "cell",
		styles: {
			distribution: "start",
			padding: 16,
			borderColor: UIColor.theme.ref("green"),
			borderWidth: 1,
		},
	});
});

test("Rendered, then update content", async () => {
	let cell = new UICell();
	cell.content.add(new UILabel("foo"), new UILabel("bar"));
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
	let cell1 = new UICell();
	cell1.content.add(label1, label2);
	let cell2 = new UICell();

	// render cell 1 with labels first
	let container = new UICell();
	container.content.add(cell1, cell2);
	renderTestView(container);
	let out1 = await expectOutputAsync({ source: cell1 }, { text: "foo" });
	let uid = out1.getSingle().uid;

	// now move label 1 to cell 2 and watch the output
	cell2.content.add(label1);
	let out2 = await expectOutputAsync({ source: cell2 }, { text: "foo" });

	expect(out2.getSingle().uid).toBe(uid);
});
