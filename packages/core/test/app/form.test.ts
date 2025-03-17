import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { ObjectReader, strf } from "@talla-ui/util";
import { beforeEach } from "node:test";
import { expect, test } from "vitest";
import {
	$activity,
	$view,
	Activity,
	AppContext,
	FormContext,
	ObservedEvent,
	UIComponent,
	UILabel,
	UIRow,
	UITextField,
	app,
	ui,
} from "../../dist/index.js";

beforeEach(() => {
	AppContext.setErrorHandler((err) => {
		throw err;
	});
});

// helper class to observe a form context and count events
class ChangeCounter {
	constructor(formContext: FormContext) {
		formContext.listen(this);
	}
	handler(_: FormContext, event: ObservedEvent) {
		if (event.name === "FormChange") this.changes++;
	}
	changes = 0;
}

test("Constructor", () => {
	let ctx = new FormContext();
	expect(ctx.values).toBeDefined();
	expect(ctx.errors).toBeDefined();
	expect(ctx.valid).toBe(true);
});

test("Constructor with values", () => {
	let ctx = new FormContext(undefined, { foo: "bar" });
	expect(ctx.values).toEqual({ foo: "bar" });
});

test("Set, no validation", () => {
	let ctx = new FormContext();
	let counter = new ChangeCounter(ctx);
	ctx.set("foo", "bar");
	expect(ctx.values).toHaveProperty("foo", "bar");
	ctx.set("" as any, 123);
	expect("" in ctx.values).toBeFalsy();
	expect(counter.changes).toBe(1);
});

test("Clear values", () => {
	let ctx = new FormContext(undefined, { foo: "bar" });
	expect(ctx.values).toHaveProperty("foo");
	ctx.clear();
	expect(ctx.values).toBeDefined();
	expect(ctx.errors).toBeDefined();
	expect(ctx.values).not.toHaveProperty("foo");
	expect(ctx.valid).toBe(true);
});

test("Validation", () => {
	let ctx = new FormContext({
		foo: {
			isString: {
				required: { err: "Foo is required" },
				min: { length: 3, err: "Too short" },
			},
		},
		baz: { isNumber: {}, isOptional: true },
	});

	console.log("No validation yet");
	let counter = new ChangeCounter(ctx);
	ctx.set("baz", 123); // no validation
	ctx.set("baz", 123); // nothing happens
	ctx.set("foo", "b"); // no validation
	ctx.set("baz", undefined); // no validation
	expect(counter.changes, "Change counter").toBe(3);
	expect(ctx.valid).toBe(true);
	expect(ctx.errors).not.toHaveProperty("foo");
	expect(ctx.errors).not.toHaveProperty("baz");

	console.log("Calling validate()");
	expect(ctx.validate(), "validate() result").toBeUndefined();
	expect(ctx.errors).toHaveProperty("foo");
	expect(String(ctx.errors.foo)).toMatch(/Too short/);
	expect(ctx.errors).not.toHaveProperty("baz");
	expect(ctx.valid).toBe(false);
	expect(counter.changes, "Change counter").toBe(4);

	console.log("Set again after validation");
	ctx.set("foo", "b");
	expect(counter.changes, "Change counter").toBe(4);
	ctx.set("foo", "c");
	expect(ctx.errors).toHaveProperty("foo");
	expect(ctx.valid).toBe(false);
	expect(counter.changes, "Change counter").toBe(5);
	ctx.set("foo", "123");
	expect(ctx.errors).not.toHaveProperty("foo");
	expect(ctx.valid).toBe(true);
	expect(ctx.validate()).toBeDefined();
	expect(counter.changes, "Change counter").toBe(6);
});

test("ObjectReader validation", () => {
	let reader = new ObjectReader({
		foo: { isString: { required: { err: "Foo is required" } } },
	});
	let ctx = new FormContext(reader);
	ctx.set("foo", "");
	expect(ctx.errors).not.toHaveProperty("foo");
	ctx.validate();
	expect(ctx.errors).toHaveProperty("foo");
});

test("UI component, binding to value and error", () => {
	useTestContext();
	let ERR = "Foo must have at least 3 characters";
	let ctx = new FormContext(
		{ foo: { isString: { min: { length: 3, err: strf(ERR) } } } },
		{ foo: "bar" },
	);

	const MyComp = UIComponent.define(
		{ formContext: undefined as FormContext | undefined },
		ui.row(
			ui.label($view("formContext.errors.foo.message")),
			ui.textField({ formField: "foo" }),
		),
	);

	let view = new MyComp();
	expect(view).toHaveProperty("formContext");
	view.render((() => {}) as any); // force render to get reference to body
	let row = view.body as UIRow;
	let [label, tf] = row.content.toArray() as [UILabel, UITextField];
	view.formContext = ctx;

	// set and check text field
	expect(tf.value).toBe("bar");
	ctx.set("foo", 123);
	expect(tf.value).toBe("123");
	expect(label.text).toBe(undefined);

	// set invalid (using text box), validate, and check label
	tf.value = "1";
	tf.emit("Change");
	expect(ctx.validate(), "validate() result").toBeUndefined();
	expect(ctx.errors, "formContext errors").toHaveProperty("foo");
	expect(String(label.text)).toBe(ERR);
});

test("Custom form container, rendered", async () => {
	useTestContext();
	const FormContainer = UIComponent.define(
		{ formContext: undefined as FormContext | undefined },
		(_, ...content) => ui.column(...content),
	);
	const view = ui.row(
		ui.use(
			FormContainer,
			{ formContext: $activity("form1") },
			ui.textField({ formField: "text" }),
		),
		ui.use(
			FormContainer,
			{ formContext: $activity("form2") },
			ui.textField({ formField: "text" }),
		),
	);
	class MyActivity extends Activity {
		protected override createView() {
			return view.create();
		}
		form1 = new FormContext().set("text", "foo");
		form2 = new FormContext().set("text", "bar");
	}
	let activity = new MyActivity();
	app.addActivity(activity, true);

	// find first text field and change value
	let elt1 = (
		await expectOutputAsync({ type: "textfield", value: "foo" })
	).getSingle();
	elt1.value = "123";
	elt1.sendPlatformEvent("change");
	expect(activity.form1.values.text).toBe("123");

	// find second text field and set value
	let elt2 = (
		await expectOutputAsync({ type: "textfield", value: "bar" })
	).getSingle();
	elt2.value = "456";
	elt2.sendPlatformEvent("change");
	expect(activity.form2.values.text).toBe("456");
});
