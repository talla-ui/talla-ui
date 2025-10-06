import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UICell, UIColor, UIText } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with content", () => {
	let text1 = new UIText("foo");
	let text2 = new UIText("bar");
	let cell = new UICell();
	cell.content.add(text1, text2);
	expect(cell.content.toArray()).toEqual([text1, text2]);
	expect(cell.findViewContent(UIText)).toHaveLength(2);
});

test("View builder with method call", () => {
	let myCell = UI.Cell().hideWhen(true);
	let cell = myCell.build();
	expect(cell.hidden).toBe(true);
});

test("View builder with apply call", () => {
	let myCell = UI.Cell().apply((b) => b.hideWhen(true));
	let cell = myCell.build();
	expect(cell.hidden).toBe(true);
});

test("View builder with allowKeyboardFocus", () => {
	let myCell = UI.Cell().allowKeyboardFocus();
	let cell = myCell.build();
	expect(cell.allowFocus).toBe(true);
	expect(cell.allowKeyboardFocus).toBe(true);
});

test("View builder with content", () => {
	let myCell = UI.Cell(UI.Text("foo")).hideWhen(true);
	let cell = myCell.build();
	expect(cell.hidden).toBe(true);
	expect(cell.content.toArray()).toHaveLength(1);
	let text = cell.content.first() as UIText;
	expect(text.text).toBe("foo");
});

test("Rendered as cell", async () => {
	let cell = new UICell();
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
});

test("Rendered with content and layout", async () => {
	let myCell = UI.Cell(UI.Text("foo")).layout({ gravity: "end" });
	renderTestView(myCell.build());
	let out = await expectOutputAsync({
		type: "cell",
		styles: { gravity: "end" },
	});
	out.containing({ type: "text", text: "foo" }).toBeRendered();
});

test("Rendered with style", async () => {
	let myCell = UI.Cell(UI.Text("foo"))
		.padding(16)
		.border(1, "green")
		.layout({ distribution: "start" });
	renderTestView(myCell.build());
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
	cell.content.add(new UIText("foo"), new UIText("bar"));
	renderTestView(cell);
	await expectOutputAsync({ type: "cell" });
	cell.content.add(new UIText("baz"));
	let out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "text", text: "foo" }).toBeRendered();
	out.containing({ type: "text", text: "bar" }).toBeRendered();
	out.containing({ type: "text", text: "baz" }).toBeRendered();
	cell.content.clear();
	out = await expectOutputAsync({ type: "cell" });
	out.containing({ type: "text" }).toBeEmpty();
});

test("Move content between cells", async () => {
	let text1 = new UIText("foo");
	let text2 = new UIText("bar");
	let cell1 = new UICell();
	cell1.content.add(text1, text2);
	let cell2 = new UICell();

	// render cell 1 with text first
	let container = new UICell();
	container.content.add(cell1, cell2);
	renderTestView(container);
	let out1 = await expectOutputAsync({ source: cell1 }, { text: "foo" });
	let uid = out1.getSingle().uid;

	// now move text 1 to text 2 and watch the output
	cell2.content.add(text1);
	let out2 = await expectOutputAsync({ source: cell2 }, { text: "foo" });

	expect(out2.getSingle().uid).toBe(uid);
});
