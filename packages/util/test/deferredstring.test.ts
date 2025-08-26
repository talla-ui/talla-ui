import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { DeferredString, fmt, StringConvertible } from "../dist/index.js";

beforeAll(() => {
	DeferredString.setErrorHandler((e) => {
		throw e;
	});
});
afterEach(() => {
	DeferredString.setI18nInterface(undefined);
});

test("String constructor", () => {
	expect(new DeferredString("Hello")).toBeInstanceOf(DeferredString);
	expect(new DeferredString("Hello").toString()).toBe("Hello");
	expect(new DeferredString("Hello").toUpperCase()).toBe("HELLO");
	expect(new DeferredString("Hello").slice(1, 3)).toBe("el");
});

test("fmt creates DeferredString", () => {
	console.log("With string argument");
	expect(fmt("Hello")).toBeInstanceOf(DeferredString);
	console.log("With number argument");
	expect(fmt(123)).toBeInstanceOf(DeferredString);
	console.log("With undefined argument");
	expect(fmt(undefined as any)).toBeInstanceOf(DeferredString);
});

test("fmt can be used with template literal", () => {
	console.log("With single string");
	expect(fmt`foo`).toBeInstanceOf(DeferredString);
	expect(String(fmt`foo`)).toBe("foo");
	console.log("With parameters - now uses {} placeholders");
	expect(String(fmt`foo ${123} bar`)).toBe("foo 123 bar");
});

