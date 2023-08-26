import { describe, expect, test } from "../../dist/index.js";
// ... from "@desk-framework/test"

describe("Assertions", () => {
	// uncomment this to include a failing test case:

	// test("Failing assertion", () => {
	// 	expect(1).toBe("1");
	// });

	test("toBe", () => {
		expect(1).toBe(1);
		expect(1).not.toBe("1");
		expect(1).toBeOneOf(1, 2, 3);
	});

	test("toEqual", () => {
		expect(1).toEqual(1);
		expect(1).toEqual("1");
		expect(1).toEqualOneOf("1", "2", "3");
	});

	test("Numeric", () => {
		expect(1).toBeLessThan(2);
		expect(2).toBeGreaterThan(1);
		expect(1).toBeLessThanOrEqualTo(2);
		expect(1).toBeLessThanOrEqualTo(1);
		expect(1).toBeGreaterThanOrEqualTo(1);
		expect(2).toBeGreaterThanOrEqualTo(1);
	});

	test("Boolean", () => {
		let t = true;
		let f = false;
		expect(t).toBe(true);
		expect(f).toBe(false);
		expect(t).toBeTruthy();
		expect("t").toBeTruthy();
		expect(1).toBeTruthy();
		expect(f).toBeFalsy();
		expect("").toBeFalsy();
		expect(0).toBeFalsy();
	});

	test("Undefined", () => {
		expect(1).toBeDefined();
		expect(undefined).toBeUndefined();
		expect(null).not.toBeUndefined();
		expect(null).toBeNull();
		expect(undefined).not.toBeNull();
	});

	test("String regexp", () => {
		let s = "abc";
		expect(s).toMatchRegExp(/^a/);
		expect(s).not.toMatchRegExp(/\d/);
	});

	test("Types", () => {
		expect("").toBeTypeOf("string");
		expect(123).toBeTypeOf("number");

		let a = [1, 2, 3];
		let b: never[] = [];
		expect(a).toBeArray();
		expect(b).toBeArray();
		expect(a).toBeArray(3);
		expect(b).toBeArray(0);
		expect(a).toBeArray([1, 2, 3]);
		expect(b).toBeArray([]);

		class X {}
		expect(new X()).toBeInstanceOf(X);
	});

	test("Object properties", () => {
		let o = { a: 1, b: 2 };
		expect(o).toHaveProperty("a");
		expect(o).toHaveProperty("b");
		expect(o).not.toHaveProperty("c");

		expect(o).toHaveProperty("a").toBe(1);
		expect(o).toHaveProperty("b").not.toBeTypeOf("string");
	});

	test("Object methods", () => {
		let o = {
			foo: "bar",
			bar(s: string) {
				return s + this.foo;
			},
		};
		expect(o).toHaveMethod("bar").not.toThrowError("x").toBe("xbar");
	});

	test("Error handling", () => {
		let fnNoThrow = () => 123;
		let fnThrows = () => {
			throw Error("ERROR");
		};
		expect(fnNoThrow).not.toThrowError();
		expect(fnThrows)
			.toThrowError()
			.toHaveProperty("message")
			.toMatchRegExp(/ERROR/);

		expect(() => {
			try {
				fnThrows();
			} catch {}
		}).not.toThrowError();
	});

	test("Error handling, async", async () => {
		let fnThrows = async () => {
			throw Error("ERROR");
		};
		let fnNoThrow = async () => 123;
		await expect(fnThrows).toThrowErrorAsync();
		await expect(fnNoThrow).not.toThrowErrorAsync();

		await expect(async () => {
			try {
				await fnThrows();
			} catch {}
		}).not.toThrowError();
	});

	test("Conversion", () => {
		let s = "123";
		expect(s).asArray().toBeArray(["1", "2", "3"]);
		expect(s).asBoolean().toBe(true);
		expect(null).asBoolean().toBe(false);
		expect(123).asString().toBe("123");
		expect("").asJSONString().toBe('""');
		expect([1]).asJSONString().toBe("[1]");
	});
});
