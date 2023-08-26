import {
	app,
	UIButton,
	UICell,
	UISelectionController,
	PageViewActivity,
	UIPrimaryButton,
	UIBorderlessButton,
	UIOutlineButton,
	UILinkButton,
	UIIconButton,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("UIButton", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
			options.pathDelay = 0;
		});
	});

	test("Constructor with label", () => {
		let button = new UIButton("foo");
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Sub type constructors", () => {
		let buttons = [
			new UIPrimaryButton("foo"),
			new UIBorderlessButton("foo"),
			new UIOutlineButton("foo"),
			new UILinkButton("foo"),
			new UIIconButton("foo"),
		];
		let styleNames = buttons.map((b) => b.style.name);
		[
			"@PrimaryButton",
			"@BorderlessButton",
			"@OutlineButton",
			"@LinkButton",
			"@IconButton",
		].forEach((id, i) => expect(styleNames[i]).toMatchRegExp(new RegExp(id)));
	});

	test("Preset with properties", () => {
		let MyButton = UIButton.with({ label: "foo" });
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
		expect(button.disableKeyboardFocus).toBeFalsy();
	});

	test("Preset using withLabel", () => {
		let MyButton = UIButton.withLabel("foo");
		let button = new MyButton();
		expect(button).toHaveProperty("label").asString().toBe("foo");
	});

	test("Preset using withIcon", () => {
		let MyButton = UIButton.withIcon("@foo");
		let button = new MyButton();
		expect(button).toHaveProperty("icon").asString().toBe("@foo");
	});

	test("Rendered with label", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			accessibleLabel: "My button",
		});
		app.render(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			accessibleLabel: "My button",
		});
	});

	test("Rendered with styles", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			decoration: { borderColor: "@Orange" },
			textStyle: { bold: true },
		});
		app.render(new MyButton());
		await t.expectOutputAsync(100, {
			text: "foo",
			style: {
				decoration: { borderColor: "@Orange" },
				textStyle: { bold: true },
			},
		});
	});

	test("Click event propagation", async (t) => {
		class MyActivity extends PageViewActivity {
			static override ViewBody = UICell.with(
				UIButton.withLabel("Button", "ButtonClicked")
			);
			onButtonClicked() {
				t.count("clicked");
			}
		}
		app.addActivity(new MyActivity(), true);
		let out = await t.expectOutputAsync(100, { text: "Button" });
		out.getSingle().click();
		t.expectCount("clicked").toBe(1);
	});

	test("Button navigation with navigateTo", async (t) => {
		let MyButton = UIButton.with({
			label: "foo",
			navigateTo: "/foo",
		});
		class MyActivity extends PageViewActivity {
			static override ViewBody = MyButton;
		}
		app.addActivity(new MyActivity(), true);
		let elt = (await t.expectOutputAsync(100, { text: "foo" })).getSingle();
		elt.click();
		await t.sleep(2);
		expect(app.getPath()).toBe("foo");
	});

	test("Button selection in selection group", async (t) => {
		let Preset = UISelectionController.with(
			UICell.with(
				UIButton.with({ label: "one", onClick: "Select" }),
				UIButton.with({ label: "two", onClick: "Select" })
			)
		);

		t.log("Rendering view");
		app.render(new Preset());
		let buttonOneElt = (
			await t.expectOutputAsync(100, {
				text: "one",
			})
		).getSingle();

		t.log("Clicking button one");
		buttonOneElt.click();
		await t.expectOutputAsync(100, { element: buttonOneElt, selected: true });
		expect(buttonOneElt.output!.source).toHaveProperty("selected").toBe(true);

		t.log("Clicking button two");
		let buttonTwoElt = (
			await t.expectOutputAsync(100, {
				text: "two",
			})
		).getSingle();
		buttonTwoElt.click();
		await t.expectOutputAsync(100, { element: buttonTwoElt, selected: true });
		expect(buttonTwoElt.output!.source).toHaveProperty("selected").toBe(true);

		t.log("Expecting first button to be deselected");
		await t.expectOutputAsync(100, { element: buttonOneElt, selected: false });
		expect(buttonOneElt.output!.source).toHaveProperty("selected").toBe(false);

		t.log("Deselecting button two");
		buttonTwoElt.output!.source.emit("Deselect");

		t.log("Expecting second button to be deselected");
		await t.expectOutputAsync(100, { element: buttonTwoElt, selected: false });
		expect(buttonTwoElt.output!.source).toHaveProperty("selected").toBe(false);
	});
});
