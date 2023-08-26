import {
	bound,
	JSX,
	app,
	UICell,
	UIColor,
	ManagedObject,
	View,
} from "../../../dist/index.js";
import { describe, expect, test, useTestContext } from "@desk-framework/test";

describe("JSX", () => {
	test("Single component", () => {
		let MyCell = <cell />;
		let cell = new MyCell();
		expect(cell).toBeInstanceOf(UICell);
	});

	test("Single component with preset", () => {
		let MyCell = <cell borderColor={UIColor.Blue} textColor={UIColor.Red} />;
		let cell = new MyCell();
		expect(cell).toBeInstanceOf(UICell);
		expect(cell).toHaveProperty("borderColor").toBe(UIColor.Blue);
		expect(cell).toHaveProperty("textColor").toBe(UIColor.Red);
	});

	test("Component with content", () => {
		let MyCell = (
			<cell>
				<label text={"foo"} />
				<label>bar</label>
				<button>button</button>
				<toggle>toggle</toggle>
				<textfield>placeholder</textfield>
			</cell>
		);
		let cell = new MyCell() as UICell;
		expect(cell.content).asArray().toBeArray(5);
		let [label1, label2, button, toggle, textfield] = cell.content;
		expect(label1).toHaveProperty("text").asString().toBe("foo");
		expect(label2).toHaveProperty("text").asString().toBe("bar");
		expect(button).toHaveProperty("label").asString().toBe("button");
		expect(toggle).toHaveProperty("label").asString().toBe("toggle");
		expect(textfield)
			.toHaveProperty("placeholder")
			.asString()
			.toBe("placeholder");
	});

	test("Custom view composite", () => {
		const MyView = View.compose<{
			/** A single property, not used in view */
			foo?: number;
		}>(() => <label>foo</label>);
		let MyCell = (
			<cell>
				<MyView foo={123} />
			</cell>
		);
		let cell = new MyCell() as UICell;
		expect(cell.content).asArray().toBeArray(1);
		expect(cell.content.first()).toHaveProperty("foo").toBe(123);
	});

	test("Component with bound content", async (t) => {
		const MyView = View.compose<{
			/** A single property, bound in view */
			foo?: number;
		}>(() => <label>{bound("foo")}</label>);
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		app.render(new (MyView.with({ foo: 123 }))());
		await t.expectOutputAsync(50, { text: "123" });
	});

	test("Component with bound content and text", async (t) => {
		const MyView = View.compose<{ foo?: number; bar?: any }>(() => (
			<row>
				<label>foo='{bound("foo")}'</label>
				<label>bar='%[bar.foo]'</label>
				<label>baz='%[baz=bar.baz:uc]'</label>
				<label>nope_bound='{bound("nope", "Nothing")}'</label>
			</row>
		));
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		let V = MyView.with({ foo: 123, bar: { foo: 456, baz: "abc" } });
		app.render(new V());
		let expectRow = await t.expectOutputAsync(50, { type: "row" });
		t.log("straight binding");
		expectRow.containing({ text: "foo='123'" }).toBeRendered();
		t.log("bar.foo");
		expectRow.containing({ text: "bar='456'" }).toBeRendered();
		t.log("baz=bar.baz,uc");
		expectRow.containing({ text: "baz='ABC'" }).toBeRendered();
		t.log("straight binding with default");
		expectRow.containing({ text: "nope_bound='Nothing'" }).toBeRendered();
	});

	test("Component with bound content and text, translated", async (t) => {
		const Comp = View.compose<{ emails: any }>(() => (
			<label>
				You have %[numEmails=emails.count:n] %[numEmails:plural|email|emails]
			</label>
		));
		const Preset1 = Comp.with({ emails: { count: 1 } });
		const Preset2 = Comp.with({ emails: { count: 2 } });

		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		app.render(new Preset1());
		await t.sleep(20);
		await t.expectOutputAsync(50, { text: "You have 1 email" });

		// Use I18n provider for text translation (note binding path)
		class MyI18nProvider extends ManagedObject {
			getText = (s: string) =>
				s === "You have %[numEmails:n] %[numEmails:plural|email|emails]"
					? "Je hebt %[numEmails:n] %[numEmails:plural|e-mail|e-mails]"
					: s;
			getPlural = (n: number, forms: string[]) => forms[n < 2 ? 0 : 1]!;
			getDecimalSeparator = () => ".";
			format(s: string) {
				return s;
			}
		}
		app.i18n = new MyI18nProvider();
		app.render(new Preset2());
		await t.expectOutputAsync(50, { text: "Je hebt 2 e-mails" });
	});
});
