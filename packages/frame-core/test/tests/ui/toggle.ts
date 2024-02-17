import { UIToggle, UIFormContext, app, strf } from "../../../dist/index.js";
import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";

describe("UIToggle", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor with label", () => {
		let tf = new UIToggle("foo");
		expect(tf).toHaveProperty("label").toBe("foo");
	});

	test("Preset with properties", () => {
		let MyToggle = UIToggle.with({ label: "foo", state: true });
		let toggle = new MyToggle();
		expect(toggle).toHaveProperty("label").toBe("foo");
		expect(toggle).toHaveProperty("state").toBe(true);
	});

	test("Preset using form field and form context", () => {
		let MyToggle = UIToggle.with({ formField: "foo", label: strf("Foo") });
		let toggle = new MyToggle();
		expect(toggle).toHaveProperty("formField").toBe("foo");
		expect(toggle).toHaveProperty("label").asString().toBe("Foo");
		let formCtx = new UIFormContext({ foo: false });
		toggle.formContext = formCtx;
		formCtx.set("foo", true);
		expect(toggle).toHaveProperty("state").toBe(true);
	});

	test("Rendered with label", async (t) => {
		app.showPage(new UIToggle("foo", true));
		await t.expectOutputAsync(100, {
			text: "foo",
			checked: true,
		});
	});

	test("User input, directly setting checked value", async (t) => {
		let toggle = new UIToggle();
		app.showPage(toggle);
		let toggleElt = (
			await t.expectOutputAsync(100, { type: "toggle" })
		).getSingle();
		toggleElt.checked = true;
		toggleElt.sendPlatformEvent("change");
		expect(toggle.state).toBe(true);
	});

	test("User input with form context", async (t) => {
		let toggle = new UIToggle();

		// use form context to check toggle
		let formCtx = new UIFormContext({ foo: true });
		toggle.formField = "foo";
		toggle.formContext = formCtx;
		expect(toggle.state).toBe(true);

		// render field, check that checkbox is checked
		t.log("Rendering with state");
		app.showPage(toggle);
		let toggleElt = (
			await t.expectOutputAsync(100, { type: "toggle" })
		).getSingle();
		expect(toggleElt.checked).toBe(true);

		// simulate input, check value in form context
		t.log("Updating element to set form context");
		toggleElt.checked = false;
		toggleElt.sendPlatformEvent("change");
		expect(formCtx.get("foo")).toBe(false);
	});
});
