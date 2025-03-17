import { describe, expect, test } from "vitest";
import { ObjectReader } from "../dist/index.js";

describe("ObjectReader", () => {
	test("Constructor", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
		});
		expect(reader).toHaveProperty("schema");
		expect(reader.schema).toHaveProperty("name");
		expect(reader.read({ name: "Foo" })[0]).toHaveProperty("name", "Foo");
	});

	test("Any type validation", () => {
		let reader = new ObjectReader({ foo: {}, bar: {} });
		let result = reader.read({ foo: 1, bar: "2", baz: true } as any);
		if (!result[0]) throw Error();
		let obj: ObjectReader.Object<typeof reader> = result[0];
		expect(obj).toHaveProperty("foo", 1);
		expect(obj).toHaveProperty("bar", "2");
		expect(obj).not.toHaveProperty("baz");
	});

	test("Custom function validation", () => {
		let reader = new ObjectReader({
			name: {
				isParsed: (v, f) =>
					v === "Foo" && f === "name" ? { value: "yes" } : { error: "no" },
			},
		});
		expect(reader.read({ name: "Foo" })[0]).toHaveProperty("name", "yes");
		expect(reader.read({ name: "Bar" })[1]).toHaveProperty("name");
		expect(String(reader.read({ name: "Bar" })[1].name)).toBe("Error: no");
	});

	test("Custom value validation", () => {
		let reader = new ObjectReader({
			type: { isValue: { match: ["A", "B", "C"] } },
		});
		expect(reader.read({ type: "A" })[0]).toHaveProperty("type", "A");
		expect(reader.read({ type: "Foo" })[1]).toHaveProperty("type");
		expect(reader.read({ type: "Foo" })[1].type).toBeInstanceOf(Error);
	});

	test("String validation", () => {
		let reader = new ObjectReader({
			name: {
				isString: {
					min: { length: 2 },
					max: { length: 10 },
				},
			},
		});
		expect(reader.read({ name: "John" })[0]).toHaveProperty("name", "John");
		expect(reader.read({ name: "A" })[1]).toHaveProperty("name");
		expect(reader.read({ name: "A" })[1].name).toBeInstanceOf(Error);
		expect(reader.read({ name: "VeryLongName" })[1]).toHaveProperty("name");
		expect(reader.read({ name: "VeryLongName" })[1].name).toBeInstanceOf(Error);
	});

	test("String validation: required", () => {
		let reader = new ObjectReader({
			name: { isString: {} as { required?: true } },
		});
		expect(reader.read({ name: "" })[0]).toHaveProperty("name", "");
		reader.schema.name.isString.required = true;
		expect(reader.read({ name: "Foo" })[0]).toHaveProperty("name", "Foo");
		expect(reader.read({ name: "" })[1]).toHaveProperty("name");
		expect(reader.read({ name: "" })[1].name).toBeInstanceOf(Error);
	});

	test("String and value validation", () => {
		let reader = new ObjectReader({
			type: { isString: {}, isValue: { match: ["A", "B", "C", 123] } },
		});
		expect(reader.read({ type: "A" })[0]).toHaveProperty("type", "A");
		expect(reader.read({ type: 123 })[1]).toHaveProperty("type");
		expect(reader.read({ type: 123 })[1].type).toBeInstanceOf(Error);
	});

	test("Regexp validation", () => {
		let reader = new ObjectReader({
			email: {
				isString: { match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/ },
			},
		});
		expect(reader.read({ email: "foo@bar" })[0]).toHaveProperty(
			"email",
			"foo@bar",
		);
		expect(reader.read({ email: "A" })[1]).toHaveProperty("email");
		expect(reader.read({ email: "A" })[1].email).toBeInstanceOf(Error);
		expect(reader.read({ email: 123 })[1]).toHaveProperty("email");
		expect(reader.read({ email: 123 })[1].email).toBeInstanceOf(Error);
	});

	test("Number validation", () => {
		let reader = new ObjectReader({
			num: {
				isNumber: {
					min: { value: 0 },
					max: { value: 120 },
				},
			},
		});
		expect(reader.read({ num: 25 })[0]).toHaveProperty("num", 25);
		expect(reader.read({ num: "25" })[0]).toHaveProperty("num", 25);
		expect(reader.read({ num: "25.5" })[0]).toHaveProperty("num", 25.5);
		expect(reader.read({ num: -1 })[1]).toHaveProperty("num");
		expect(reader.read({ num: -1 })[1].num).toBeInstanceOf(Error);
		expect(reader.read({ num: 121 })[1]).toHaveProperty("num");
		expect(reader.read({ num: 121 })[1].num).toBeInstanceOf(Error);
	});

	test("Integer validation", () => {
		let reader = new ObjectReader({
			num: {
				isNumber: {
					integer: true,
					min: { value: 0 },
					max: { value: 120 },
				},
			},
		});
		expect(reader.read({ num: 25 })[0]).toHaveProperty("num", 25);
		expect(reader.read({ num: "25" })[0]).toHaveProperty("num", 25);
		expect(reader.read({ num: 25.5 })[1]).toHaveProperty("num");
		expect(reader.read({ num: 25.5 })[1].num).toBeInstanceOf(Error);
		expect(reader.read({ num: "25.5" })[1]).toHaveProperty("num");
		expect(reader.read({ num: "25.5" })[1].num).toBeInstanceOf(Error);
		expect(reader.read({ num: -1 })[1]).toHaveProperty("num");
		expect(reader.read({ num: -1 })[1].num).toBeInstanceOf(Error);
		expect(reader.read({ num: 121 })[1]).toHaveProperty("num");
		expect(reader.read({ num: 121 })[1].num).toBeInstanceOf(Error);
	});

	test("Positive number validation", () => {
		let reader = new ObjectReader({
			num: { isNumber: { positive: true } },
		});
		expect(reader.read({ num: 1 })[0]).toHaveProperty("num", 1);
		expect(reader.read({ num: "0" })[0]).toHaveProperty("num", 0);
		expect(reader.read({ num: -1 })[1]).toHaveProperty("num");
		expect(reader.read({ num: -1 })[1].num).toBeInstanceOf(Error);
	});

	test("Nonzero number validation", () => {
		let reader = new ObjectReader({
			num: { isNumber: { nonzero: true } },
		});
		expect(reader.read({ num: 1 })[0]).toHaveProperty("num", 1);
		expect(reader.read({ num: 0 })[1]).toHaveProperty("num");
		expect(reader.read({ num: 0 })[1].num).toBeInstanceOf(Error);
	});

	test("Boolean validation", () => {
		let reader = new ObjectReader({
			agree: { isBoolean: { true: true } },
		});
		expect(reader.read({ agree: true })[0]).toHaveProperty("agree", true);
		expect(reader.read({ agree: false })[1]).toHaveProperty("agree");
		expect(reader.read({ agree: false })[1].agree).toBeInstanceOf(Error);
		expect(reader.read({ agree: "true" })[1]).toHaveProperty("agree");
		expect(reader.read({ agree: "true" })[1].agree).toBeInstanceOf(Error);
	});

	test("Date validation", () => {
		let reader = new ObjectReader({
			birthDate: {
				isDate: {
					min: { date: new Date("1900-01-01") },
					max: { date: new Date("2099-12-31") },
				},
			},
		});
		expect(
			reader.read({ birthDate: new Date("1983-01-01") })[0],
		).toHaveProperty("birthDate", expect.any(Date));
		expect(
			reader.read({ birthDate: +new Date("1983-01-01") })[0],
		).toHaveProperty("birthDate", expect.any(Date));
		expect(reader.read({ birthDate: "2023-01-23" })[0]).toHaveProperty(
			"birthDate",
			expect.any(Date),
		);
		expect(reader.read({ birthDate: "1899-12-31" })[1]).toHaveProperty(
			"birthDate",
			expect.any(Error),
		);
		expect(reader.read({ birthDate: "2100-01-01" })[1]).toHaveProperty(
			"birthDate",
			expect.any(Error),
		);
		expect(reader.read({ birthDate: "123" })[1]).toHaveProperty(
			"birthDate",
			expect.any(Error),
		);
		expect(reader.read({ birthDate: false })[1]).toHaveProperty(
			"birthDate",
			expect.any(Error),
		);
	});

	test("Array validation", () => {
		let reader = new ObjectReader({
			numbers: {
				isArray: {
					items: { isNumber: { max: { value: 100 } } },
					min: { length: 2 },
					max: { length: 5 },
				},
			},
		});
		expect(reader.read({ numbers: [1, 2, 3] })[0]).toHaveProperty("numbers");
		expect(reader.read({ numbers: [1] })[1]).toHaveProperty("numbers");
		expect(reader.read({ numbers: [1, 2, 3, 4, 5, 6] })[1]).toHaveProperty(
			"numbers",
		);
		expect(reader.read({ numbers: [1, 101] })[1]).toHaveProperty("numbers");
	});

	test("Object validation", () => {
		let reader = new ObjectReader({
			user: {
				isObject: {
					schema: {
						id: { isNumber: {} },
						name: { isString: {} },
					},
				},
			},
		});
		expect(reader.read({ user: { id: 1, name: "John" } })[0]).toHaveProperty(
			"user",
		);
		expect(
			reader.read({ user: { id: 1, name: "John" } })[0]!.user,
		).toHaveProperty("id", 1);
		expect(reader.read({ user: { id: null, name: "John" } })[1]).toHaveProperty(
			"user",
		);
		expect(
			reader.read({ user: { id: null, name: "John" } })[1].user,
		).toBeInstanceOf(Error);
		expect(reader.read({ user: [] } as any)[1]).toHaveProperty("user");
		expect(reader.read({ user: [] } as any)[1].user).toBeInstanceOf(Error);
		expect(reader.read([] as any)[1]).toHaveProperty("_");
		expect((reader.read([] as any)[1] as any)._).toBeInstanceOf(Error);
	});

	test("Key-value record validation", () => {
		let userReader = new ObjectReader({
			id: { isNumber: {} },
			name: { isString: {} },
		});
		let reader = new ObjectReader({
			users: {
				isRecord: { values: { isObject: { reader: userReader } } },
			},
		});
		let users: Record<string, unknown> = {
			"1": { id: 1, name: "alice" },
			"2": { id: 2, name: "beatrice" },
		};
		expect(reader.read({ users })[0]).toHaveProperty("users");
		expect(reader.read({ users })[0]!.users).toHaveProperty("1");
		expect(reader.read({ users })[0]!.users["1"]).toHaveProperty("id", 1);
		expect(reader.read({ users })[0]!.users).toHaveProperty("2");
		expect(reader.read({ users })[0]!.users["2"]).toHaveProperty(
			"name",
			"beatrice",
		);
		users["3"] = 123;
		expect(reader.read({ users })[1]).toHaveProperty("users");
		expect(reader.read({ users })[1].users).toBeInstanceOf(Error);
	});

	test("Optional fields", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			age: { isOptional: true, isNumber: { integer: true, positive: true } },
		});
		expect(reader.read({ name: "John" })[0]).toHaveProperty("name", "John");
		expect(reader.read({ name: "John" })[0]).toHaveProperty("age", undefined);
		expect(reader.read({ name: "John", age: 25 })[0]).toHaveProperty("age", 25);
	});

	test("Optional number with empty string", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			age: { isOptional: true, isNumber: { integer: true, positive: true } },
		});
		// Empty string should be treated as undefined for optional numbers
		expect(reader.read({ name: "John", age: "" })[0]).toHaveProperty(
			"age",
			undefined,
		);
	});

	test("Optional date with empty string", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			birthDate: {
				isOptional: true,
				isDate: {},
			},
		});
		// Empty string should be treated as undefined for optional dates
		expect(reader.read({ name: "John", birthDate: "" })[0]).toHaveProperty(
			"birthDate",
			undefined,
		);
	});

	test("Custom errors", () => {
		let reader = new ObjectReader({
			str: {
				isString: {
					err: "ERR",
					min: { length: 1, err: "ERR_TOO_SHORT" },
					max: { length: 2, err: "ERR_TOO_LONG" },
				},
			},
			num: {
				isNumber: {
					err: "ERR",
					min: { value: 0, err: "ERR_BELOW" },
					max: { value: 120, err: "ERR_ABOVE" },
				},
			},
			arr: {
				isArray: {
					items: { isString: {} },
					err: "ERR",
					min: { length: 1, err: "ERR_TOO_SHORT" },
					max: { length: 2, err: "ERR_TOO_LONG" },
				},
			},
		});
		let errors = reader.read({ str: 0, num: "", arr: {} })[1];
		expect(String(errors.str)).toBe("Error: ERR");
		expect(String(errors.num)).toBe("Error: ERR");
		expect(String(errors.arr)).toBe("Error: ERR");
		let low = reader.read({ str: "", num: -1, arr: [] })[1];
		expect(String(low.str)).toBe("Error: ERR_TOO_SHORT");
		expect(String(low.num)).toBe("Error: ERR_BELOW");
		expect(String(low.arr)).toBe("Error: ERR_TOO_SHORT");
		let high = reader.read({ str: "FOO", num: 1000, arr: ["", "", ""] })[1];
		expect(String(high.str)).toBe("Error: ERR_TOO_LONG");
		expect(String(high.num)).toBe("Error: ERR_ABOVE");
		expect(String(high.arr)).toBe("Error: ERR_TOO_LONG");
	});

	test("readField method", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			age: { isNumber: {} },
		});
		expect(reader.readField({ name: "John", age: 25 }, "name")[0]).toBe("John");
		expect(reader.readField({ name: "John", age: 25 }, "age")[0]).toBe(25);
		expect(
			reader.readField({ name: "John", age: "-" }, "age")[1],
		).toBeInstanceOf(Error);
		expect(reader.readField([] as any, "age")[1]).toBeInstanceOf(Error);
		expect(() => {
			reader.readField({} as any, "foo" as any);
		}).toThrowError();
	});

	test("Recursion prevention", () => {
		let schema: ObjectReader.Schema = {
			foo: { isObject: { schema: {} } },
		};
		(schema as any).foo.isObject.schema = schema;
		let reader = new ObjectReader(schema as any);
		let object: any = {};
		object.foo = object; // does match, but is recursive.
		let result = reader.read(object);
		expect(result[0]).toBeUndefined();
	});

	test("readJSONString method", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			age: { isNumber: {} },
		});
		expect(reader.readJSONString('{"name":"John","age":25}')[0]).toHaveProperty(
			"name",
			"John",
		);
		expect(
			reader.readJSONString('{"name":"John","age":"-"}')[1].age,
		).toBeInstanceOf(Error);
		expect((reader.readJSONString("invalid json")[1] as any)._).toBeInstanceOf(
			Error,
		);
	});

	test("partial reader", () => {
		let reader = new ObjectReader({
			name: { isString: {} },
			age: { isNumber: {} },
			email: { isString: { match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } },
		});
		let partial = reader.partial(["name", "email"]);
		expect(Object.keys(partial.schema)).toEqual(["name", "email"]);
		expect(
			partial.read({ name: "John", age: 42, email: "john@example.com" })[0],
		).toEqual({
			name: "John",
			email: "john@example.com",
		});
	});
});
