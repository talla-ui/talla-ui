import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	FormContext,
	ObservableObject,
	UI,
	UIToggle,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with label", () => {
	let tf = new UIToggle("foo");
	expect(tf).toHaveProperty("label", "foo");
});

test("Constructor with label and state", () => {
	let tf = new UIToggle("Accept terms", true);
	expect(tf.label).toBe("Accept terms");
	expect(tf.state).toBe(true);
});

test("View builder with properties", () => {
	let myToggle = UI.Toggle("foo").state(true);
	let toggle = myToggle.create();
	expect(toggle).toHaveProperty("label", "foo");
	expect(toggle).toHaveProperty("state", true);
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
	class Host extends ObservableObject {
		// note that form must exist before it can be bound
		readonly form = new FormContext().set("foo", true);
		readonly toggle = this.attach(UI.Toggle().bindFormField("foo").create());
	}
	let host = new Host();
	let toggle = host.toggle;

	// use form context to check toggle
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
	expect(host.form.values.foo).toBe(false);
});
