import {
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
import {
	FormState,
	ObservableObject,
	UI,
	UITextField,
} from "../../dist/index.js";

beforeEach(() => {
	useTestContext();
});

test("Constructor", () => {
	let tf = new UITextField();
	expect(tf).toHaveProperty("type", "text");
});

test("Constructor with placeholder and value", () => {
	let tf = new UITextField("Enter name", "John");
	expect(tf.placeholder).toBe("Enter name");
	expect(tf.value).toBe("John");
});

test("View builder with properties", () => {
	let myTF = UI.TextField("foo").name("bar");
	let tf = myTF.build();
	expect(tf).toHaveProperty("placeholder", "foo");
	expect(tf).toHaveProperty("name", "bar");
});

test("Rendered with placeholder", async () => {
	renderTestView(new UITextField("foo", "bar"));
	await expectOutputAsync({ text: "foo", value: "bar" });
});

test("Multiline text field with height", async () => {
	let myTF = UI.TextField("Enter long text").multiline(true, 100);
	let tf = myTF.build();
	expect(tf.multiline).toBe(true);
	renderTestView(tf);
	await expectOutputAsync({
		type: "textfield",
		text: "Enter long text",
		styles: { height: 100 },
	});
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

test("User input with form state", async () => {
	class Host extends ObservableObject {
		// note that form must exist before it can be bound
		readonly form = new FormState().set("foo", "bar");
		readonly tf = this.attach(
			UI.TextField().bindFormState(this.form, "foo").build(),
		);
	}
	let host = new Host();
	let tf = host.tf;

	// use form state to set value to 'bar'
	expect(tf.value).toBe("bar");

	// render field, check that value is 'bar'
	console.log("Rendering with value");
	renderTestView(tf);
	let tfElt = (await expectOutputAsync({ type: "textfield" })).getSingle();
	expect(tfElt.value).toBe("bar");

	// simulate input, check value in form state
	console.log("Updating element to set form state");
	tfElt.value = "baz";
	tfElt.sendPlatformEvent("input");
	expect(host.form.values.foo).toBe("baz");
});
