import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { UI, UICell, UIText } from "../../dist/index.js";

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

test("View builder with apply call, undefined", () => {
	let myCell = UI.Cell().apply(undefined).bg("red");
	let cell = myCell.build();
	expect(cell).toBeInstanceOf(UICell);
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
		layout: { gravity: "end" },
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
		layout: { distribution: "start" },
		style: {
			padding: 16,
			borderColor: UI.colors.green,
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

test("Cell with style name", async () => {
	let myCell = UI.Cell().style("card");
	let cell = myCell.build();
	expect(cell.styleName).toBe("card");

	renderTestView(cell);
	await expectOutputAsync({
		type: "cell",
		styleName: "card",
	});
});

test("Cell with style overrides object", async () => {
	let myCell = UI.Cell().style({
		background: UI.colors.background,
		padding: 16,
	});
	let cell = myCell.build();
	expect(cell.style?.background).toBe(UI.colors.background);
	expect(cell.style?.padding).toBe(16);

	renderTestView(cell);
	await expectOutputAsync({
		type: "cell",
		style: { background: UI.colors.background, padding: 16 },
	});
});

test("Cell with style name and additional overrides", async () => {
	let myCell = UI.Cell()
		.style("card")
		.background("accent")
		.borderRadius(8)
		.dropShadow(4);

	let cell = myCell.build();
	expect(cell.styleName).toBe("card");
	expect(cell.style?.background).toBe(UI.colors.accent);
	expect(cell.style?.borderRadius).toBe(8);
	expect(cell.style?.dropShadow).toBe(4);
});

test("isHovered() returns false when not rendered", () => {
	let cell = UI.Cell().build();
	expect(cell.isHovered()).toBe(false);
});

test("isHovered() returns true after mouseenter", async () => {
	let cell = UI.Cell().build();
	renderTestView(cell);
	let out = await expectOutputAsync({ type: "cell" });

	// Initially not hovered
	expect(cell.isHovered()).toBe(false);

	// Simulate mouseenter
	out.getSingle().sendPlatformEvent("mouseenter");
	expect(cell.isHovered()).toBe(true);
});

test("isHovered() returns false after mouseleave", async () => {
	let cell = UI.Cell().build();
	renderTestView(cell);
	let out = await expectOutputAsync({ type: "cell" });

	// Simulate mouseenter then mouseleave
	out.getSingle().sendPlatformEvent("mouseenter");
	expect(cell.isHovered()).toBe(true);

	out.getSingle().sendPlatformEvent("mouseleave");
	expect(cell.isHovered()).toBe(false);
});

test("View builder with extend adds custom methods", () => {
	function Card() {
		return UI.Cell().extend({
			highlight() {
				this.background("accent");
				return this;
			},
		});
	}
	let cell = Card().highlight().build();
	expect(cell.style?.background).toBe(UI.colors.accent);
});

test("View builder with extend and defer finalizes closure variables", () => {
	function Card() {
		let content: string = "";
		return UI.Cell()
			.padding(16)
			.extend(
				{
					content(text: string) {
						content = text;
						return this;
					},
				},
				(b) => {
					b.with(UI.Text(content));
				},
			);
	}
	let cell = Card().content("Hello").build();
	expect(cell.style?.padding).toBe(16);
	expect(cell.content.toArray()).toHaveLength(1);
	let text = cell.content.first() as UIText;
	expect(text.text).toBe("Hello");
});

test("View builder extend defer runs once per builder", () => {
	let deferCount = 0;
	function Card() {
		return UI.Cell().extend({}, () => {
			deferCount++;
		});
	}
	let builder = Card();
	expect(deferCount).toBe(0);
	builder.build();
	expect(deferCount).toBe(1);
	builder.build();
	expect(deferCount).toBe(1);
});
