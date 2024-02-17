import {
	describe,
	expect,
	test,
	useTestContext,
} from "@desk-framework/frame-test";
import {
	JSX,
	LazyString,
	UICell,
	UIColor,
	UIColumn,
	UILabel,
	ViewComposite,
	app,
	bound,
	strf,
} from "../../../dist/index.js";

describe("JSX", () => {
	test("Single component", () => {
		let MyCell = <cell />;
		let cell = new MyCell();
		expect(cell).toBeInstanceOf(UICell);
	});

	test("Single component with preset", () => {
		let MyCell = <cell padding={8} textColor={UIColor["@red"]} />;
		let cell = new MyCell();
		expect(cell).toBeInstanceOf(UICell);
		expect(cell).toHaveProperty("padding").toBe(8);
		expect(cell).toHaveProperty("textColor").toBe(UIColor["@red"]);
	});

	test("Single component with text", () => {
		let MyLabel = <label>Foo</label>;
		let label = new MyLabel();
		expect(label).toBeInstanceOf(UILabel);
		expect(label).toHaveProperty("text").toBeInstanceOf(LazyString);
		expect(label).toHaveProperty("text").asString().toBe("Foo");
	});

	test("Single component with lazy string", () => {
		let MyLabel = <label>{strf("Foo")}</label>;
		let label = new MyLabel();
		expect(label).toBeInstanceOf(UILabel);
		expect(label).toHaveProperty("text").toBeInstanceOf(LazyString);
		expect(label).toHaveProperty("text").asString().toBe("Foo");
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
		const MyView = ViewComposite.define<{
			/** A single property, not used in view */
			foo?: number;
		}>(<label>test</label>);
		let MyCell = (
			<cell>
				<MyView foo={123} />
			</cell>
		);
		let cell = new MyCell() as UICell;
		expect(cell.content).asArray().toBeArray(1);
		expect(cell.content.first()).toHaveProperty("foo").toBe(123);
	});

	test("Custom view composite with column content", (t) => {
		const MyColumn = ViewComposite.define<{ spacing?: number }>(
			(p, ...content) => <column spacing={p.spacing}>{content}</column>,
		);
		let MyCell = (
			<cell>
				<MyColumn spacing={20}>
					<label>foo</label>
					<label>bar</label>
				</MyColumn>
			</cell>
		);
		let cell = new MyCell() as UICell;

		t.log("Spacing on view composite itself");
		let viewComposite = cell.content.first() as ViewComposite;
		expect(viewComposite).toHaveProperty("spacing").toBe(20);

		t.log("Render content of view composite");
		viewComposite.render();
		let column = viewComposite.findViewContent(UIColumn)[0];
		expect(column).toBe(viewComposite.body);

		t.log("Spacing on column inside view composite");
		expect(column).toHaveProperty("spacing").toBe(20);

		t.log("Label content inside column");
		let labels = column!.content.toArray();
		expect(labels).toBeArray(2);
		expect(labels[0]).toHaveProperty("text").asString().toBe("foo");
		expect(labels[1]).toHaveProperty("text").asString().toBe("bar");
	});

	test("Component with bound content", async (t) => {
		const MyView = ViewComposite.define<{
			/** A single property, bound in view */
			foo?: number;
		}>(<label>{bound("foo")}</label>);
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		app.showPage(new (MyView.with({ foo: 123 }))());
		await t.expectOutputAsync(50, { text: "123" });
	});

	test("Component with bound content using lazy string", async (t) => {
		const MyView = ViewComposite.define<{
			/** A single property, bound in view */
			foo?: number;
		}>(<label>{strf("Foo is %[foo]")}</label>);
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		app.showPage(new (MyView.with({ foo: 123 }))());
		await t.expectOutputAsync(50, { text: "Foo is 123" });
	});

	test("Component with bound content and text", async (t) => {
		const MyView = ViewComposite.define<{ foo?: number; bar?: any }>(
			<row>
				<label>foo='{bound("foo")}'</label>
				<label>bar='%[bar.foo]'</label>
				<label>baz='%[baz=bar.baz:uc]'</label>
				<label>nope_bound='{bound("nope", "Nothing")}'</label>
			</row>,
		);
		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		let V = MyView.with({ foo: 123, bar: { foo: 456, baz: "abc" } });
		app.showPage(new V());
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
		const Comp = ViewComposite.define<{ emails: any }>(
			<label>
				You have %[numEmails=emails.count:n] %[numEmails:plural|email|emails]
			</label>,
		);
		const Preset1 = Comp.with({ emails: { count: 1 } });
		const Preset2 = Comp.with({ emails: { count: 2 } });

		useTestContext((options) => {
			options.renderFrequency = 5;
		});
		app.showPage(new Preset1());
		await t.sleep(20);
		await t.expectOutputAsync(50, { text: "You have 1 email" });

		// Use I18n provider for text translation (note binding path)
		class MyI18nProvider {
			getLocale = () => "test";
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
		app.showPage(new Preset2());
		await t.expectOutputAsync(50, { text: "Je hebt 2 e-mails" });
	});
});
