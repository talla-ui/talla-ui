import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";
import {
	$view,
	ManagedObject,
	UICell,
	ViewComposite,
	ui,
} from "../../../dist/index.js";

describe("UIConditionalView", () => {
	test("Set state directly", () => {
		let myConditional = ui.conditional({}, ui.cell());
		let cond = myConditional.create();
		expect(cond.body).toBeUndefined();
		cond.state = true;
		expect(cond.body).toBeInstanceOf(UICell);
		expect(ManagedObject.whence(cond.body)).toBe(cond);
	});

	test("Events are propagated", async (t) => {
		let myCell = ui.cell(
			ui.conditional(
				{ state: true },
				ui.button("Click me", { onClick: "ButtonClick" }),
			),
		);

		// create instance and listen for events on cell
		let cell = myCell.create();
		cell.listen((e) => {
			if (e.name === "ButtonClick") t.count("click");
		});
		t.render(cell);
		let expectButton = await t.expectOutputAsync({ type: "button" });

		t.log("Clicking button");
		expectButton.getSingle().click();
		t.expectCount("click").toBe(1);
	});

	test("Rendering content using bound state", async (t) => {
		const MyViewComposite = ViewComposite.define(
			{ condition: false },
			ui.cell(
				ui.conditional(
					{ state: $view.boolean("condition") },
					// label should only be rendered when condition is true
					ui.label("foo"),
				),
			),
		);
		const myViewComposite = ui.use(MyViewComposite, { condition: false });

		t.log("Creating view");
		useTestContext({ renderFrequency: 5 });
		let myView = myViewComposite.create();

		t.log("Rendering view");
		t.render(myView);

		// after rendering, there should be a cell but no label
		t.log("Checking for cell but no label");
		let expectCell = await t.expectOutputAsync({ type: "cell" });
		expectCell.containing({ text: "foo" }).toBeEmpty();

		// when condition becomes true, label should be rendered
		t.log("Setting state to true");
		myView.condition = true;
		await t.expectOutputAsync({ text: "foo" });

		// when condition becomes false, label should be removed
		t.log("Setting state to false");
		myView.condition = false;
		expectCell = await t.expectOutputAsync({ type: "cell" });
		expectCell.containing({ text: "foo" }).toBeEmpty();
	});
});
