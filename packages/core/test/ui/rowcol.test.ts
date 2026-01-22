import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, describe, expect, test } from "vitest";
import { UI, UIColumn, UIRow, UIText } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

describe("UIRow", () => {
	test("View builder with height and content", () => {
		let myRow = UI.Row(UI.Text("foo")).height(123);
		let row = myRow.build();
		expect((row.style as any).height).toBe(123);
		expect(row.content.toArray()).toHaveLength(1);
	});

	test("Rendered as row", async () => {
		let row = new UIRow();
		renderTestView(row);
		await expectOutputAsync({ type: "row" });
	});

	test("Rendered as row with content", async () => {
		let row = new UIRow();
		row.content.add(new UIText("A"), new UIText("B"));
		renderTestView(row);
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
});

describe("UIColumn", () => {
	test("Constructor with content", () => {
		let text1 = new UIText("foo");
		let text2 = new UIText("bar");
		let column = new UIColumn();
		column.content.add(text1, text2);
		expect(column.content.toArray()).toEqual([text1, text2]);
		expect(column.findViewContent(UIText)).toHaveLength(2);
	});

	test("View builder with width", () => {
		let myCol = UI.Column(UI.Text("foo")).width(123);
		let col = myCol.build();
		expect((col.style as any).width).toBe(123);
		expect(col.content.toArray()).toHaveLength(1);
	});

	test("Rendered as column", async () => {
		let col = new UIColumn();
		renderTestView(col);
		await expectOutputAsync({ type: "column" });
	});

	test("Rendered as column with content", async () => {
		let col = new UIColumn();
		col.content.add(new UIText("A"), new UIText("B"));
		renderTestView(col);
		let textOut = await expectOutputAsync({ type: "text" });
		expect(textOut.elements.map((out) => out.text)).toEqual(["A", "B"]);
	});

	test("Rendered as column with content, reversed", async () => {
		let col = new UIColumn();
		col.content.add(new UIText("A"), new UIText("B"));
		col.reverse = true;
		renderTestView(col);
		let textOut = await expectOutputAsync({ type: "text" });
		expect(textOut.elements.map((out) => out.text)).toEqual(["B", "A"]);
	});

	test("Rendered with content and layout", async () => {
		let myColumn = UI.Column(UI.Text("foo")).layout({ gravity: "end" });
		renderTestView(myColumn.build());
		let out = await expectOutputAsync({
			type: "column",
			layout: { gravity: "end" },
		});
		out.containing({ type: "text", text: "foo" }).toBeRendered();
	});

	test("Rendered with style", async () => {
		let myColumn = UI.Column(UI.Text("foo"))
			.padding(16)
			.border(1, "green")
			.layout({ distribution: "start" });
		renderTestView(myColumn.build());
		await expectOutputAsync({
			type: "column",
			layout: { distribution: "start" },
			style: {
				padding: 16,
				borderColor: UI.colors.green,
				borderWidth: 1,
			},
		});
	});

	test("Rendered, then update content", async () => {
		let column = new UIColumn();
		column.content.add(new UIText("foo"), new UIText("bar"));
		renderTestView(column);
		await expectOutputAsync({ type: "column" });
		column.content.add(new UIText("baz"));
		let out = await expectOutputAsync({ type: "column" });
		out.containing({ type: "text", text: "foo" }).toBeRendered();
		out.containing({ type: "text", text: "bar" }).toBeRendered();
		out.containing({ type: "text", text: "baz" }).toBeRendered();
		column.content.clear();
		out = await expectOutputAsync({ type: "column" });
		out.containing({ type: "text" }).toBeEmpty();
	});

	test("Move content between containers", async () => {
		let text1 = new UIText("foo");
		let text2 = new UIText("bar");
		let column1 = new UIColumn();
		column1.content.add(text1, text2);
		let column2 = new UIColumn();

		// render column 1 with text first
		let container = new UIColumn();
		container.content.add(column1, column2);
		renderTestView(container);
		let out1 = await expectOutputAsync({ source: column1 }, { text: "foo" });
		let uid = out1.getSingle().uid;

		// now move text 1 to column 2 and watch the output
		column2.content.add(text1);
		let out2 = await expectOutputAsync({ source: column2 }, { text: "foo" });

		expect(out2.getSingle().uid).toBe(uid);
	});

	test("Column with style name", async () => {
		let myColumn = UI.Column().style("card");
		let column = myColumn.build();
		expect(column.styleName).toBe("card");

		renderTestView(column);
		await expectOutputAsync({
			type: "column",
			styleName: "card",
		});
	});

	test("Column with style overrides object", async () => {
		let myColumn = UI.Column().style({
			background: UI.colors.background,
			padding: 16,
		});
		let column = myColumn.build();
		expect(column.style?.background).toBe(UI.colors.background);
		expect(column.style?.padding).toBe(16);

		renderTestView(column);
		await expectOutputAsync({
			type: "column",
			style: { background: UI.colors.background, padding: 16 },
		});
	});

	test("Column with style name and additional overrides", async () => {
		let myColumn = UI.Column()
			.style("card")
			.background("accent")
			.borderRadius(8)
			.dropShadow(4);

		let column = myColumn.build();
		expect(column.styleName).toBe("card");
		expect(column.style?.background).toBe(UI.colors.accent);
		expect(column.style?.borderRadius).toBe(8);
		expect(column.style?.dropShadow).toBe(4);
	});
});

describe("View builder patterns", () => {
	test("View builder with method call", () => {
		let myColumn = UI.Column().hideWhen(true);
		let column = myColumn.build();
		expect(column.hidden).toBe(true);
	});

	test("View builder with apply call, undefined", () => {
		let myColumn = UI.Column().apply(undefined).bg("red");
		let column = myColumn.build();
		expect(column).toBeInstanceOf(UIColumn);
	});

	test("View builder with apply call", () => {
		let myColumn = UI.Column().apply((b) => b.hideWhen(true));
		let column = myColumn.build();
		expect(column.hidden).toBe(true);
	});

	test("View builder with content", () => {
		let myColumn = UI.Column(UI.Text("foo")).hideWhen(true);
		let column = myColumn.build();
		expect(column.hidden).toBe(true);
		expect(column.content.toArray()).toHaveLength(1);
		let text = column.content.first() as UIText;
		expect(text.text).toBe("foo");
	});

	test("View builder with extend adds custom methods", () => {
		function Card() {
			return UI.Column().extend({
				highlight() {
					this.background("accent");
					return this;
				},
			});
		}
		let column = Card().highlight().build();
		expect(column.style?.background).toBe(UI.colors.accent);
	});

	test("View builder with extend and defer finalizes closure variables", () => {
		function Card() {
			let content: string = "";
			return UI.Column()
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
		let column = Card().content("Hello").build();
		expect(column.style?.padding).toBe(16);
		expect(column.content.toArray()).toHaveLength(1);
		let text = column.content.first() as UIText;
		expect(text.text).toBe("Hello");
	});

	test("View builder extend defer runs once per builder", () => {
		let deferCount = 0;
		function Card() {
			return UI.Column().extend({}, () => {
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
});
