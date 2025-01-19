import { beforeAll, describe, expect, test } from "vitest";
import { AppContext, LazyString, strf } from "../../dist/index.js";

beforeAll(() => {
	AppContext.setErrorHandler((e) => {
		throw e;
	});
});

const _l = (s: string) => new LazyString(() => s);

test("String constructor", () => {
	expect(_l("Hello")).toBeInstanceOf(LazyString);
	expect(_l("Hello").toString()).toBe("Hello");
	expect(_l("Hello").toUpperCase()).toBe("HELLO");
	expect(_l("Hello").slice(1, 3)).toBe("el");
});

test("strf creates LazyString", () => {
	console.log("With string argument");
	expect(strf("Hello")).toBeInstanceOf(LazyString);
	console.log("With number argument");
	expect(strf(123)).toBeInstanceOf(LazyString);
	console.log("With undefined argument");
	expect(strf(undefined as any)).toBeInstanceOf(LazyString);
});

test("strf can be used with template literal", () => {
	console.log("With single string");
	expect(strf`foo`).toBeInstanceOf(LazyString);
	expect(String(strf`foo`)).toBe("foo");
	console.log("With parameters");
	expect(String(strf`foo ${123} bar`)).toBe("foo 123 bar");
});

describe("Formatting", () => {
	const _f = (s: string, ...args: any[]) =>
		_l(s)
			.format(...args)
			.toString();

	test("With no values", () => {
		expect(_f("Hello")).toBe("Hello");
		expect(_f("Hello", 1, 2)).toBe("Hello");
	});

	test("Basic pluralization (no i18n)", () => {
		expect(_f("Email#{/s}")).toBe("Emails");
		expect(_f("Email#{/s}", 0)).toBe("Emails");
		expect(_f("Email#{/s}", 1)).toBe("Email");
		expect(_f("Email#{/s}", 2)).toBe("Emails");
		expect(_f("%n Email#{/s}", 0)).toBe("0 Emails");
		expect(_f("%n Email#{/s}", 1)).toBe("1 Email");
		expect(_f("%n Email#{/s}", 2)).toBe("2 Emails");
		expect(_f("%n words in %n Email#2${/s}", 10, 0)).toBe(
			"10 words in 0 Emails",
		);
		expect(_f("%n words in %n Email#2${/s}", 10, 1)).toBe(
			"10 words in 1 Email",
		);
		expect(_f("%n words in %n Email#2${/s}", 10, 2)).toBe(
			"10 words in 2 Emails",
		);
	});

	test("%s", () => {
		expect(_f("%s")).toBe("");
		expect(_f("%s", "foo")).toBe("foo");
		expect(_f("%s", 1)).toBe("1");
		expect(_f("%s", ["a", "b"])).toBe("a, b");
		expect(_f("a%sc", "b")).toBe("abc");
		expect(() => {
			_f("%s", {});
		}).toThrow(/format/);
	});

	test("Placeholder using properties %[...]", () => {
		expect(_f("%[foo]")).toBe("");
		expect(_f("%[foo]", {})).toBe("");
		expect(_f("%[foo]", { foo: "bar" })).toBe("bar");
		expect(_f("%[foo]", { foo: 1 })).toBe("1");
		expect(_f("%[foo]+%[bar]", { foo: 1, bar: 2 })).toBe("1+2");
		expect(_f("Number %[foo] is %n", { foo: 1 }, 1)).toBe("Number 1 is 1");
	});

	test("Placeholder using properties with format %[...,...]", () => {
		expect(_f("%[foo:s]", { foo: "bar" })).toBe("bar");
		expect(_f("%[foo:.2f]", { foo: 1 })).toBe("1.00");
		expect(_f("%[foo:?|1|0]", { foo: true })).toBe("1");
		expect(_f("%[foo:?|1|0]", { foo: false })).toBe("0");
		expect(_f("%[foo:?|yes|]", { foo: true })).toBe("yes");
		expect(_f("%[foo:?||no]", { foo: false })).toBe("no");
		expect(_f("%[foo:plural|email|emails]", { foo: 0 })).toBe("emails");
		expect(_f("%[foo:plural|email|emails]", { foo: 1 })).toBe("email");
		expect(_f("%[foo:plural||s]", { foo: 2 })).toBe("s");
	});

	test("Placeholder using braces %{s}", () => {
		expect(_f("%{s}")).toBe("");
		expect(_f("%{s}", "foo")).toBe("foo");
		expect(_f("a%{s}c", "b")).toBe("abc");
		expect(_f("%{s|xyz}", "")).toBe("xyz");
		expect(_f("%{s|zzz}", undefined)).toBe("zzz");
	});

	test("Retrieve format arguments", () => {
		let ls = _l("%[foo] %i").format({ foo: "foo" }, 123);
		expect(String(ls)).toBe("foo 123");
		let args = ls.getFormatArgs();
		expect(args.length).toEqual(2);
		expect(args[0]).toHaveProperty("foo", "foo");
		expect(args[1]).toBe(123);
	});

	describe("Number/pad/length formatting", () => {
		// Number formats use flags, width, precision, and type
		// Flag - for left align
		// Flag 0 for zero-padding
		// Flag + for positive prefix
		// Flag <space> for positive prefix
		// Width is a number (`0` through `nnn`)
		// Precision is `.0` through `.nnn`
		// Type is any of ndiufFeEgGxXsc
		function match(fmt: [string, number, number?], ...s: string[]) {
			let [types, n, p] = fmt;
			let a = s.join("/").split("/");
			let flags = "/-/0/+/+0/- / ".split("/");
			let prec = p != null ? "." + p : "";
			for (let type of types) {
				let i = 0;
				for (let width of ["", "1", "4", "8"]) {
					if (i >= a.length) break;
					for (let flag of flags) {
						console.log("Checking %" + flag + width + prec + type, n);
						expect(_f("%" + flag + width + prec + type, n)).toBe(a[i++]);
					}
				}
			}
		}

		test("%d/i/u, n/N with whole number", () => {
			match(
				["diunN", 0], // no precision/length,
				"0/0/0/+0/+0/ 0/ 0", // width 0
				"0/0/0/+0/+0/ 0/ 0", // width 1, all same
				"   0/0   /0000/  +0/+000/ 0  /   0", // width 4, some padding
				"       0/0       /00000000/      +0/+0000000/ 0      /       0", // width 8
			);
			match(
				["diunN", 0, 2], // useless precision/length
				"0/0/0/+0/+0/ 0/ 0", // width 0
				"0/0/0/+0/+0/ 0/ 0", // width 1, all same
				"   0/0   /0000/  +0/+000/ 0  /   0", // width 4, some padding
			);
			match(
				["diunN", 10, 0], // explicit 0-precision
				"10/10/10/+10/+10/ 10/ 10", // width 0
				"10/10/10/+10/+10/ 10/ 10", // width 1, all same
				"  10/10  /0010/ +10/+010/ 10 /  10", // width 4, some padding
			);
			match(
				["diunN", 12345, 0], // explicit 0-precision
				"12345/12345/12345/+12345/+12345/ 12345/ 12345", // width 0
				"12345/12345/12345/+12345/+12345/ 12345/ 12345", // width 1, all same
				"12345/12345/12345/+12345/+12345/ 12345/ 12345", // width 4, still no padding
				"   12345/12345   /00012345/  +12345/+0012345/ 12345  /   12345", // width 8
			);
			match(
				["diu", 0.1], // rounded to 0 regardless of precision
				"0/0/0/+0/+0/ 0/ 0", // width 0
			);
		});

		test("%n/N", () => {
			match(
				["nN", 0.1], // no precision/length,
				"0.1/0.1/0.1/+0.1/+0.1/ 0.1/ 0.1", // width 0
				"0.1/0.1/0.1/+0.1/+0.1/ 0.1/ 0.1", // width 1, all same
				" 0.1/0.1 /00.1/+0.1/+0.1/ 0.1/ 0.1", // width 4, some padding
				"     0.1/0.1     /000000.1/    +0.1/+00000.1/ 0.1    /     0.1", // width 8
			);
			match(
				["nN", 0.1234567], // no precision/length, defaults to 6
				"0.123457/0.123457/0.123457/+0.123457/+0.123457/ 0.123457/ 0.123457",
			);
			match(
				["nN", 0.1234567, 3], // precision 3
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 0
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 1, all same
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 4, all same
				"   0.123/0.123   /0000.123/  +0.123/+000.123/ 0.123  /   0.123", // width 8
			);
			match(
				["nN", 123.4567, 2], // precision 2
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 0
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 1, all same
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 4, all same
				"  123.46/123.46  /00123.46/ +123.46/+0123.46/ 123.46 /  123.46", // width 8
			);
			match(
				["nN", -123.4567, 2], // precision 2
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 0
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 1, all same
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 4, all same
				" -123.46/-123.46 /-0123.46/ -123.46/-0123.46/-123.46 / -123.46", // width 8
			);
		});

		test("%f/F", () => {
			match(
				["fF", 123], // no precision/length, defaults to 6
				"123.000000/123.000000/123.000000/+123.000000/+123.000000/ 123.000000/ 123.000000", // width 0
				"123.000000/123.000000/123.000000/+123.000000/+123.000000/ 123.000000/ 123.000000", // width 1, all same
				"123.000000/123.000000/123.000000/+123.000000/+123.000000/ 123.000000/ 123.000000", // width 4, all same
				"123.000000/123.000000/123.000000/+123.000000/+123.000000/ 123.000000/ 123.000000", // width 8, all same
			);
			match(
				["fF", 0.01], // no precision/length, defaults to 6
				"0.010000/0.010000/0.010000/+0.010000/+0.010000/ 0.010000/ 0.010000", // width 0
			);
			match(
				["fF", 0.1234567], // no precision/length, defaults to 6
				"0.123457/0.123457/0.123457/+0.123457/+0.123457/ 0.123457/ 0.123457",
			);
			match(
				["fF", 0.1234567, 3], // precision 3
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 0
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 1, all same
				"0.123/0.123/0.123/+0.123/+0.123/ 0.123/ 0.123", // width 4, all same
				"   0.123/0.123   /0000.123/  +0.123/+000.123/ 0.123  /   0.123", // width 8
			);
			match(
				["fF", 123.4567, 2], // precision 2
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 0
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 1, all same
				"123.46/123.46/123.46/+123.46/+123.46/ 123.46/ 123.46", // width 4, all same
				"  123.46/123.46  /00123.46/ +123.46/+0123.46/ 123.46 /  123.46", // width 8
			);
			match(
				["fF", -123.4567, 2], // precision 2
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 0
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 1, all same
				"-123.46/-123.46/-123.46/-123.46/-123.46/-123.46/-123.46", // width 4, all same
				" -123.46/-123.46 /-0123.46/ -123.46/-0123.46/-123.46 / -123.46", // width 8
			);
		});

		test("%e/E", () => {
			match(
				["e", 123], // no precision/length, defaults to 6
				"1.230000e+2/1.230000e+2/1.230000e+2/+1.230000e+2/+1.230000e+2/ 1.230000e+2/ 1.230000e+2",
			);
			match(
				["E", 123], // no precision/length, defaults to 6
				"1.230000E+2/1.230000E+2/1.230000E+2/+1.230000E+2/+1.230000E+2/ 1.230000E+2/ 1.230000E+2",
			);
			match(
				["e", 0.01, 3], // precision 3
				"1.000e-2/1.000e-2/1.000e-2/+1.000e-2/+1.000e-2/ 1.000e-2/ 1.000e-2",
			);
		});

		test("%g/G", () => {
			match(
				["gG", 10], // no precision/length
				"10/10/10/+10/+10/ 10/ 10", // width 0
				"10/10/10/+10/+10/ 10/ 10", // width 1, all same
				"  10/10  /0010/ +10/+010/ 10 /  10", // width 4, some padding
			);
			match(
				["g", 0.0001], // precision doesn't matter here, exp >= -4
				"0.0001/0.0001/0.0001/+0.0001/+0.0001/ 0.0001/ 0.0001",
			);
			match(
				["g", 0.00001], // precision doesn't matter here, exp < -4
				"1e-5/1e-5/1e-5/+1e-5/+1e-5/ 1e-5/ 1e-5",
			);
			match(
				["G", 10, 1], // precision <= number of zeroes, use `E`
				"1E+1/1E+1/1E+1/+1E+1/+1E+1/ 1E+1/ 1E+1",
			);
			match(
				["G", 10, 0], // zero precision is same as one
				"1E+1/1E+1/1E+1/+1E+1/+1E+1/ 1E+1/ 1E+1",
			);
			match(
				["gG", 1000, 4], // precision > number of zeroes, use `F` without trailing 0
				"1000/1000/1000/+1000/+1000/ 1000/ 1000",
			);
			match(
				["gG", 333.333333, 5], // precision exp - P - 1 is used with `F` here
				"333.33/333.33/333.33/+333.33/+333.33/ 333.33/ 333.33",
			);
		});

		test("%x/X", () => {
			match(
				["x", 0xabc123],
				"abc123/abc123/abc123/+abc123/+abc123/ abc123/ abc123", // width 0
				"abc123/abc123/abc123/+abc123/+abc123/ abc123/ abc123", // width 1, all same
				"abc123/abc123/abc123/+abc123/+abc123/ abc123/ abc123", // width 4, all same
				"  abc123/abc123  /00abc123/ +abc123/+0abc123/ abc123 /  abc123", // width 8, padded
			);
			expect(_f("%X", 0xa)).toBe("A");
			expect(_f("%x")).toBe("0");
		});

		test("%c", () => {
			expect(_f("%c", 65)).toBe("A");
			expect(_f("%2c", 65)).toBe(" A");
			expect(_f("%-2c", 65)).toBe("A ");
			expect(_f("%c")).toBe("");
		});

		test("%s with padding/length", () => {
			expect(_f("%10s", "abc")).toBe("       abc");
			expect(_f("%-10s", "abc")).toBe("abc       ");

			expect(_f("%10.3s", "abcd")).toBe("       abc");
			expect(_f("%-10.3s", "abcd")).toBe("abc       ");
		});
	});

	describe("Non-standard formatting", () => {
		test("%%", () => {
			expect(_f("a%%b")).toBe("a%b");
			expect(_f("a%{%}b")).toBe("a%b");
			expect(_f("%%%%")).toBe("%%");
			expect(_f("%s%%%%%n", "a", 1)).toBe("a%%1");
		});

		test("%_", () => {
			expect(_f("%_")).toBe("");
			expect(_f("%s%_%s", "a", "b", "c")).toBe("ac");
		});

		test("%{?|x|y}", () => {
			expect(_f("%{?|x|y}", 0)).toBe("y");
			expect(_f("%{?|x|y}", 1)).toBe("x");
			expect(_f("%{?||yy}", 0)).toBe("yy");
			expect(_f("%{?|xx}", 1)).toBe("xx");
		});

		test("%{?|x}", () => {
			expect(_f("%{?|x}", undefined)).toBe("");
			expect(_f("%{?|x}", "")).toBe("");
			expect(_f("%{?|x}", 0)).toBe("");
			expect(_f("%{?|x}", 1)).toBe("x");
			expect(_f("%{?|x}", "abc")).toBe("x");
		});

		test("%{uc} / %{lc}", () => {
			expect(_f("%{uc}", "Foo")).toBe("FOO");
			expect(_f("%{lc}", "Foo")).toBe("foo");
			expect(_f("%{uc}%{lc}")).toBe("");
		});

		test("Invalid format %{foo}", () => {
			expect(() => _f("%{foo}")).toThrow();
		});

		test("Positional parameter %1$s", () => {
			expect(_f("%s %2$s %s %1$s %100$s", "a", "b")).toBe("a b b a ");
		});
	});
});

describe("Caching", () => {
	test("Cache invalidation", () => {
		let s = "Hello";
		let ls = new LazyString(() => "%s")
			.format({
				toString() {
					return s;
				},
			})
			.cache();
		s = "foo";
		expect(String(ls)).toBe("foo");
		s = "bar";
		expect(String(ls)).toBe("foo");
		LazyString.invalidateCache();
		expect(String(ls)).toBe("bar");
	});
});