describe("Formatting", () => {
	test("Basic placeholders", () => {
		// Simple sequential placeholders
		expect(String(fmt("Hello {}", "world"))).toBe("Hello world");
		expect(String(fmt("{} + {} = {}", 2, 3, 5))).toBe("2 + 3 = 5");

		// Numbered placeholders
		expect(String(fmt("Hello {0}", "world"))).toBe("Hello world");
		expect(String(fmt("{1} + {0} = {2}", 3, 2, 5))).toBe("2 + 3 = 5");

		// Property placeholders
		expect(String(fmt("Hello {name}!", { name: "John" }))).toBe("Hello John!");
		expect(String(fmt("User {id}: {name}", { id: 123, name: "Jane" }))).toBe(
			"User 123: Jane",
		);

		// Mixed placeholders
		expect(
			String(fmt("{name} is {age} years old", { name: "Bob", age: 25 })),
		).toBe("Bob is 25 years old");
	});

	test("Literal braces", () => {
		expect(String(fmt("{{"))).toBe("{");
		expect(String(fmt("}}"))).toBe("}");
		expect(String(fmt("{{hello}}"))).toBe("{hello}");
		expect(String(fmt("{{}} and {{}}"))).toBe("{} and {}");
		expect(String(fmt("Value: {{{0}}} = {0}", 42))).toBe("Value: {42} = 42");
	});

	test("String formatting (:s)", () => {
		expect(String(fmt("{:s}", "hello"))).toBe("hello");
		expect(String(fmt("{:s}", 123))).toBe("123");
		expect(String(fmt("{:s}", null))).toBe("");
		expect(String(fmt("{:s}", undefined))).toBe("");

		// Arrays get special treatment
		expect(String(fmt("{:s}", [1, 2, 3]))).toBe("1, 2, 3");
		expect(String(fmt("{:s}", ["a", "b", "c"]))).toBe("a, b, c");
		expect(String(fmt("{:s}", [null, undefined, "test"]))).toBe(", , test");

		// Dates get locale string
		const date = new Date("2023-01-15T10:30:00Z");
		expect(String(fmt("{:s}", date))).toBe(date.toLocaleString());
	});

	test("Number formatting (:d)", () => {
		// Default number formatting (up to 6 decimal places)
		expect(String(fmt("{:d}", 123))).toBe("123");
		expect(String(fmt("{:d}", 123.456))).toBe("123.456");
		expect(String(fmt("{:d}", 123.1234567))).toBe("123.123457"); // Rounded to 6 decimals
		expect(String(fmt("{:d}", 0))).toBe("0");
		expect(String(fmt("{:d}", 0.0001))).toBe("0.0001");

		// Numbers with trailing zeros
		expect(String(fmt("{:d}", 123.4))).toBe("123.4");

		// Invalid numbers
		expect(String(fmt("{:d}", NaN))).toBe("");
		expect(String(fmt("{:d}", "not a number"))).toBe("");

		// With precision specifier
		expect(String(fmt("{:.2d}", 123.456))).toBe("123.46");
		expect(String(fmt("{:.0d}", 123.456))).toBe("123");
		expect(String(fmt("{:.4d}", 123.1))).toBe("123.1");
	});

	test("Fixed-point number formatting (:f)", () => {
		expect(String(fmt("{:f}", 123.456))).toBe("123.456000"); // Default 6 decimals
		expect(String(fmt("{:.2f}", 123.456))).toBe("123.46");
		expect(String(fmt("{:.0f}", 123.456))).toBe("123");
		expect(String(fmt("{:.4f}", 123.1))).toBe("123.1000");

		// Zero and invalid values
		expect(String(fmt("{:.2f}", 0))).toBe("0.00");
		expect(String(fmt("{:.2f}", NaN))).toBe("0.00");
		expect(String(fmt("{:.2f}", "not a number"))).toBe("0.00");
	});

	test("Integer formatting (:i)", () => {
		expect(String(fmt("{:i}", 123.456))).toBe("123");
		expect(String(fmt("{:i}", 123.789))).toBe("124"); // Rounded
		expect(String(fmt("{:i}", -123.456))).toBe("-123");
		expect(String(fmt("{:i}", 0))).toBe("0");
		expect(String(fmt("{:i}", NaN))).toBe("0");
		expect(String(fmt("{:i}", "not a number"))).toBe("0");
	});

	test("Hexadecimal formatting (:x, :X)", () => {
		// Lowercase hex
		expect(String(fmt("{:x}", 255))).toBe("ff");
		expect(String(fmt("{:x}", 16))).toBe("10");
		expect(String(fmt("{:x}", 0))).toBe("0");

		// Uppercase hex
		expect(String(fmt("{:X}", 255))).toBe("FF");
		expect(String(fmt("{:X}", 16))).toBe("10");
		expect(String(fmt("{:X}", 171))).toBe("AB");

		// Invalid values
		expect(String(fmt("{:x}", NaN))).toBe("0");
		expect(String(fmt("{:X}", "not a number"))).toBe("0");
	});

	test("Boolean conditional formatting (:?)", () => {
		expect(String(fmt("{:?/yes/no}", true))).toBe("yes");
		expect(String(fmt("{:?/yes/no}", false))).toBe("no");
		expect(String(fmt("{:?/yes/no}", 1))).toBe("yes"); // Truthy
		expect(String(fmt("{:?/yes/no}", 0))).toBe("no"); // Falsy
		expect(String(fmt("{:?/yes/no}", ""))).toBe("no"); // Falsy
		expect(String(fmt("{:?/yes/no}", "hello"))).toBe("yes"); // Truthy
		expect(String(fmt("{:?/yes/no}", null))).toBe("no"); // Falsy
		expect(String(fmt("{:?/yes/no}", undefined))).toBe("no"); // Falsy

		// Missing options return empty string
		expect(String(fmt("{:?}", true))).toBe("");
		expect(String(fmt("{:?/only-true}", false))).toBe("");
	});

	test("Default plural formatting (:+) without i18n", () => {
		// Default English plural rules (1 = singular, others = plural)
		expect(String(fmt("{:+/item/items}", 0))).toBe("items");
		expect(String(fmt("{:+/item/items}", 1))).toBe("item");
		expect(String(fmt("{:+/item/items}", 2))).toBe("items");
		expect(String(fmt("{:+/item/items}", -1))).toBe("items");
		expect(String(fmt("{:+/item/items}", 1.5))).toBe("items");

		// Missing options
		expect(String(fmt("{:+}", 1))).toBe("");
		expect(String(fmt("{:+/only-singular}", 2))).toBe("");
	});

	test("Nested placeholders in format specifiers", () => {
		// Precision from another argument
		expect(String(fmt("{0:.{1}f}", 123.456, 2))).toBe("123.46");
		expect(
			String(fmt("{number:.{precision}f}", { number: 123.456, precision: 3 })),
		).toBe("123.456");

		// Boolean options from properties
		expect(
			String(
				fmt("{status:?/{yes}/{no}}", { status: true, yes: "OK", no: "ERROR" }),
			),
		).toBe("OK");
		expect(
			String(
				fmt("{status:?/{yes}/{no}}", { status: false, yes: "OK", no: "ERROR" }),
			),
		).toBe("ERROR");

		// Plural options from properties
		expect(
			String(
				fmt("{count:+/{singular}/{plural}}", {
					count: 1,
					singular: "file",
					plural: "files",
				}),
			),
		).toBe("file");
		expect(
			String(
				fmt("{count:+/{singular}/{plural}}", {
					count: 3,
					singular: "file",
					plural: "files",
				}),
			),
		).toBe("files");
	});

	test("Complex formatting combinations", () => {
		// Multiple placeholders with different formats
		expect(
			String(
				fmt(
					"User {id:i} has {balance:.2f} credits and {count} item{count:+//s}",
					{
						id: 123.7,
						balance: 45.678,
						count: 3,
					},
				),
			),
		).toBe("User 124 has 45.68 credits and 3 items");

		// Nested and sequential placeholders
		expect(String(fmt("Value: {0:.{1}f} ({0:X} hex)", 255.123, 1))).toBe(
			"Value: 255.1 (FF hex)",
		);

		// Boolean with complex conditions
		expect(
			String(
				fmt("Status: {active:?/Online ({count} users)/Offline}", {
					active: true,
					count: 42,
				}),
			),
		).toBe("Status: Online (42 users)");
	});

	test("Edge cases and error handling", () => {
		// Empty format string
		expect(String(fmt(""))).toBe("");

		// No arguments
		expect(String(fmt("Hello {}"))).toBe("Hello ");
		expect(String(fmt("Hello {0}"))).toBe("Hello ");
		expect(String(fmt("Hello {name}"))).toBe("Hello ");

		// Invalid placeholders
		expect(String(fmt("Hello {999}", "world"))).toBe("Hello ");
		expect(String(fmt("Hello {invalid}", { name: "world" }))).toBe("Hello ");

		// Objects without toString should trigger error handler
		const objectWithoutToString = Object.create(null);
		expect(() => String(fmt("{}", objectWithoutToString))).toThrow();

		// Unclosed placeholders
		expect(String(fmt("Hello {"))).toBe("Hello {");
		expect(String(fmt("Hello {name"))).toBe("Hello {name");
	});
});

