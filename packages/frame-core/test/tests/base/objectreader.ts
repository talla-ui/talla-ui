import { ObjectReader } from "../../../dist/index.js";
import { describe, expect, test } from "@desk-framework/frame-test";

describe("ObjectReader", () => {
	test("Constructor", () => {
		let reader = new ObjectReader({
			name: { string: {} },
		});
		expect(reader).toHaveProperty("schema").toHaveProperty("name");
		expect(reader.read({ name: "Foo" })[0])
			.toHaveProperty("name")
			.toBe("Foo");
	});

	test("Any type validation", () => {
		let reader = new ObjectReader({ foo: {}, bar: {} });
		let result = reader.read({ foo: 1, bar: "2", baz: true } as any);
		expect(result[0]).toHaveProperty("foo").toBe(1);
		expect(result[0]).toHaveProperty("bar").toBe("2");
		expect(result[0]).not.toHaveProperty("baz");
	});

	test("Custom function validation", () => {
		let reader = new ObjectReader({
			name: {
				validate: (v, f) =>
					v === "Foo" && f === "name" ? { value: "yes" } : { error: "no" },
			},
		});
		expect(reader.read({ name: "Foo" })[0])
			.toHaveProperty("name")
			.toBe("yes");
		expect(reader.read({ name: "Bar" })[1])
			.toHaveProperty("name")
			.asString()
			.toBe("Error: no");
	});

	test("Custom value validation", () => {
		let reader = new ObjectReader({
			type: { value: { match: ["A", "B", "C"] } },
		});
		expect(reader.read({ type: "A" })[0])
			.toHaveProperty("type")
			.toBe("A");
		expect(reader.read({ type: "Foo" })[1])
			.toHaveProperty("type")
			.toBeInstanceOf(Error);
	});

	test("String validation", () => {
		let reader = new ObjectReader({
			name: {
				string: {
					min: { length: 2 },
					max: { length: 10 },
				},
			},
		});
		expect(reader.read({ name: "John" })[0])
			.toHaveProperty("name")
			.toBe("John");
		expect(reader.read({ name: "A" })[1])
			.toHaveProperty("name")
			.toBeInstanceOf(Error);
		expect(reader.read({ name: "VeryLongName" })[1])
			.toHaveProperty("name")
			.toBeInstanceOf(Error);
	});

	test("String validation: required", () => {
		let reader = new ObjectReader({
			name: { string: {} as { required?: true } },
		});
		expect(reader.read({ name: "" })[0])
			.toHaveProperty("name")
			.toBe("");
		reader.schema.name.string.required = true;
		expect(reader.read({ name: "Foo" })[0])
			.toHaveProperty("name")
			.toBe("Foo");
		expect(reader.read({ name: "" })[1])
			.toHaveProperty("name")
			.toBeInstanceOf(Error);
	});

	test("String and value validation", () => {
		let reader = new ObjectReader({
			type: { string: {}, value: { match: ["A", "B", "C", 123] } },
		});
		expect(reader.read({ type: "A" })[0])
			.toHaveProperty("type")
			.toBe("A");
		expect(reader.read({ type: 123 })[1])
			.toHaveProperty("type")
			.toBeInstanceOf(Error);
	});

	test("Regexp validation", () => {
		let reader = new ObjectReader({
			email: {
				string: { match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/ },
			},
		});
		expect(reader.read({ email: "foo@bar" })[0])
			.toHaveProperty("email")
			.toBe("foo@bar");
		expect(reader.read({ email: "A" })[1])
			.toHaveProperty("email")
			.toBeInstanceOf(Error);
		expect(reader.read({ email: 123 })[1])
			.toHaveProperty("email")
			.toBeInstanceOf(Error);
	});

	test("Number validation", () => {
		let reader = new ObjectReader({
			num: {
				number: {
					min: { value: 0 },
					max: { value: 120 },
				},
			},
		});
		expect(reader.read({ num: 25 })[0])
			.toHaveProperty("num")
			.toBe(25);
		expect(reader.read({ num: "25" })[0])
			.toHaveProperty("num")
			.toBe(25);
		expect(reader.read({ num: "25.5" })[0])
			.toHaveProperty("num")
			.toBe(25.5);
		expect(reader.read({ num: -1 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
		expect(reader.read({ num: 121 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
	});

	test("Integer validation", () => {
		let reader = new ObjectReader({
			num: {
				number: {
					integer: true,
					min: { value: 0 },
					max: { value: 120 },
				},
			},
		});
		expect(reader.read({ num: 25 })[0])
			.toHaveProperty("num")
			.toBe(25);
		expect(reader.read({ num: "25" })[0])
			.toHaveProperty("num")
			.toBe(25);
		expect(reader.read({ num: 25.5 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
		expect(reader.read({ num: "25.5" })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
		expect(reader.read({ num: -1 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
		expect(reader.read({ num: 121 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
	});

	test("Positive number validation", () => {
		let reader = new ObjectReader({
			num: { number: { positive: true } },
		});
		expect(reader.read({ num: 1 })[0])
			.toHaveProperty("num")
			.toBe(1);
		expect(reader.read({ num: "0" })[0])
			.toHaveProperty("num")
			.toBe(0);
		expect(reader.read({ num: -1 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
	});

	test("Nonzero number validation", () => {
		let reader = new ObjectReader({
			num: { number: { nonzero: true } },
		});
		expect(reader.read({ num: 1 })[0])
			.toHaveProperty("num")
			.toBe(1);
		expect(reader.read({ num: 0 })[1])
			.toHaveProperty("num")
			.toBeInstanceOf(Error);
	});

	test("Boolean validation", () => {
		let reader = new ObjectReader({
			agree: { boolean: { true: true } },
		});
		expect(reader.read({ agree: true })[0])
			.toHaveProperty("agree")
			.toBe(true);
		expect(reader.read({ agree: false })[1])
			.toHaveProperty("agree")
			.toBeInstanceOf(Error);
		expect(reader.read({ agree: "true" })[1])
			.toHaveProperty("agree")
			.toBeInstanceOf(Error);
	});

	test("Date validation", () => {
		let reader = new ObjectReader({
			birthDate: {
				date: {
					min: { date: new Date("1900-01-01") },
					max: { date: new Date("2099-12-31") },
				},
			},
		});
		expect(reader.read({ birthDate: new Date("1983-01-01") })[0])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Date);
		expect(reader.read({ birthDate: +new Date("1983-01-01") })[0])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Date);
		expect(reader.read({ birthDate: "2023-01-23" })[0])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Date);
		expect(reader.read({ birthDate: "1899-12-31" })[1])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Error);
		expect(reader.read({ birthDate: "2100-01-01" })[1])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Error);
		expect(reader.read({ birthDate: "123" })[1])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Error);
		expect(reader.read({ birthDate: false })[1])
			.toHaveProperty("birthDate")
			.toBeInstanceOf(Error);
	});

	test("Array validation", () => {
		let reader = new ObjectReader({
			numbers: {
				array: {
					items: { number: { max: { value: 100 } } },
					min: { length: 2 },
					max: { length: 5 },
				},
			},
		});
		expect(reader.read({ numbers: [1, 2, 3] })[0])
			.toHaveProperty("numbers")
			.toBeArray(3);
		expect(reader.read({ numbers: [1] })[1])
			.toHaveProperty("numbers")
			.toBeInstanceOf(Error);
		expect(reader.read({ numbers: [1, 2, 3, 4, 5, 6] })[1])
			.toHaveProperty("numbers")
			.toBeInstanceOf(Error);
		expect(reader.read({ numbers: [1, 101] })[1])
			.toHaveProperty("numbers")
			.toBeInstanceOf(Error);
	});

	test("Object validation", () => {
		let reader = new ObjectReader({
			user: {
				object: {
					schema: {
						id: { number: {} },
						name: { string: {} },
					},
				},
			},
		});
		expect(reader.read({ user: { id: 1, name: "John" } })[0])
			.toHaveProperty("user")
			.toHaveProperty("id")
			.toBe(1);
		expect(reader.read({ user: { id: null, name: "John" } })[1])
			.toHaveProperty("user")
			.toBeInstanceOf(Error);
		expect(reader.read({ user: [] } as any)[1])
			.toHaveProperty("user")
			.toBeInstanceOf(Error);
		expect(reader.read([] as any)[1])
			.toHaveProperty("_")
			.toBeInstanceOf(Error);
	});

	test("Key-value record validation", (t) => {
		let userSchema = {
			id: { number: {} },
			name: { string: {} },
		};
		let usersRecord = {
			values: { object: { schema: userSchema } },
		};
		let reader = new ObjectReader({ users: { record: usersRecord } });
		let users: Record<string, unknown> = {
			"1": { id: 1, name: "alice" },
			"2": { id: 2, name: "beatrice" },
		};
		t.dump(reader.read({ users }));
		expect(reader.read({ users })[0])
			.toHaveProperty("users")
			.toHaveProperty("1")
			.toHaveProperty("id")
			.toBe(1);
		expect(reader.read({ users })[0])
			.toHaveProperty("users")
			.toHaveProperty("2")
			.toHaveProperty("name")
			.toBe("beatrice");
		users["3"] = 123;
		expect(reader.read({ users })[1])
			.toHaveProperty("users")
			.toBeInstanceOf(Error);
	});

	test("Optional fields", () => {
		let reader = new ObjectReader({
			name: { string: {} },
			age: { optional: true, number: { integer: true, positive: true } },
		});
		expect(reader.read({ name: "John" })[0])
			.toHaveProperty("name")
			.toBe("John");
		expect(reader.read({ name: "John" })[0])
			.toHaveProperty("age")
			.toBeUndefined();
		expect(reader.read({ name: "John", age: 25 })[0])
			.toHaveProperty("age")
			.toBe(25);
	});

	test("Custom errors", () => {
		let reader = new ObjectReader({
			str: {
				string: {
					err: "ERR",
					min: { length: 1, err: "ERR_TOO_SHORT" },
					max: { length: 2, err: "ERR_TOO_LONG" },
				},
			},
			num: {
				number: {
					err: "ERR",
					min: { value: 0, err: "ERR_BELOW" },
					max: { value: 120, err: "ERR_ABOVE" },
				},
			},
			arr: {
				array: {
					items: { string: {} },
					err: "ERR",
					min: { length: 1, err: "ERR_TOO_SHORT" },
					max: { length: 2, err: "ERR_TOO_LONG" },
				},
			},
		});
		let errors = reader.read({ str: 0, num: "", arr: {} })[1];
		expect(errors).toHaveProperty("str").asString().toBe("Error: ERR");
		expect(errors).toHaveProperty("num").asString().toBe("Error: ERR");
		expect(errors).toHaveProperty("arr").asString().toBe("Error: ERR");
		let low = reader.read({ str: "", num: -1, arr: [] })[1];
		expect(low).toHaveProperty("str").asString().toBe("Error: ERR_TOO_SHORT");
		expect(low).toHaveProperty("num").asString().toBe("Error: ERR_BELOW");
		expect(low).toHaveProperty("arr").asString().toBe("Error: ERR_TOO_SHORT");
		let high = reader.read({ str: "FOO", num: 1000, arr: ["", "", ""] })[1];
		expect(high).toHaveProperty("str").asString().toBe("Error: ERR_TOO_LONG");
		expect(high).toHaveProperty("num").asString().toBe("Error: ERR_ABOVE");
		expect(high).toHaveProperty("arr").asString().toBe("Error: ERR_TOO_LONG");
	});

	test("readField method", () => {
		let reader = new ObjectReader({
			name: { string: {} },
			age: { number: {} },
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
		let schema = { foo: { object: { schema: undefined as any } } };
		schema.foo.object.schema = schema;
		let reader = new ObjectReader(schema);
		let object: any = {};
		object.foo = object; // does match, but is recursive.
		let result = reader.read(object);
		expect(result[0]).toBeUndefined();
	});

	test("readJSONString method", () => {
		let reader = new ObjectReader({
			name: { string: {} },
			age: { number: {} },
		});
		expect(reader.readJSONString('{"name":"John","age":25}')[0])
			.toHaveProperty("name")
			.toBe("John");
		expect(reader.readJSONString('{"name":"John","age":"-"}')[1])
			.toHaveProperty("age")
			.toBeInstanceOf(Error);
		expect(reader.readJSONString("invalid json")[1])
			.toHaveProperty("_")
			.toBeInstanceOf(Error);
	});
});
