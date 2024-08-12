import {
	UIToggle,
	UIFormContext,
	strf,
	ui,
	ManagedObject,
} from "../../../dist/index.js";
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
		let MyToggle = ui.toggle({ label: "foo", state: true });
		let toggle = new MyToggle();
		expect(toggle).toHaveProperty("label").toBe("foo");
		expect(toggle).toHaveProperty("state").toBe(true);
	});

	test("Preset using form field", () => {
		let MyToggle = ui.toggle({ formField: "foo", label: strf("Foo") });
		let toggle = new MyToggle();
		expect(toggle).toHaveProperty("formField").toBe("foo");
		expect(toggle).toHaveProperty("label").asString().toBe("Foo");
	});

	test("Rendered with label", async (t) => {
		t.render(new UIToggle("foo", true));
		await t.expectOutputAsync(100, {
			text: "foo",
			checked: true,
		});
	});

	test("User input, directly setting checked value", async (t) => {
		let toggle = new UIToggle();
		t.render(toggle);
		let toggleElt = (
			await t.expectOutputAsync(100, { type: "toggle" })
		).getSingle();
		toggleElt.checked = true;
		toggleElt.sendPlatformEvent("change");
		expect(toggle.state).toBe(true);
	});

	test("User input with form context", async (t) => {
		class Host extends ManagedObject {
			// note that formContext must exist before it can be bound
			readonly formContext = new UIFormContext().set("foo", true);
			readonly toggle = this.attach(new UIToggle());
		}
		let host = new Host();
		let toggle = host.toggle;

		// use form context to check toggle
		toggle.formField = "foo";
		expect(toggle.state).toBe(true);

		// render field, check that checkbox is checked
		t.log("Rendering with state");
		t.render(toggle);
		let toggleElt = (
			await t.expectOutputAsync(100, { type: "toggle" })
		).getSingle();
		expect(toggleElt.checked).toBe(true);

		// simulate input, check value in form context
		t.log("Updating element to set form context");
		toggleElt.checked = false;
		toggleElt.sendPlatformEvent("change");
		expect(host.formContext.values.foo).toBe(false);
	});
});
