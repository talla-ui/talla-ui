import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	$view,
	ManagedObject,
	UICell,
	ViewComposite,
	ui,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Set state directly", () => {
	let myConditional = ui.conditional({}, ui.cell());
	let cond = myConditional.create();
	expect(cond.body).toBeUndefined();
	cond.state = true;
	expect(cond.body).toBeInstanceOf(UICell);
	expect(ManagedObject.whence(cond.body)).toBe(cond);
});

test("Events are propagated", async () => {
	let myCell = ui.cell(
		ui.conditional(
			{ state: true },
			ui.button("Click me", { onClick: "ButtonClick" }),
		),
	);

	// create instance and listen for events on cell
	let count = 0;
	let cell = myCell.create();
	cell.listen((e) => {
		if (e.name === "ButtonClick") count++;
	});
	renderTestView(cell);
	let expectButton = await expectOutputAsync({ type: "button" });

	console.log("Clicking button");
	expectButton.getSingle().click();
	expect(count).toBe(1);
});

test("Rendering content using bound state", async () => {
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

	console.log("Creating view");
	useTestContext();
	let myView = myViewComposite.create();

	console.log("Rendering view");
	renderTestView(myView);

	// after rendering, there should be a cell but no label
	console.log("Checking for cell but no label");
	let expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();

	// when condition becomes true, label should be rendered
	console.log("Setting state to true");
	myView.condition = true;
	await expectOutputAsync({ text: "foo" });

	// when condition becomes false, label should be removed
	console.log("Setting state to false");
	myView.condition = false;
	expectCell = await expectOutputAsync({ type: "cell" });
	expectCell.containing({ text: "foo" }).toBeEmpty();
});
