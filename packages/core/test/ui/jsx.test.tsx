import {
	clickOutputAsync,
	expectOutputAsync,
	renderTestView,
	useTestContext,
} from "@talla-ui/test-handler";
import { beforeEach, expect, test } from "vitest";
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
	UITextField,
	UIToggle,
	ViewComposite,
	app,
	strf,
	ui,
} from "../../dist/index.js";

function renderComposite(c: ViewComposite) {
	c.render((() => {}) as any);
}

beforeEach(() => {
	useTestContext({ renderFrequency: 5 });
});

test("Single component", () => {
	let myCell = <cell />;
	let cell = myCell.create();
	expect(cell).toBeInstanceOf(UICell);
});

test("Single component with preset", () => {
	let myCell = <cell padding={8} textColor={ui.color.RED} />;
	let cell = myCell.create();
	expect(cell).toBeInstanceOf(UICell);
	expect(cell).toHaveProperty("padding", 8);
	expect(cell).toHaveProperty("textColor", ui.color.RED);
});

test("Single component with text", () => {
	let myLabel = <label>Foo</label>;
	let label = myLabel.create() as UILabel;
	expect(label).toBeInstanceOf(UILabel);
	expect(label.text).toBeInstanceOf(LazyString);
	expect(label.text?.toString()).toBe("Foo");
});

test("Single component with interpolated text", () => {
	let myLabel = <label>Foo {"foo"}</label>;
	let label = myLabel.create() as UILabel;
	expect(label.text?.toString()).toBe("Foo foo");
});

test("Single component with interpolated text, number", () => {
	let myLabel = <label>Foo {123}</label>;
	let label = myLabel.create() as UILabel;
	expect(label.text?.toString()).toBe("Foo 123");
});

test("Single component with interpolated text, number upfront", () => {
	let myLabel = <label>{123}. Foo</label>;
	let label = myLabel.create() as UILabel;
	expect(label.text?.toString()).toBe("123. Foo");
});

test("Single component with lazy string", () => {
	let myLabel = <label>{strf("Foo")}</label>;
	let label = myLabel.create() as UILabel;
	expect(label).toBeInstanceOf(UILabel);
	expect(label.text).toBeInstanceOf(LazyString);
	expect(label.text?.toString()).toBe("Foo");
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
	expect(cell.content.toArray()).toHaveLength(5);
	let [label1, label2, button, toggle, textfield] = cell.content.toArray() as [
		UILabel,
		UILabel,
		UIButton,
		UIToggle,
		UITextField,
	];
	expect(label1.text?.toString()).toBe("foo");
	expect(label2.text?.toString()).toBe("bar");
	expect(button.label?.toString()).toBe("button");
	expect(toggle.label?.toString()).toBe("toggle");
	expect(textfield.placeholder?.toString()).toBe("placeholder");
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
	expect(cell.content.toArray()).toHaveLength(1);
	expect(cell.content.first()).toHaveProperty("foo", 123);
});

test("Custom view composite, with defaults", () => {
	const MyView = ViewComposite.define({ foo: "" }, <label>Foo</label>);
	let viewPreset = <MyView foo="bar" />;
	let c = viewPreset.create() as ViewComposite;
	renderComposite(c);
	expect(c).toHaveProperty("foo", "bar");
	expect(c.findViewContent(UILabel)[0]?.text?.toString()).toBe("Foo");
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
	expect(c).toHaveProperty("foo", "bar");
	expect(c.findViewContent(UILabel)[0]?.text?.toString()).toBe("Foo");
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
	expect(cell.content.toArray()).toHaveLength(1);
	expect(cell.content.first()).toHaveProperty("chevron", "down");
	renderComposite(cell.content.first() as ViewComposite);
	expect(cell.findViewContent(UIButton)[0]?.chevron).toBe("down");
});

