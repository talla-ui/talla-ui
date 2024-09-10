import {
	UITextField,
	UIFormContext,
	strf,
	ui,
	ManagedObject,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";

describe("UITextField", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
	});

	test("Constructor", () => {
		let tf = new UITextField();
		expect(tf).toHaveProperty("type").toBe("text");
	});

	test("Preset with properties", () => {
		let MyTF = ui.textField({ placeholder: "foo", name: "bar" });
		let tf = new MyTF();
		expect(tf).toHaveProperty("placeholder").asString().toBe("foo");
		expect(tf).toHaveProperty("name").toBe("bar");
	});

	test("Preset using form field", () => {
		let MyTF = ui.textField({
			formField: "foo",
			placeholder: strf("Placeholder"),
		});
		let tf = new MyTF();
		expect(tf).toHaveProperty("formField").toBe("foo");
		expect(tf).toHaveProperty("placeholder").asString().toBe("Placeholder");
	});

	test("Rendered with placeholder", async (t) => {
		t.render(new UITextField("foo", "bar"));
		await t.expectOutputAsync(100, {
			text: "foo",
			value: "bar",
		});
	});

	test("User input, directly setting value", async (t) => {
		let tf = new UITextField();
		t.render(tf);
		let tfElt = (
			await t.expectOutputAsync(100, { type: "textfield" })
		).getSingle();
		tfElt.value = "foo";
		tfElt.sendPlatformEvent("input");
		expect(tf.value).toBe("foo");
	});

	test("User input, value on event", async (t) => {
		let tf = new UITextField();
		let eventValue: any;
		tf.listen((e) => {
			eventValue = e.data.value;
		});
		t.render(tf);
		let tfElt = (
			await t.expectOutputAsync(100, { type: "textfield" })
		).getSingle();
		tfElt.value = "foo";
		tfElt.sendPlatformEvent("input");
		expect(eventValue).toBe("foo");
	});

	test("User input with form context", async (t) => {
		class Host extends ManagedObject {
			// note that formContext must exist before it can be bound
			readonly formContext = new UIFormContext().set("foo", "bar");
			readonly tf = this.attach(new UITextField());
		}
		let host = new Host();
		let tf = host.tf;

		// use form context to set value to 'bar'
		tf.formField = "foo";
		expect(tf.value).toBe("bar");

		// render field, check that value is 'bar'
		t.log("Rendering with value");
		t.render(tf);
		let tfElt = (
			await t.expectOutputAsync(100, { type: "textfield" })
		).getSingle();
		expect(tfElt.value).toBe("bar");

		// simulate input, check value in form context
		t.log("Updating element to set form context");
		tfElt.value = "baz";
		tfElt.sendPlatformEvent("input");
		expect(host.formContext.values.foo).toBe("baz");
	});
});
