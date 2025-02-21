import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	FormContext,
	ObservedObject,
	strf,
	ui,
	UIToggle,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with label", () => {
	let tf = new UIToggle("foo");
	expect(tf).toHaveProperty("label", "foo");
});

test("View builder with properties", () => {
	let myToggle = ui.toggle({ label: "foo", state: true });
	let toggle = myToggle.create();
	expect(toggle).toHaveProperty("label", "foo");
	expect(toggle).toHaveProperty("state", true);
});

test("View builder using form field", () => {
	let myToggle = ui.toggle({ formField: "foo", label: strf("Foo") });
	let toggle = myToggle.create();
	expect(toggle).toHaveProperty("formField", "foo");
	expect(toggle.label?.toString()).toBe("Foo");
});

test("Rendered with label", async () => {
	renderTestView(new UIToggle("foo", true));
	await expectOutputAsync({
		text: "foo",
		checked: true,
	});
});

test("User input, directly setting checked value", async () => {
	let toggle = new UIToggle();
	renderTestView(toggle);
	let toggleElt = (await expectOutputAsync({ type: "toggle" })).getSingle();
	toggleElt.checked = true;
	toggleElt.sendPlatformEvent("change");
	expect(toggle.state).toBe(true);
});

test("User input with form context", async () => {
	class Host extends ObservedObject {
		// note that formContext must exist before it can be bound
		readonly formContext = new FormContext().set("foo", true);
		readonly toggle = this.attach(new UIToggle());
	}
	let host = new Host();
	let toggle = host.toggle;

	// use form context to check toggle
	toggle.formField = "foo";
	expect(toggle.state).toBe(true);

	// render field, check that checkbox is checked
	console.log("Rendering with state");
	renderTestView(toggle);
	let toggleElt = (await expectOutputAsync({ type: "toggle" })).getSingle();
	expect(toggleElt.checked).toBe(true);

	// simulate input, check value in form context
	console.log("Updating element to set form context");
	toggleElt.checked = false;
	toggleElt.sendPlatformEvent("change");
	expect(host.formContext.values.foo).toBe(false);
});