describe("StringConvertible and additional edge cases", () => {
	test("StringConvertible.EMPTY constant", () => {
		expect(StringConvertible.EMPTY).toBe("");
		expect(String(fmt("{}", StringConvertible.EMPTY))).toBe("");
	});

	test("DeferredString inheritance from String", () => {
		const deferred = fmt("Hello World");

		// Should inherit String methods
		expect(deferred.charAt).toBeDefined();
		expect(deferred.toUpperCase).toBeDefined();
		expect(deferred.slice).toBeDefined();

		// But toString should be overridden
		expect(typeof deferred.toString).toBe("function");
	});

	test("Precision edge cases", () => {
		// Zero precision
		expect(String(fmt("{:.0d}", 123.789))).toBe("124");
		expect(String(fmt("{:.0f}", 123.789))).toBe("124");

		// Large precision
		expect(String(fmt("{:.10d}", 123.1))).toBe("123.1");
		expect(String(fmt("{:.10f}", 123.1))).toBe("123.1000000000");

		// Negative values
		expect(String(fmt("{:.2d}", -123.456))).toBe("-123.46");
		expect(String(fmt("{:.2f}", -123.456))).toBe("-123.46");
		expect(String(fmt("{:i}", -123.789))).toBe("-124");
	});

	test("Very large numbers and special values", () => {
		// Large numbers
		expect(String(fmt("{:d}", 1e20))).toBe("100000000000000000000");
		expect(String(fmt("{:f}", 1e6))).toBe("1000000.000000");

		// Very small numbers
		expect(String(fmt("{:d}", 1e-10))).toBe("0");
		expect(String(fmt("{:.2f}", 1e-10))).toBe("0.00");

		// Infinity
		expect(String(fmt("{:d}", Infinity))).toBe("Infinity");
		expect(String(fmt("{:f}", Infinity))).toBe("Infinity");
		expect(String(fmt("{:i}", Infinity))).toBe("Infinity");

		// Negative infinity
		expect(String(fmt("{:d}", -Infinity))).toBe("-Infinity");
	});

	test("fmt with existing DeferredString input", () => {
		const deferred1 = fmt("Hello {}");
		const deferred2 = fmt(deferred1, "World");

		expect(String(deferred2)).toBe("Hello World");
		expect(deferred2.getOriginal()).toBe("Hello {}");

		// No values should return the same instance
		const deferred3 = fmt(deferred1);
		expect(deferred3).toBe(deferred1);
	});
});

describe("Caching", () => {
	test("Cache invalidation", () => {
		let s = "Hello";
		let ls = new DeferredString("{:s}", [
			{
				toString() {
					return s;
				},
			},
		]);
		s = "foo";
		expect(String(ls)).toBe("foo");
		s = "bar";
		expect(String(ls)).toBe("foo");
		DeferredString.setI18nInterface(undefined);
		expect(String(ls)).toBe("bar");
	});
});
