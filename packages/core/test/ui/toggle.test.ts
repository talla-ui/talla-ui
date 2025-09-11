import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import { FormState, ObservableObject, UI, UIToggle } from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor with label", () => {
	let tf = new UIToggle("foo");
	expect(tf).toHaveProperty("label", "foo");
});

test("Constructor with label and value", () => {
	let tf = new UIToggle("Accept terms", true);
	expect(tf.label).toBe("Accept terms");
	expect(tf.value).toBe(true);
});

test("View builder with properties", () => {
	let myToggle = UI.Toggle("foo").value(true);
	let toggle = myToggle.build();
	expect(toggle).toHaveProperty("label", "foo");
	expect(toggle).toHaveProperty("value", true);
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
	expect(toggle.value).toBe(true);
});

test("User input with form state", async () => {
	class Host extends ObservableObject {
		// note that form must exist before it can be bound
		readonly form = new FormState().set("foo", true);
		readonly toggle = this.attach(
			UI.Toggle().formStateValue(this.form, "foo").build(),
		);
	}
	let host = new Host();
	let toggle = host.toggle;

	// use form state to check toggle
	expect(toggle.value).toBe(true);

	// render field, check that checkbox is checked
	console.log("Rendering with state");
	renderTestView(toggle);
	let toggleElt = (await expectOutputAsync({ type: "toggle" })).getSingle();
	expect(toggleElt.checked).toBe(true);

	// simulate input, check value in form state
	console.log("Updating element to set form state");
	toggleElt.checked = false;
	toggleElt.sendPlatformEvent("change");
	expect(host.form.values.foo).toBe(false);
});
