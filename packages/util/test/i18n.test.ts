import { beforeEach, describe, expect, test } from "vitest";
import { DeferredString, fmt } from "../dist/index.js";

beforeEach(() => {
	DeferredString.setI18nInterface(undefined);
	DeferredString.setErrorHandler((err) => {
		throw err;
	});
});

describe("Set i18n provider with DeferredString directly", () => {
	test("No placeholders, class implementation", () => {
		class MyI18nProvider implements DeferredString.I18nProvider {
			isRTL() {
				return false;
			}
			getText(_text: string): string {
				return "foo";
			}
			getPlural(_n: number, _forms: string[]): string {
				throw Error();
			}
			format(_value: any, ..._type: string[]): string {
				throw Error();
			}
		}
		DeferredString.setI18nInterface(new MyI18nProvider());
		expect(fmt("abc").toString()).toBe("foo");
		DeferredString.setI18nInterface();
		expect(fmt("abc").toString()).toBe("abc");
	});

	test("Template literal with placeholder", () => {
		DeferredString.setI18nInterface({
			isRTL() {
				return false;
			},
			getText: () => "bar {} foo",
			getPlural: () => "",
			format: () => "",
		});
		expect(fmt`foo ${123} bar`.toString()).toBe("bar 123 foo");
	});

	test("Translate with tags", () => {
		DeferredString.setI18nInterface({
			isRTL() {
				return false;
			},
			getText: (s: string) => {
				let tag = s.match(/^\{\#(\w+)/)?.[1];
				switch (tag) {
					case "TAG":
						return "{#TAG}Le tag";
					case "BARE":
						return "Le bare";
				}
				return s;
			},
			getPlural: () => "",
			format: () => "",
		});
		expect(fmt("{#TAG The tag}").toString()).toBe("Le tag");
		expect(fmt("{#TAG string} with a tag").toString()).toBe("Le tag");
		expect(fmt("{#BARE}The bare").toString()).toBe("Le bare");
		expect(fmt("{#NO_MATCH}No match").toString()).toBe("No match");
		DeferredString.setI18nInterface();
		expect(fmt("{#BARE}").toString()).toBe("");
		expect(fmt("{#EMPTY:Nothing goes here}").toString()).toBe("");
		expect(fmt("{#SPACE A single space} ").toString()).toBe(" ");
	});
});

test("Pluralizer", () => {
	expect(fmt("{} book{0:+//s}", 0).toString()).toBe("0 books");
	expect(fmt("{} book{0:+//s}", 1).toString()).toBe("1 book");
	expect(fmt("{} book{0:+//s}", 1.5).toString()).toBe("1.5 books");
	expect(fmt("{} book{0:+//s}", 2).toString()).toBe("2 books");
	DeferredString.setI18nInterface({
		isRTL() {
			return false;
		},
		getText: (s: string) => (s === "{} book{0:+//s}" ? "{} livre{0:+//s}" : s),
		getPlural: (n: number, forms: string[]) => forms[n < 2 ? 0 : 1] || "",
		format: () => "",
	});
	expect(fmt("{} book{0:+//s}", 0).toString()).toBe("0 livre");
	expect(fmt("{} book{0:+//s}", 1).toString()).toBe("1 livre");
	expect(fmt("{} book{0:+//s}", 1.5).toString()).toBe("1.5 livre");
	expect(fmt("{} book{0:+//s}", 2).toString()).toBe("2 livres");
	expect(fmt("{} words in {} email{1:+//s}", 10, 1).toString()).toBe(
		"10 words in 1 email",
	);
	expect(fmt("{} words in {} email{1:+//s}", 10, 2).toString()).toBe(
		"10 words in 2 emails",
	);
});

test("Local format", () => {
	DeferredString.setI18nInterface({
		isRTL() {
			return false;
		},
		getText: (s) => s,
		getPlural: () => "",
		format: (value: any, ...type: string[]) => {
			return "{" + String(value) + ":" + type.join() + "}";
		},
	});
	expect(fmt("{:Ltest/format}", 123).toString()).toBe("{123:test,format}");
	expect(fmt("{foo:Ltest/format}", { foo: "bar" }).toString()).toBe(
		"{bar:test,format}",
	);
	DeferredString.setI18nInterface();
	expect(fmt("{:Ltest/format}", 123).toString()).toBe("???");
});

test("Default local format", () => {
	DeferredString.setI18nInterface({
		isRTL() {
			return false;
		},
		getText: (s) => s,
		getPlural: () => "",
		format: (value: any, type: string) => {
			if (!type) return "(" + value + ")";
			return "???";
		},
	});
	expect(fmt("{:L}", 1.2).toString()).toBe("(1.2)");
	DeferredString.setI18nInterface();
	expect(fmt("{:L}", 1.2).toString()).toBe("1.2");
});
