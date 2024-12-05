import { describe, expect, test, useTestContext } from "@talla-ui/test-handler";
import {
	$view,
	BindingOrValue,
	ConfigOptions,
	LazyString,
	StringConvertible,
	UIButton,
	UICell,
	UIColumn,
	UILabel,
	ViewComposite,
	app,
	strf,
	ui,
} from "../../../dist/index.js";

describe("JSX", () => {
	function renderComposite(c: ViewComposite) {
		c.render((() => {}) as any);
	}

	test("Single component", () => {
		let myCell = <cell />;
		let cell = myCell.create();
		expect(cell).toBeInstanceOf(UICell);
	});

	test("Single component with preset", () => {
		let myCell = <cell padding={8} textColor={ui.color.RED} />;
		let cell = myCell.create();
		expect(cell).toBeInstanceOf(UICell);
		expect(cell).toHaveProperty("padding").toBe(8);
		expect(cell).toHaveProperty("textColor").toBe(ui.color.RED);
	});

	test("Single component with text", () => {
		let myLabel = <label>Foo</label>;
		let label = myLabel.create();
		expect(label).toBeInstanceOf(UILabel);
		expect(label).toHaveProperty("text").toBeInstanceOf(LazyString);
		expect(label).toHaveProperty("text").asString().toBe("Foo");
	});

	test("Single component with interpolated text", () => {
		let myLabel = <label>Foo {"foo"}</label>;
		let label = myLabel.create();
		expect(label).toHaveProperty("text").asString().toBe("Foo foo");
	});

	test("Single component with interpolated text, number", () => {
		let myLabel = <label>Foo {123}</label>;
		let label = myLabel.create();
		expect(label).toHaveProperty("text").asString().toBe("Foo 123");
	});

	test("Single component with interpolated text, number upfront", () => {
		let myLabel = <label>{123}. Foo</label>;
		let label = myLabel.create();
		expect(label).toHaveProperty("text").asString().toBe("123. Foo");
	});

	test("Single component with lazy string", () => {
		let myLabel = <label>{strf("Foo")}</label>;
		let label = myLabel.create();
		expect(label).toBeInstanceOf(UILabel);
		expect(label).toHaveProperty("text").toBeInstanceOf(LazyString);
		expect(label).toHaveProperty("text").asString().toBe("Foo");
	});

	test("Component with content", () => {
		let myCell = (
			<cell>
				<label text={"foo"} />
				<label>bar</label>
				<button>button</button>
				<toggle>toggle</toggle>
				<textfield>placeholder</textfield>
			</cell>
		);
		let cell = myCell.create() as UICell;
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
		class MyView extends ViewComposite {
			constructor(_p: { foo?: BindingOrValue<number> }) {
				super();
				// note that JSX applies the preset using `ui.use`
				expect(_p).toBeUndefined();
			}
			foo?: number = undefined;
			override defineView() {
				return <label>test</label>;
			}
		}
		let myCell = (
			<cell>
				<MyView foo={123} />
			</cell>
		);
		let cell = myCell.create() as UICell;
		expect(cell.content).asArray().toBeArray(1);
		expect(cell.content.first()).toHaveProperty("foo").toBe(123);
	});

	test("Custom view composite, with defaults", () => {
		const MyView = ViewComposite.define({ foo: "" }, <label>Foo</label>);
		let viewPreset = <MyView foo="bar" />;
		let c = viewPreset.create() as ViewComposite;
		renderComposite(c);
		expect(c).toHaveProperty("foo").toBe("bar");
		expect(c.findViewContent(UILabel)[0])
			.toHaveProperty("text")
			.asString()
			.toBe("Foo");
	});

	test("Custom view composite, with defaults, half class", () => {
		class MyView extends ViewComposite.define({ foo: "" }) {
			override defineView() {
				return <label>Foo</label>;
			}
		}
		let viewPreset = <MyView foo="bar" />;
		let c = viewPreset.create() as ViewComposite;
		renderComposite(c);
		expect(c).toHaveProperty("foo").toBe("bar");
		expect(c.findViewContent(UILabel)[0])
			.toHaveProperty("text")
			.asString()
			.toBe("Foo");
	});

	test("Custom view composite, with defaults, using function", () => {
		const MyView = ViewComposite.define(
			{ chevron: "up" as "up" | "down" },
			(v) => <button chevron={v.chevron}>test</button>,
		);
		let myCell = (
			<cell>
				<MyView chevron="down" />
			</cell>
		);
		let cell = myCell.create() as UICell;
		expect(cell.content).asArray().toBeArray(1);
		expect(cell.content.first()).toHaveProperty("chevron").toBe("down");
		renderComposite(cell.content.first() as ViewComposite);
		expect(cell.findViewContent(UIButton)[0])
			.toHaveProperty("chevron")
			.toBe("down");
	});

	test("Custom view composite with column content and styles", (t) => {
		const MyColumn = ViewComposite.define(
			{ foo: "", styles: { spacing: 8 } },
			(v, ...content) => (
				<column spacing={v.styles.spacing}>{...content}</column>
			),
		);
		let myCell = (
			<cell>
				<MyColumn foo="bar">
					<label>foo</label>
					<label>bar</label>
				</MyColumn>
			</cell>
		);
		let cell = myCell.create() as UICell;

		t.log("Property on view composite itself");
		let viewComposite = cell.content.first() as ViewComposite;
		expect(viewComposite).toHaveProperty("foo").toBe("bar");

		t.log("Render content of view composite");
		renderComposite(viewComposite);
		let column = viewComposite.findViewContent(UIColumn)[0];
		expect(column).toBe(viewComposite.body);
		expect(column).toHaveProperty("spacing").toBe(8);

		t.log("Label content inside column");
		let labels = column!.content.toArray();
		expect(labels).toBeArray(2);
		expect(labels[0]).toHaveProperty("text").asString().toBe("foo");
		expect(labels[1]).toHaveProperty("text").asString().toBe("bar");
	});

	test("Composite with defaults", async (t) => {
		const MyView = ViewComposite.define(
			{ foo: 123 },
			<label>{strf("Foo is %[foo]")}</label>,
		);
		useTestContext({ renderFrequency: 5 });
		t.render(ui.use(MyView).create());
		await t.expectOutputAsync({ text: "Foo is 123" });
	});

	test("Composite with ConfigOptions", async (t) => {
		class MyConfig extends ConfigOptions {
			static default = new MyConfig();
			foo = 123;
			bar = "bar";
		}
		const MyView = ViewComposite.define(
			{ config: MyConfig.default },
			<label>{strf("%[config.foo]:%[config.bar]")}</label>,
		);
		useTestContext({ renderFrequency: 5 });
		t.render(ui.use(MyView, { config: { foo: 321 } }).create());
		await t.expectOutputAsync({ text: "321:bar" });
	});

	test("Composite with content", async (t) => {
		const MyView = ViewComposite.define({}, (_values, ...content) => (
			<row>{...content}</row>
		));
		useTestContext({ renderFrequency: 5 });
		t.render(ui.use(MyView, ui.label("Foo")).create());
		await t.expectOutputAsync({ text: "Foo" });
	});

	test("Composite with bound content", async (t) => {
		class MyView extends ViewComposite {
			constructor(_p?: { foo?: BindingOrValue<number> }) {
				super();
				// note that JSX applies the preset using `ui.use`
				expect(_p).toBeUndefined();
			}
			foo: number = 0;
			override defineView() {
				return <label>{$view.bind("foo")}</label>;
			}
		}
		useTestContext({ renderFrequency: 5 });
		let instance = ui.use(MyView, { foo: 123 }).create();
		t.render(instance);
		await t.expectOutputAsync({ text: "123" });
	});

	test("Composite with bound content using lazy string", async (t) => {
		const MyView = ViewComposite.define(
			{ foo: StringConvertible.EMPTY },
			<label>{strf("Foo is %[foo]")}</label>,
		);
		useTestContext({ renderFrequency: 5 });
		t.render(ui.use(MyView, { foo: strf("123") }).create());
		await t.expectOutputAsync({ text: "Foo is 123" });
	});

	test("Composite with event handler", async (t) => {
		class MyView extends ViewComposite {
			override defineView() {
				return (
					<cell>
						<button onClick="FooClicked">Foo</button>
					</cell>
				);
			}
			onFooClicked() {
				t.count("FooClicked");
			}
		}
		useTestContext({ renderFrequency: 5 });
		t.render(new MyView());
		await t.clickOutputAsync({ type: "button" });
		t.expectCount("FooClicked").toBe(1);
	});

	test("Composite with bound content and text", async (t) => {
		const MyView = ViewComposite.define(
			{ foo: 0, bar: undefined as any },
			<row>
				<label>foo='{$view.bind("foo")}'</label>
				<label>bar='%[bar.foo]'</label>
				<label>baz='%[baz=bar.baz:uc]'</label>
				<label>nope_bound='{$view.bind("nope", "Nothing")}'</label>
			</row>,
		);
		useTestContext({ renderFrequency: 5 });
		let builder = ui.use(MyView, { foo: 123, bar: { foo: 456, baz: "abc" } });
		t.render(builder.create());
		let expectRow = await t.expectOutputAsync({ type: "row" });
		t.log("straight binding");
		expectRow.containing({ text: "foo='123'" }).toBeRendered();
		t.log("bar.foo");
		expectRow.containing({ text: "bar='456'" }).toBeRendered();
		t.log("baz=bar.baz,uc");
		expectRow.containing({ text: "baz='ABC'" }).toBeRendered();
		t.log("straight binding with default");
		expectRow.containing({ text: "nope_bound='Nothing'" }).toBeRendered();
	});

	test("Composite with bound content and text, translated", async (t) => {
		const Comp = ViewComposite.define(
			{ emails: { count: 0 } },
			<label>
				You have %[numEmails=emails.count:n] %[numEmails:plural|email|emails]
			</label>,
		);
		const preset1 = ui.use(Comp, { emails: { count: 1 } });
		const preset2 = ui.use(Comp, { emails: { count: 2 } });

		useTestContext({ renderFrequency: 5 });
		t.render(preset1.create());
		await t.sleep(20);
		await t.expectOutputAsync({ text: "You have 1 email" });

		// Use I18n provider for text translation (note binding path)
		class MyI18nProvider {
			getAttributes = () => ({ locale: "nl-NL" });
			getText = (s: string) =>
				s === "You have %[numEmails:n] %[numEmails:plural|email|emails]"
					? "Je hebt %[numEmails:n] %[numEmails:plural|e-mail|e-mails]"
					: s;
			getPlural = (n: number, forms: string[]) => forms[n < 2 ? 0 : 1]!;
			format(s: string) {
				return s;
			}
		}
		app.i18n = new MyI18nProvider();
		t.render(preset2.create());
		await t.expectOutputAsync({ text: "Je hebt 2 e-mails" });
	});
});
