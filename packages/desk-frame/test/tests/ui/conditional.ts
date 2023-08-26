import {
	app,
	bound,
	ManagedObject,
	UICell,
	UIConditional,
	UILabel,
	View,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UIConditional", () => {
	test("Set state directly", () => {
		let MyConditional = UIConditional.with({}, UICell);
		let cond = new MyConditional();
		expect(cond.body).toBeUndefined();
		cond.state = true;
		expect(cond.body).toBeInstanceOf(UICell);
		expect(ManagedObject.whence(cond.body)).toBe(cond);
	});

	test("Rendering content using bound state", async (t) => {
		const MyView = View.compose<{ condition: boolean }>(() =>
			UICell.with(
				UIConditional.with(
					{
						state: bound("condition"),
					},
					// label should only be rendered when condition is true
					UILabel.withText("foo")
				)
			)
		).with({ condition: false });

		t.log("Creating view");
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		let view = new MyView();

		t.log("Rendering view");
		app.render(view);

		// after rendering, there should be a cell but no label
		t.log("Checking for cell but no label");
		let expectCell = await t.expectOutputAsync(500, {
			type: "cell",
		});
		expectCell.containing({ text: "foo" }).toBeEmpty();

		// when condition becomes true, label should be rendered
		t.log("Setting state to true");
		view.condition = true;
		await t.expectOutputAsync(500, { text: "foo" });

		// when condition becomes false, label should be removed
		t.log("Setting state to false");
		view.condition = false;
		expectCell = await t.expectOutputAsync(500, { type: "cell" });
		expectCell.containing({ text: "foo" }).toBeEmpty();
	});
});
