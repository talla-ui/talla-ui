import {
	app,
	UIColumn,
	UILabel,
	UIRow,
	UIOppositeRow,
	UICenterRow,
} from "../../../dist/index.js";
import { describe, test, expect, useTestContext } from "@desk-framework/test";

describe("UIRow and UIColumn", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Row constructor with content", () => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let row = new UIRow(label1, label2);
		expect(row).toHaveProperty("content").asArray().toBeArray([label1, label2]);
	});

	test("Row sub type constructors", () => {
		let opp = new UIOppositeRow(new UILabel("foo"));
		expect(opp.distribution).toBe("end");
		let ctr = new UICenterRow(new UILabel("foo"));
		expect(ctr.distribution).toBe("center");
	});

	test("Column constructor with content", () => {
		let label1 = new UILabel("foo");
		let label2 = new UILabel("bar");
		let col = new UIColumn(label1, label2);
		expect(col).toHaveProperty("content").asArray().toBeArray([label1, label2]);
	});

	test("Row preset with height and content", () => {
		let MyRow = UIRow.with({ height: 123 }, UILabel);
		let row = new MyRow();
		expect(row).toHaveProperty("height").toBe(123);
		expect(row).toHaveProperty("content").asArray().toBeArray(1);
	});

	test("Column preset with width", () => {
		let MyCol = UIColumn.with({ width: 123 }, UILabel);
		let col = new MyCol();
		expect(col).toHaveProperty("width").toBe(123);
		expect(col).toHaveProperty("content").asArray().toBeArray(1);
	});

	test("Rendered as row", async (t) => {
		let row = new UIRow();
		app.render(row);
		await t.expectOutputAsync(100, { type: "row" });
	});

	test("Rendered as column", async (t) => {
		let col = new UIColumn();
		app.render(col);
		await t.expectOutputAsync(100, { type: "column" });
	});

	test("Rendered with height and width", async (t) => {
		let Preset = UIRow.with(
			{ height: 123 },
			UIColumn.with({ width: 123 }, UILabel.withText("foo")),
		);
		app.render(new Preset());

		// wait for row > col > label to be rendered
		// and check row height
		let out = await t.expectOutputAsync(100, { type: "row" });
		let hasHeight = out.getSingle().matchStyle({ dimensions: { height: 123 } });
		if (!hasHeight) t.fail("Height mismatch");

		// check column width
		out = out.containing({ type: "column" });
		let hasWidth = out.getSingle().matchStyle({ dimensions: { width: 123 } });
		if (!hasWidth) t.fail("Width mismatch");

		// check if label is there, too
		out.containing({ type: "label" }).getSingle();
	});
});
