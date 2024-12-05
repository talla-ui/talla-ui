import { UICell, UILabel, ui } from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

describe("UICell", (scope) => {
	scope.beforeEach(() => {
		useTestContext({ renderFrequency: 5 });
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

	test("View builder with properties", () => {
		let myCell = ui.cell({ hidden: true });
		let cell = myCell.create();
		expect(cell).toHaveProperty("hidden").toBeTruthy();
	});

	test("View builder animation cell with properties", () => {
		let myCell = ui.animatedCell({
			hidden: true,
			animationDuration: 200,
			animationTiming: "ease",
		});
		let cell = myCell.create();
		expect(cell).toHaveProperty("animationDuration").toBe(200);
		expect(cell).toHaveProperty("animationTiming").toBe("ease");
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
		expect(cell).toHaveProperty("hidden").toBeTruthy();
		expect(cell).toHaveProperty("content").asArray().toBeArray(1);
		let label = cell.content.first() as UILabel;
		expect(label).toHaveProperty("text").asString().toBe("foo");
	});

	test("Rendered as cell", async (t) => {
		let cell = new UICell();
		t.render(cell);
		await t.expectOutputAsync({ type: "cell" });
	});

	test("Rendered with content", async (t) => {
		let myCell = ui.cell({ layout: { gravity: "end" } }, ui.label("foo"));
		t.render(myCell.create());
		let out = await t.expectOutputAsync({
			type: "cell",
			styles: { gravity: "end" },
		});
		out.containing({ type: "label", text: "foo" }).toBeRendered();
	});

	test("Rendered with style", async (t) => {
		let myCell = ui.cell(
			{
				padding: 16,
				style: { borderColor: ui.color.GREEN, borderThickness: 1 },
				layout: { distribution: "start" },
			},
			ui.label("foo"),
		);
		t.render(myCell.create());
		await t.expectOutputAsync({
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
		await t.expectOutputAsync({ type: "cell" });
		cell.borderRadius = 8;
		cell.layout = { distribution: "start" };
		await t.expectOutputAsync({
			styles: {
				borderRadius: 8,
				distribution: "start",
			},
		});
	});

	test("Rendered, then update content", async (t) => {
		let cell = new UICell(new UILabel("foo"), new UILabel("bar"));
		t.render(cell);
		await t.expectOutputAsync({ type: "cell" });
		cell.content.add(new UILabel("baz"));
		let out = await t.expectOutputAsync({ type: "cell" });
		out.containing({ type: "label", text: "foo" }).toBeRendered();
		out.containing({ type: "label", text: "bar" }).toBeRendered();
		out.containing({ type: "label", text: "baz" }).toBeRendered();
		cell.content.clear();
		out = await t.expectOutputAsync({ type: "cell" });
		out.containing({ type: "label" }).toBeEmpty();
	});

	test("Move content between cells", async (t) => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let cell1 = new UICell(label1, label2);
		let cell2 = new UICell();

		// render cell 1 with labels first
		t.render(new UICell(cell1, cell2));
		let out1 = await t.expectOutputAsync({ source: cell1 }, { text: "foo" });
		let uid = out1.getSingle().uid;

		// now move label 1 to cell 2 and watch the output
		cell2.content.add(label1);
		let out2 = await t.expectOutputAsync({ source: cell2 }, { text: "foo" });

		expect(out2.getSingle().uid).toBe(uid);
	});
});