test("Custom view composite with column content and styles", () => {
	const MyColumn = ViewComposite.define(
		{ foo: "", styles: { spacing: 8 } },
		(v, ...content) => <column spacing={v.styles.spacing}>{...content}</column>,
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

	console.log("Property on view composite itself");
	let viewComposite = cell.content.first() as ViewComposite;
	expect(viewComposite).toHaveProperty("foo", "bar");

	console.log("Render content of view composite");
	renderComposite(viewComposite);
	let column = viewComposite.findViewContent(UIColumn)[0];
	expect(column).toBe(viewComposite.body);
	expect(column).toHaveProperty("spacing", 8);

	console.log("Label content inside column");
	let labels = column!.content.toArray() as [UILabel, UILabel];
	expect(labels).toHaveLength(2);
	expect(labels[0].text?.toString()).toBe("foo");
	expect(labels[1].text?.toString()).toBe("bar");
});

test("Composite with defaults", async () => {
	const MyView = ViewComposite.define(
		{ foo: 123 },
		<label>{strf("Foo is %[foo]")}</label>,
	);
	renderTestView(ui.use(MyView).create());
	await expectOutputAsync({ text: "Foo is 123" });
});

test("Composite with ConfigOptions", async () => {
	class MyConfig extends ConfigOptions {
		static default = new MyConfig();
		foo = 123;
		bar = "bar";
	}
	const MyView = ViewComposite.define(
		{ config: MyConfig.default },
		<label>{strf("%[config.foo]:%[config.bar]")}</label>,
	);
	renderTestView(ui.use(MyView, { config: { foo: 321 } }).create());
	await expectOutputAsync({ text: "321:bar" });
});

test("Composite with content", async () => {
	const MyView = ViewComposite.define({}, (_values, ...content) => (
		<row>{...content}</row>
	));
	renderTestView(ui.use(MyView, ui.label("Foo")).create());
	await expectOutputAsync({ text: "Foo" });
});

test("Composite with bound content", async () => {
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
	let instance = ui.use(MyView, { foo: 123 }).create();
	renderTestView(instance);
	await expectOutputAsync({ text: "123" });
});

test("Composite with bound content using lazy string", async () => {
	const MyView = ViewComposite.define(
		{ foo: StringConvertible.EMPTY },
		<label>{strf("Foo is %[foo]")}</label>,
	);
	renderTestView(ui.use(MyView, { foo: strf("123") }).create());
	await expectOutputAsync({ text: "Foo is 123" });
});

test("Composite with event handler", async () => {
	let count = 0;
	class MyView extends ViewComposite {
		override defineView() {
			return (
				<cell>
					<button onClick="FooClicked">Foo</button>
				</cell>
			);
		}
		onFooClicked() {
			count++;
		}
	}
	renderTestView(new MyView());
	await clickOutputAsync({ type: "button" });
	expect(count).toBe(1);
});

test("Composite with bound content and text", async () => {
	const MyView = ViewComposite.define(
		{ foo: 0, bar: undefined as any },
		<row>
			<label>foo='{$view.bind("foo")}'</label>
			<label>bar='%[bar.foo]'</label>
			<label>baz='%[baz=bar.baz:uc]'</label>
			<label>nope_bound='{$view.bind("nope", "Nothing")}'</label>
		</row>,
	);
	let builder = ui.use(MyView, { foo: 123, bar: { foo: 456, baz: "abc" } });
	renderTestView(builder.create());
	let expectRow = await expectOutputAsync({ type: "row" });
	console.log("straight binding");
	expectRow.containing({ text: "foo='123'" }).toBeRendered();
	console.log("bar.foo");
	expectRow.containing({ text: "bar='456'" }).toBeRendered();
	console.log("baz=bar.baz,uc");
	expectRow.containing({ text: "baz='ABC'" }).toBeRendered();
	console.log("straight binding with default");
	expectRow.containing({ text: "nope_bound='Nothing'" }).toBeRendered();
});

test("Composite with bound content and text, translated", async () => {
	const Comp = ViewComposite.define(
		{ emails: { count: 0 } },
		<label>
			You have %[numEmails=emails.count:n] %[numEmails:plural|email|emails]
		</label>,
	);
	const preset1 = ui.use(Comp, { emails: { count: 1 } });
	const preset2 = ui.use(Comp, { emails: { count: 2 } });

	renderTestView(preset1.create());
	await new Promise((r) => setTimeout(r, 20));
	await expectOutputAsync({ text: "You have 1 email" });

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
	renderTestView(preset2.create());
	await expectOutputAsync({ text: "Je hebt 2 e-mails" });
});
