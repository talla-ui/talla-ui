import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";
import {
	Activity,
	ManagedEvent,
	UIFormContext,
	UILabel,
	UIRow,
	UITextField,
	ViewComposite,
	app,
	bound,
	ui,
} from "../../../dist/index.js";

describe("UIFormContext", () => {
	// helper class to observe a form context and count events
	class ChangeCounter {
		constructor(formContext: UIFormContext) {
			formContext.listen(this);
		}
		handler(formContext: UIFormContext, event: ManagedEvent) {
			if (event.name === "FormChange") this.changes++;
		}
		changes = 0;
	}

	test("Constructor", () => {
		let ctx = new UIFormContext();
		expect(ctx.values).toBeDefined();
		expect(ctx.valid).toBe(true);
		expect(ctx.get("foo")).toBeUndefined();
	});

	test("Set, no validation", () => {
		let ctx = new UIFormContext();
		let counter = new ChangeCounter(ctx);
		ctx.set("foo", "bar");
		expect(ctx.values).toHaveProperty("foo").toBe("bar");
		ctx.set("", 123);
		expect(ctx.values).not.toHaveProperty("");
		expect(counter.changes).toBe(1);
	});

	test("Set all, with validation", () => {
		let ctx = new UIFormContext();
		ctx.addRequired("foo");
		ctx.setAll({ foo: "bar", baz: 123 }, true);
		expect(ctx.errorCount).toBe(0);
		ctx.setAll({ foo: "", baz: 321 }, true);
		expect(ctx.errorCount).toBe(1);
	});

	test("Serialization", () => {
		let ctx = new UIFormContext({ foo: "bar", baz: 123 });
		let serialized = ctx.serialize();
		ctx.set("foo", "1234");
		expect(serialized)
			.asJSONString()
			.toMatchRegExp(/"foo":"bar"/);
		expect(serialized)
			.asJSONString()
			.toMatchRegExp(/"baz":123/);
	});

	test("Automatic number conversion", () => {
		let ctx = new UIFormContext();
		ctx.set("baz", 123);
		ctx.set("baz", "1234");
		expect(ctx.values).toHaveProperty("baz").toBe(1234);
	});

	test("Test that always fails", () => {
		let ctx = new UIFormContext().addTest("foo", () => {
			throw Error();
		});
		expect(ctx.validate("foo")).toBe(false);
		expect(ctx.errors).toHaveProperty("foo");
		expect(ctx.valid).toBe(false);
	});

	test("Test that always passes", () => {
		let ctx = new UIFormContext().addTest("foo", () => {});
		let counter = new ChangeCounter(ctx);
		expect(ctx.validate("foo")).toBe(true);
		ctx.set("foo", "bar", true);
		expect(counter.changes).toBe(1);
		expect(ctx.errors).not.toHaveProperty("foo");
		expect(ctx.valid).toBe(true);
	});

	test("Multiple validations", (t) => {
		let ctx = new UIFormContext({ foo: "bar", baz: 123 })
			.addRequired("baz")
			.addTest("foo", (t) =>
				t.assert(String(t.value).length >= 3, "Too short"),
			);
		let counter = new ChangeCounter(ctx);
		ctx.set("baz", 123, true); // nothing happens
		ctx.set("foo", "b"); // no validation
		ctx.set("baz", undefined); // no validation
		t.log("Test no-validation");
		expect(counter.changes, "Change counter").toBe(2);
		expect(ctx.errors).not.toHaveProperty("foo");
		expect(ctx.errors).not.toHaveProperty("baz");

		t.log("Validate all");
		ctx.validateAll();
		ctx.validate("nonExistent" as any);
		expect(ctx.errors).toHaveProperty("foo");
		expect(ctx.errors.foo)
			.asString()
			.toMatchRegExp(/Too short/);
		expect(ctx.errors).toHaveProperty("baz");
		expect(ctx.errorCount, "Error count").toBe(2);
		expect(ctx.valid).toBe(false);
		expect(counter.changes, "Change counter").toBe(3);

		t.log("Validate using set");
		ctx.set("foo", "b", true);
		expect(counter.changes, "Change counter").toBe(3);
		ctx.set("foo", "123", true);
		expect(ctx.errorCount, "Error count").toBe(1);
		expect(counter.changes, "Change counter").toBe(4);

		t.log("Add empty test");
		ctx.addTest("baz", () => {});
		ctx.set("baz", undefined, true);
		expect(ctx.errorCount, "Error count").toBe(0);
		expect(counter.changes, "Change counter").toBe(5);
	});

	test("Unset", () => {
		let ctx = new UIFormContext({ foo: "bar", baz: 123 }).addTest("foo", () => {
			throw Error();
		});
		ctx.set("foo", "bar");
		ctx.unset("foo");
		expect(ctx.values).not.toHaveProperty("foo");
		expect(ctx.values).toHaveProperty("baz");
		expect(ctx.errors).not.toHaveProperty("foo");

		expect(() => ctx.unset("boo" as any)).not.toThrowError();
	});

	test("Clear", () => {
		let ctx = new UIFormContext({ foo: "bar", baz: 123 });
		ctx.addTest("x" as any, () => {
			throw Error();
		});
		ctx.validateAll();
		ctx.clear();
		expect(ctx.values).not.toHaveProperty("foo");
		expect(ctx.values).not.toHaveProperty("baz");
		expect(ctx.errors).not.toHaveProperty("x");
	});

	test("Composite, binding to value and error", () => {
		let ctx = new UIFormContext({ foo: "bar" }).addTest("foo", (t) => {
			t.assert(t.value && t.value.length > 1, "Too short");
		});
		const MyComp = ViewComposite.define(
			{ formContext: undefined as UIFormContext | undefined },
			ui.row(
				ui.label(bound("formContext.errors.foo")),
				ui.textField({ formField: "foo" }),
			),
		);
		let view = new MyComp();
		expect(view).toHaveProperty("formContext");
		view.render();
		let row = view.body as UIRow;
		let [label, tf] = row.content.toArray() as [UILabel, UITextField];
		view.formContext = ctx;

		// set and check text field
		expect(tf.value).toBe("bar");
		ctx.set("foo", "123");
		expect(tf.value).toBe("123");
		expect(label.text).toBe(undefined);

		// set invalid (other way around) and check label
		tf.value = "1";
		tf.emit("Change");
		expect(ctx.errors, "formContext errors").toHaveProperty("foo");
		expect(label.text)
			.asString()
			.toMatchRegExp(/Too short/);
	});

	test("Custom form container, rendered", async (t) => {
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		const FormContainer = ViewComposite.define(
			{ formContext: undefined as UIFormContext | undefined },
			(_, ...content) => ui.column(...content),
		);
		const ViewBody = ui.page(
			ui.row(
				ui.use(
					FormContainer,
					{ formContext: bound("form1") },
					ui.textField({ formField: "text" }),
				),
				ui.use(
					FormContainer,
					{ formContext: bound("form2") },
					ui.textField({ formField: "text" }),
				),
			),
		);
		class MyActivity extends Activity {
			protected override createView() {
				return new ViewBody();
			}
			form1 = new UIFormContext({ text: "foo" });
			form2 = new UIFormContext({ text: "bar" });
		}
		let activity = new MyActivity();
		app.addActivity(activity, true);

		// find first text field and change value
		let elt1 = (
			await t.expectOutputAsync(50, { type: "textfield", value: "foo" })
		).getSingle();
		elt1.value = "123";
		elt1.sendPlatformEvent("change");
		expect(activity.form1.get("text")).toBe("123");

		// find second text field and set value
		let elt2 = (
			await t.expectOutputAsync(50, { type: "textfield", value: "bar" })
		).getSingle();
		elt2.value = "456";
		elt2.sendPlatformEvent("change");
		expect(activity.form2.get("text")).toBe("456");
	});
});
