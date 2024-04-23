import {
	UITextField,
	UIFormContext,
	app,
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
		let MyTF = ui.textField({ placeholder: "foo" });
		let tf = new MyTF();
		expect(tf).toHaveProperty("placeholder").asString().toBe("foo");
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
		app.showPage(new UITextField("foo", "bar"));
		await t.expectOutputAsync(100, {
			text: "foo",
			value: "bar",
		});
	});

	test("User input, directly setting value", async (t) => {
		let tf = new UITextField();
		app.showPage(tf);
		let tfElt = (
			await t.expectOutputAsync(100, { type: "textfield" })
		).getSingle();
		tfElt.value = "foo";
		tfElt.sendPlatformEvent("input");
		expect(tf.value).toBe("foo");
	});

	test("User input with form context", async (t) => {
		class Host extends ManagedObject {
			// note that formContext must exist before it can be bound
			readonly formContext = new UIFormContext({ foo: "bar" });
			readonly tf = this.attach(new UITextField());
		}
		let host = new Host();
		let tf = host.tf;

		// use form context to set value to 'bar'
		tf.formField = "foo";
		expect(tf.value).toBe("bar");

		// render field, check that value is 'bar'
		t.log("Rendering with value");
		app.showPage(tf);
		let tfElt = (
			await t.expectOutputAsync(100, { type: "textfield" })
		).getSingle();
		expect(tfElt.value).toBe("bar");

		// simulate input, check value in form context
		t.log("Updating element to set form context");
		tfElt.value = "baz";
		tfElt.sendPlatformEvent("input");
		expect(host.formContext.get("foo")).toBe("baz");
	});
});
