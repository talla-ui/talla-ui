import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { strf } from "@talla-ui/util";
import { beforeEach, expect, test } from "vitest";
import {
	FormContext,
	ObservedObject,
	ui,
	UITextField,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor", () => {
	let tf = new UITextField();
	expect(tf).toHaveProperty("type", "text");
});

test("View builder with properties", () => {
	let myTF = ui.textField({ placeholder: "foo", name: "bar" });
	let tf = myTF.create();
	expect(tf).toHaveProperty("placeholder", "foo");
	expect(tf).toHaveProperty("name", "bar");
});

test("View builder using form field", () => {
	let myTF = ui.textField({
		formField: "foo",
		placeholder: strf("Placeholder"),
	});
	let tf = myTF.create();
	expect(tf).toHaveProperty("formField", "foo");
	expect(tf.placeholder?.toString()).toBe("Placeholder");
});

test("Rendered with placeholder", async () => {
	renderTestView(new UITextField("foo", "bar"));
	await expectOutputAsync({ text: "foo", value: "bar" });
});

test("User input, directly setting value", async () => {
	let tf = new UITextField();
	renderTestView(tf);
	let tfElt = (await expectOutputAsync({ type: "textfield" })).getSingle();
	tfElt.value = "foo";
	tfElt.sendPlatformEvent("input");
	expect(tf.value).toBe("foo");
});

test("User input, value on event", async () => {
	let tf = new UITextField();
	let eventValue: any;
	tf.listen((e) => {
		eventValue = e.data.value;
	});
	renderTestView(tf);
	let tfElt = (await expectOutputAsync({ type: "textfield" })).getSingle();
	tfElt.value = "foo";
	tfElt.sendPlatformEvent("input");
	expect(eventValue).toBe("foo");
});

test("User input with trim", async () => {
	let tf = new UITextField();
	tf.trim = true;
	let eventValue: any;
	tf.listen((e) => {
		eventValue = e.data.value;
	});
	renderTestView(tf);
	let tfElt = (await expectOutputAsync({ type: "textfield" })).getSingle();
	tfElt.value = " foo  ";
	tfElt.sendPlatformEvent("input");
	expect(eventValue).toBe("foo");
});

test("User input with form context", async () => {
	class Host extends ObservedObject {
		// note that formContext must exist before it can be bound
		readonly formContext = new FormContext().set("foo", "bar");
		readonly tf = this.attach(new UITextField());
	}
	let host = new Host();
	let tf = host.tf;

	// use form context to set value to 'bar'
	tf.formField = "foo";
	expect(tf.value).toBe("bar");

	// render field, check that value is 'bar'
	console.log("Rendering with value");
	renderTestView(tf);
	let tfElt = (await expectOutputAsync({ type: "textfield" })).getSingle();
	expect(tfElt.value).toBe("bar");

	// simulate input, check value in form context
	console.log("Updating element to set form context");
	tfElt.value = "baz";
	tfElt.sendPlatformEvent("input");
	expect(host.formContext.values.foo).toBe("baz");
});
