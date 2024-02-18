import {
	app,
	bound,
	I18nProvider,
	LazyString,
	ManagedObject,
	strf,
} from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("I18n", (scope) => {
	scope.beforeEach(() => {
		expect(app.i18n).toBeUndefined();
	});
	scope.afterEach(() => {
		expect(app.i18n).toBeUndefined();
		LazyString.setI18nInterface();
	});

	class BaseI18nProvider implements I18nProvider {
		getAttributes(): Readonly<I18nProvider.Attributes> {
			return { locale: "test" };
		}
		getText(text: string): string {
			throw new Error("Method not implemented.");
		}
		getPlural(value: number, forms: string[]): string {
			throw new Error("Method not implemented.");
		}
		format(value: any, ...types: any[]): string {
			throw new Error("Method not implemented.");
		}
	}

	describe("Set with LazyString directly", () => {
		test("No placeholders", () => {
			class MyI18nProvider extends BaseI18nProvider {
				override getText() {
					return "foo";
				}
			}
			LazyString.setI18nInterface(new MyI18nProvider() as any);
			expect(strf("abc")).asString().toBe("foo");
			LazyString.setI18nInterface();
			expect(strf("abc")).asString().toBe("abc");
		});

		test("Template literal with placeholder", () => {
			class MyI18nProvider extends BaseI18nProvider {
				override getText() {
					return "bar %s foo";
				}
			}
			LazyString.setI18nInterface(new MyI18nProvider() as any);
			expect(strf`foo ${123} bar`)
				.asString()
				.toBe("bar 123 foo");
		});

		test("Translate with tags", () => {
			class MyI18nProvider extends BaseI18nProvider {
				override getText(s: string) {
					let tag = s.match(/^##(\w+)/)?.[1];
					switch (tag) {
						case "TAG":
							return "##TAG Le tag";
						case "BARE":
							return "Le bare";
					}
					return s;
				}
			}
			LazyString.setI18nInterface(new MyI18nProvider() as any);
			expect(strf("##TAG The tag")).asString().toBe("Le tag");
			expect(strf("##TAG:string with a tag")).asString().toBe("Le tag");
			expect(strf("##BARE The bare")).asString().toBe("Le bare");
			expect(strf("##BARE:With description:The bare"))
				.asString()
				.toBe("Le bare");
			expect(strf("##NO_MATCH No match")).asString().toBe("No match");
			LazyString.setI18nInterface();
			expect(strf("##BARE")).asString().toBe("");
			expect(strf("##EMPTY:Nothing goes here")).asString().toBe("");
			expect(strf("##SPACE:A single space: ")).asString().toBe(" ");
			expect(strf("##STARTS_WITH_SPACE:: abc")).asString().toBe(" abc");
		});
	});

	test("Set with global context", () => {
		class MyI18nProvider extends BaseI18nProvider {
			constructor(private _s: string) {
				super();
			}
			override getText() {
				return this._s;
			}
		}
		let i18n = new MyI18nProvider("foo");
		app.i18n = i18n as any;
		expect(strf("abc")).asString().toBe("foo");
		i18n = new MyI18nProvider("bar");
		app.i18n = i18n as any;
		expect(strf("abc")).asString().toBe("bar");
		app.i18n = undefined;
		expect(strf("abc")).asString().toBe("abc");
	});

	test("Strf with LazyString argument", () => {
		let a = strf("%s", "a");
		let b = strf(a);
		expect(b).toBe(a);
	});

	test("Decimal separator", () => {
		class MyI18nProvider extends BaseI18nProvider {
			override getAttributes = () => ({
				locale: "test",
				decimalSeparator: ",",
			});
			override getText = (s: string) => s;
		}
		LazyString.setI18nInterface(new MyI18nProvider() as any);
		expect(strf("%.2f", 1)).asString().toBe("1,00");
		LazyString.setI18nInterface();
		expect(strf("%.2f", 1)).asString().toBe("1.00");
	});

	test("Pluralizer", () => {
		class MyI18nProvider extends BaseI18nProvider {
			override getText = (s: string) =>
				s === "%n book#{/s}" ? "%n livre#{/s}" : s;
			override getPlural = (n: number, forms: string[]) =>
				forms[n < 2 ? 0 : 1] || "";
		}
		expect(strf("%n book#{/s}", 0)).asString().toBe("0 books");
		expect(strf("%n book#{/s}", 1)).asString().toBe("1 book");
		expect(strf("%n book#{/s}", 1.5)).asString().toBe("1.5 books");
		expect(strf("%n book#{/s}", 2)).asString().toBe("2 books");
		LazyString.setI18nInterface(new MyI18nProvider() as any);
		expect(strf("%n book#{/s}", 0)).asString().toBe("0 livre");
		expect(strf("%n book#{/s}", 1)).asString().toBe("1 livre");
		expect(strf("%n book#{/s}", 1.5)).asString().toBe("1.5 livre");
		expect(strf("%n book#{/s}", 2)).asString().toBe("2 livres");
		expect(strf("%n words in %n Email#2${/s}", 10, 1))
			.asString()
			.toBe("10 words in 1 Email");
		expect(strf("%n words in %n Email#2${/s}", 10, 2))
			.asString()
			.toBe("10 words in 2 Emails");
	});

	test("Local format", () => {
		class MyI18nProvider extends BaseI18nProvider {
			override getText = (s: string) => s;
			override format(value: any, ...type: string[]) {
				return "{" + String(value) + ":" + type.join() + "}";
			}
		}
		LazyString.setI18nInterface(new MyI18nProvider() as any);
		expect(strf("%{local|test|format}", 123))
			.asString()
			.toBe("{123:test,format}");
		expect(strf("%[foo:local|test|format]", { foo: "bar" }))
			.asString()
			.toBe("{bar:test,format}");
		LazyString.setI18nInterface();
		expect(strf("%{local|test|format}", 123)).asString().toBe("???");
	});

	test("Local format binding", () => {
		class MyI18nProvider extends BaseI18nProvider {
			override getText = (s: string) => s;
			override format(value: any, ...type: string[]) {
				return "{" + String(value) + ":" + type.join() + "}";
			}
		}
		LazyString.setI18nInterface(new MyI18nProvider() as any);
		let parent: any = new ManagedObject();
		parent.value = 123;
		parent.child = parent.attach(new ManagedObject());
		bound("value").local("test", "format").bindTo(parent.child, "value");
		expect(parent.child).toHaveProperty("value").toBe("{123:test,format}");
	});
});
