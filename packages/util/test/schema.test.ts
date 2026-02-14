import { describe, expect, test } from "vitest";
import { Schema } from "../dist/index.js";

describe("Schema", () => {
	describe("Basic types", () => {
		test("String validation", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.check((s) => s.length >= 3)
					.error("Too short")
					.check((s) => s.length <= 10)
					.error("Too long"),
			);

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse("ab").success).toBe(false);
			expect(schema.safeParse("this is too long").success).toBe(false);
		});

		test("Number validation", () => {
			const schema = new Schema((f) =>
				f
					.number()
					.check((n) => Number.isInteger(n))
					.error("Must be integer")
					.check((n) => n >= 0 && n <= 100)
					.error("Must be <= 100"),
			);

			expect(schema.safeParse(50)).toEqual({
				success: true,
				data: 50,
			});

			expect(schema.safeParse(50.5).success).toBe(false); // not integer
			expect(schema.safeParse(-1).success).toBe(false); // not positive
			expect(schema.safeParse(101).success).toBe(false); // above max
			expect(schema.safeParse(NaN).success).toBe(false); // NaN should be rejected
		});

		test("Boolean validation", () => {
			const schema = new Schema((f) => f.boolean());

			expect(schema.safeParse(true)).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse("true").success).toBe(false);
			expect(schema.safeParse(1).success).toBe(false);
		});

		test("Date validation", () => {
			const schema = new Schema((f) => f.coerce.date());
			const now = new Date();

			expect(schema.safeParse(now)).toEqual({
				success: true,
				data: now,
			});

			// Test string to date conversion
			const stringResult = schema.safeParse("2024-01-01");
			expect(stringResult.success).toBe(true);
			if (stringResult.success) {
				expect(stringResult.data instanceof Date).toBe(true);
			}

			// Test number to date conversion
			const timestamp = Date.now();
			const numberResult = schema.safeParse(timestamp);
			expect(numberResult.success).toBe(true);
			if (numberResult.success) {
				expect(numberResult.data instanceof Date).toBe(true);
			}

			expect(schema.safeParse("invalid date").success).toBe(false);
		});

		test("Date validation with Invalid Date object", () => {
			const schema = new Schema((f) => f.date());
			const invalidDate = new Date("invalid");
			expect(schema.safeParse(invalidDate).success).toBe(false);
		});
	});

	describe("Parse method (throwing variant)", () => {
		test("parse() returns data on success", () => {
			const schema = new Schema((f) => f.string());
			expect(schema.parse("hello")).toBe("hello");
		});

		test("parse() throws on validation failure", () => {
			const schema = new Schema((f) => f.number().error("Must be a number"));
			expect(() => schema.parse("not a number")).toThrow("Must be a number");
		});

		test("parse() throws on required failure", () => {
			const schema = new Schema((f) =>
				f.string().required("Value is required"),
			);
			expect(() => schema.parse("")).toThrow("Value is required");
		});

		test("parse() with object returns typed data", () => {
			const schema = new Schema((f) =>
				f.object({
					name: f.string(),
					age: f.number(),
				}),
			);
			const result = schema.parse({ name: "Alice", age: 30 });
			expect(result).toEqual({ name: "Alice", age: 30 });
		});
	});

	describe("Schema constructor", () => {
		test("Constructor accepts existing Schema instance", () => {
			const schema1 = new Schema((f) => f.string().min(3));
			const schema2 = new Schema(schema1);
			expect(schema2.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema2.safeParse("hi").success).toBe(false);
		});

		test("Constructor accepts nested Schema in definition", () => {
			const innerSchema = new Schema((f) => f.number().positive());
			const outerSchema = new Schema((f) => f.object({ value: innerSchema }));
			expect(outerSchema.safeParse({ value: 5 })).toEqual({
				success: true,
				data: { value: 5 },
			});
			expect(outerSchema.safeParse({ value: -1 }).success).toBe(false);
		});

		test("Double-wrapped Schema works correctly", () => {
			const schema1 = new Schema((f) => f.string());
			const schema2 = new Schema(schema1);
			const schema3 = new Schema(schema2);
			expect(schema3.safeParse("test")).toEqual({
				success: true,
				data: "test",
			});
		});

		test("Constructor with function returning Schema", () => {
			const innerSchema = new Schema((f) => f.string());
			const schema = new Schema(() => innerSchema);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
		});

		test("Constructor throws RangeError for invalid schema definition", () => {
			expect(() => new Schema(() => "not a builder" as any)).toThrow(
				RangeError,
			);
			expect(() => new Schema(() => 123 as any)).toThrow(RangeError);
			expect(() => new Schema(() => null as any)).toThrow(RangeError);
		});
	});

	describe("Required and optional", () => {
		test("Required value", () => {
			const schema = new Schema((f) => f.string().required());

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse(undefined).success).toBe(false);
			expect(schema.safeParse(null).success).toBe(false);
			expect(schema.safeParse("").success).toBe(false); // empty string
		});

		test("Optional value", () => {
			const schema = new Schema((f) => f.string().optional());

			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: undefined,
			});

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse(null).success).toBe(false); // not nullable
		});

		test("Nullable value", () => {
			const schema = new Schema((f) => f.string().nullable());

			expect(schema.safeParse(null)).toEqual({
				success: true,
				data: null,
			});

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse(undefined).success).toBe(false); // not optional
		});

		test("Default value", () => {
			const schema = new Schema((f) => f.string().default("default"));

			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: "default",
			});

			expect(schema.safeParse("custom")).toEqual({
				success: true,
				data: "custom",
			});
		});

		test("Default value with function", () => {
			const schema = new Schema((f) => f.number().default(() => Date.now()));

			const result = schema.safeParse(undefined);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data).toBe("number");
				expect(result.data).toBeGreaterThan(0);
			}
		});

		test("Nullable and optional together", () => {
			const schema = new Schema((f) => f.string().nullable().optional());
			expect(schema.safeParse(null)).toEqual({ success: true, data: null });
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: undefined,
			});
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse(123).success).toBe(false);
		});

		test("Optional and nullable (reversed order)", () => {
			const schema = new Schema((f) => f.string().optional().nullable());
			expect(schema.safeParse(null)).toEqual({ success: true, data: null });
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: undefined,
			});
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
		});

		test("Default with nullable", () => {
			const schema = new Schema((f) =>
				f.string().default("fallback").nullable(),
			);
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: "fallback",
			});
			expect(schema.safeParse(null)).toEqual({ success: true, data: null });
			expect(schema.safeParse("custom")).toEqual({
				success: true,
				data: "custom",
			});
		});

		test("Nullable then default", () => {
			const schema = new Schema((f) =>
				f.string().nullable().default("fallback"),
			);
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: "fallback",
			});
			expect(schema.safeParse(null)).toEqual({ success: true, data: null });
			expect(schema.safeParse("custom")).toEqual({
				success: true,
				data: "custom",
			});
		});

		test("Optional then required (optional wins via skip)", () => {
			// Note: optional() causes validation to skip on undefined, so required() after
			// optional() doesn't override - undefined still passes because skip happens first
			const schema = new Schema((f) =>
				f.string().optional().required("Now required"),
			);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: undefined,
			});
		});

		test("Required then optional (optional wins via skip)", () => {
			// Even required before optional: optional's skip happens at step[0], runs first
			const schema = new Schema((f) =>
				f.string().required("Required").optional(),
			);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: undefined,
			});
		});

		test("Default then required (default prevents required failure)", () => {
			const schema = new Schema((f) =>
				f.string().default("fallback").required("Required"),
			);
			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: "fallback",
			});
			expect(schema.safeParse("custom")).toEqual({
				success: true,
				data: "custom",
			});
		});
	});

	describe("Object validation", () => {
		test("Simple object", () => {
			const schema = new Schema((f) =>
				f.object({
					name: f.string().required(),
					age: f.number().required(),
				}),
			);

			expect(
				schema.safeParse({
					name: "Alice",
					age: 30,
				}),
			).toEqual({
				success: true,
				data: { name: "Alice", age: 30 },
			});

			expect(
				schema.safeParse({
					name: "Alice",
				}).success,
			).toBe(false); // missing age

			expect(
				schema.safeParse({
					name: "Alice",
					age: "30",
				}).success,
			).toBe(false); // wrong type
		});

		test("Complex object with validation", () => {
			const schema = new Schema((f) =>
				f.object({
					username: f
						.string()
						.required()
						.check((s) => s.length >= 3)
						.error("Username too short")
						.check((s) => /^[a-zA-Z0-9_]+$/.test(s))
						.error("Invalid username"),
					email: f
						.string()
						.check((s) => s.includes("@"))
						.error("Invalid email"),
					age: f
						.number()
						.required()
						.check((n) => Number.isInteger(n))
						.error("Age must be integer")
						.check((n) => n >= 13)
						.error("Must be at least 13"),
				}),
			);

			const validData = {
				username: "john_doe",
				email: "john@example.com",
				age: 25,
			};

			expect(schema.safeParse(validData)).toEqual({
				success: true,
				data: validData,
			});

			// Test invalid username
			const invalidData = {
				...validData,
				username: "jo", // too short
			};

			const result = schema.safeParse(invalidData);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("Username too short");
			}
		});

		test("Nested object validation using existing validator", () => {
			const fooSchema = new Schema((f) => f.object({ foo: f.string() }));
			const schema = new Schema((f) => f.object({ bar: fooSchema }));

			expect(schema.safeParse({ bar: { foo: "hello" } })).toEqual({
				success: true,
				data: { bar: { foo: "hello" } },
			});

			expect(schema.safeParse({ bar: { foo: 123 } }).success).toBe(false);
		});

		test("Object with all optional properties", () => {
			const schema = new Schema((f) =>
				f.object({
					name: f.string().optional(),
					age: f.number().optional(),
				}),
			);
			expect(schema.safeParse({})).toEqual({
				success: true,
				data: { name: undefined, age: undefined },
			});
			expect(schema.safeParse({ name: "Alice" })).toEqual({
				success: true,
				data: { name: "Alice", age: undefined },
			});
		});

		test("Object error accumulation (first error stored, all errors in errors object)", () => {
			const schema = new Schema((f) =>
				f.object({
					first: f.string().required("First required"),
					second: f.string().required("Second required"),
					third: f.string().required("Third required"),
				}),
			);
			const result = schema.safeParse({ first: "", second: "", third: "" });
			expect(result.success).toBe(false);
			if (!result.success) {
				// First error becomes the main error
				expect(result.error).toBe("First required");
				// All errors available in errors object
				expect(result.errors).toBeDefined();
				expect(result.errors!.first).toBe("First required");
				expect(result.errors!.second).toBe("Second required");
				expect(result.errors!.third).toBe("Third required");
			}
		});

		test("Object error when second field fails but first passes", () => {
			const schema = new Schema((f) =>
				f.object({
					first: f.string(),
					second: f.number().required("Number required"),
				}),
			);
			const result = schema.safeParse({ first: "ok", second: undefined });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Number required");
				expect(result.errors!.first).toBeUndefined();
				expect(result.errors!.second).toBe("Number required");
			}
		});

		test("Builder.shape property is set correctly", () => {
			const nameBuilder = Schema.build.string().required();
			const ageBuilder = Schema.build.number();
			const builder = Schema.build.object({
				name: nameBuilder,
				age: ageBuilder,
			});
			expect(builder.shape).toBeDefined();
			expect(builder.shape!.name).toBe(nameBuilder);
			expect(builder.shape!.age).toBe(ageBuilder);
		});
	});

	describe("Array validation", () => {
		test("Array of strings", () => {
			const schema = new Schema((f) =>
				f
					.array(f.string())
					.check((arr) => arr.length >= 1)
					.error("Must have at least 1 item")
					.check((arr) => arr.length <= 3)
					.error("Must have at most 3 items"),
			);

			expect(schema.safeParse(["a", "b"])).toEqual({
				success: true,
				data: ["a", "b"],
			});

			expect(schema.safeParse([]).success).toBe(false); // too few
			expect(schema.safeParse(["a", "b", "c", "d"]).success).toBe(false); // too many
			expect(schema.safeParse(["a", 1]).success).toBe(false); // wrong type
		});

		test("Array of objects", () => {
			const schema = new Schema((f) =>
				f.array(
					f.object({
						id: f.number().required(),
						name: f.string().required(),
					}),
				),
			);

			expect(
				schema.safeParse([
					{ id: 1, name: "Item 1" },
					{ id: 2, name: "Item 2" },
				]),
			).toEqual({
				success: true,
				data: [
					{ id: 1, name: "Item 1" },
					{ id: 2, name: "Item 2" },
				],
			});
		});

		test("Array of objects using existing validator", () => {
			const fooSchema = new Schema((f) => f.object({ foo: f.string() }));
			const schema = new Schema((f) => f.array(fooSchema));

			expect(schema.safeParse([]).success).toBe(true);
			expect(schema.safeParse([{ foo: "hello" }])).toEqual({
				success: true,
				data: [{ foo: "hello" }],
			});
			expect(schema.safeParse([{ foo: 123 }]).success).toBe(false);
		});

		test("Nested arrays (array of arrays)", () => {
			const schema = new Schema((f) => f.array(f.array(f.number())));
			expect(
				schema.safeParse([
					[1, 2],
					[3, 4],
				]),
			).toEqual({
				success: true,
				data: [
					[1, 2],
					[3, 4],
				],
			});
			expect(schema.safeParse([[], [1]])).toEqual({
				success: true,
				data: [[], [1]],
			});
			const result = schema.safeParse([[1, "two"]]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toContain("[0]");
			}
		});

		test("Nested arrays using Schema instance", () => {
			const innerSchema = new Schema((f) => f.array(f.number()));
			const schema = new Schema((f) => f.array(innerSchema));
			expect(schema.safeParse([[1, 2], [3]])).toEqual({
				success: true,
				data: [[1, 2], [3]],
			});
			expect(schema.safeParse([[1, "two"]]).success).toBe(false);
		});
	});

	describe("Union and literal types", () => {
		test("Literal values", () => {
			const schema = new Schema((f) => f.literal("active"));

			expect(schema.safeParse("active")).toEqual({
				success: true,
				data: "active",
			});

			expect(schema.safeParse("inactive").success).toBe(false);
		});

		test("Union types", () => {
			const schema = new Schema((f) =>
				f.union(f.literal("email"), f.literal("phone"), f.literal("mail")),
			);

			expect(schema.safeParse("email")).toEqual({
				success: true,
				data: "email",
			});

			expect(schema.safeParse("phone")).toEqual({
				success: true,
				data: "phone",
			});

			expect(schema.safeParse("fax").success).toBe(false);
		});

		test("Union with existing validator", () => {
			const fooSchema = new Schema((f) =>
				f.object({
					foo: f.string(),
				}),
			);
			const barSchema = new Schema((f) =>
				f.object({
					bar: f.number(),
				}),
			);

			const schema = new Schema((f) => f.union(fooSchema, barSchema));
			expect(schema.safeParse({ foo: "hello" })).toEqual({
				success: true,
				data: { foo: "hello" },
			});
			expect(schema.safeParse({ bar: 123 })).toEqual({
				success: true,
				data: { bar: 123 },
			});
		});

		test("Union preserves transformation from first matching type", () => {
			const schema = new Schema((f) =>
				f.union(
					f.string().transform((s) => s.toUpperCase()),
					f.number().transform((n) => n * 2),
				),
			);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
			expect(schema.safeParse(5)).toEqual({ success: true, data: 10 });
		});

		test("Union with Schema instance that transforms", () => {
			const upperSchema = new Schema((f) =>
				f.string().transform((s) => s.toUpperCase()),
			);
			const schema = new Schema((f) => f.union(upperSchema, f.number()));
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
			expect(schema.safeParse(42)).toEqual({ success: true, data: 42 });
		});
	});

	describe("Transform functionality", () => {
		test("String transform", () => {
			const schema = new Schema((f) =>
				f.string().transform((s) => s.toUpperCase()),
			);

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
		});

		test("Transform with validation", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.transform((s) => s.trim())
					.check((s) => s.length >= 3)
					.error("Must be at least 3 characters after trimming"),
			);

			expect(schema.safeParse("  hello  ")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse("  hi  ").success).toBe(false);
		});

		test("Chained transforms", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.transform((s) => s.trim())
					.transform((s) => s.toLowerCase())
					.transform((s) => s.replace(/\s+/g, "-")),
			);
			expect(schema.safeParse("  Hello World  ")).toEqual({
				success: true,
				data: "hello-world",
			});
		});

		test("Transform after required", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.required("Value required")
					.transform((s) => s.toUpperCase()),
			);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
			const result = schema.safeParse("");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Value required");
			}
		});

		test("Transform that throws is caught and reported as error", () => {
			const schema = new Schema((f) =>
				f.string().transform(() => {
					throw new Error("Transform failed!");
				}),
			);
			const result = schema.safeParse("hello");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Transform failed!");
			}
		});

		test("Check that throws is caught and reported as error", () => {
			const schema = new Schema((f) =>
				f.string().check(() => {
					throw new Error("Check exploded!");
				}),
			);
			const result = schema.safeParse("hello");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Check exploded!");
			}
		});
	});

	describe("Object error details", () => {
		test("Object validation errors structure", () => {
			const schema = new Schema((f) =>
				f.object({
					name: f.string().required("Name is required"),
					age: f.number().required("Age is required"),
				}),
			);

			const result = schema.safeParse({
				name: undefined,
				age: "not a number",
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
				expect(result.errors!.name).toContain("Name is required");
				expect(result.errors!.age).toBeDefined();
			}
		});

		test("Nested object errors", () => {
			const schema = new Schema((f) =>
				f.object({
					user: f.object({
						name: f.string().required("Name is required"),
					}),
				}),
			);

			const result = schema.safeParse({
				user: { name: undefined },
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.errors).toBeDefined();
				expect(result.errors!["user.name"]).toContain("Name is required");
			}
		});
	});

	describe("Custom validation", () => {
		test("Multiple checks with custom errors", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.check((s) => s.length >= 8)
					.error("Password must be at least 8 characters")
					.check((s) => /[A-Z]/.test(s))
					.error("Password must contain uppercase letter")
					.check((s) => /[0-9]/.test(s))
					.error("Password must contain number"),
			);

			expect(schema.safeParse("SecurePass123")).toEqual({
				success: true,
				data: "SecurePass123",
			});

			const result1 = schema.safeParse("short");
			expect(result1.success).toBe(false);
			if (!result1.success) {
				expect(result1.error).toContain("at least 8 characters");
			}

			const result2 = schema.safeParse("nouppercase123");
			expect(result2.success).toBe(false);
			if (!result2.success) {
				expect(result2.error).toContain("uppercase letter");
			}
		});

		test("Email validation", () => {
			const schema = new Schema((f) =>
				f
					.string()
					.check((s) => s.includes("@"))
					.error("Must contain @")
					.check((s) => s.includes("."))
					.error("Must contain .")
					.check((s) => s.length >= 5)
					.error("Too short for email"),
			);

			expect(schema.safeParse("test@example.com").success).toBe(true);
			expect(schema.safeParse("invalid").success).toBe(false);
		});
	});

	describe("Coerce functionality", () => {
		test("Coerce string", () => {
			const schema = new Schema((f) => f.coerce.string());

			// Test various inputs that should be coerced to strings
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse(123)).toEqual({
				success: true,
				data: "123",
			});

			expect(schema.safeParse(true)).toEqual({
				success: true,
				data: "true",
			});

			expect(schema.safeParse(null)).toEqual({
				success: true,
				data: "null",
			});

			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: "undefined",
			});

			// Test with validation
			const validatedSchema = new Schema((f) =>
				f.coerce
					.string()
					.check((s) => s.length > 0)
					.error("Cannot be empty"),
			);

			expect(validatedSchema.safeParse(123).success).toBe(true);
			expect(validatedSchema.safeParse("").success).toBe(false);
		});

		test("Coerce number", () => {
			const schema = new Schema((f) => f.coerce.number());

			// Test various inputs that should be coerced to numbers
			expect(schema.safeParse(123)).toEqual({
				success: true,
				data: 123,
			});

			expect(schema.safeParse("123")).toEqual({
				success: true,
				data: 123,
			});

			expect(schema.safeParse("123.45")).toEqual({
				success: true,
				data: 123.45,
			});

			expect(schema.safeParse(true)).toEqual({
				success: true,
				data: 1,
			});

			expect(schema.safeParse(false)).toEqual({
				success: true,
				data: 0,
			});

			// Test invalid coercion (should fail validation)
			const result = schema.safeParse("not-a-number");
			expect(result.success).toBe(false);

			// Test with additional validation
			const positiveSchema = new Schema((f) =>
				f.coerce
					.number()
					.check((n) => n > 0)
					.error("Must be positive"),
			);

			expect(positiveSchema.safeParse("123").success).toBe(true);
			expect(positiveSchema.safeParse("-5").success).toBe(false);
		});

		test("Coerce boolean", () => {
			const schema = new Schema((f) => f.coerce.boolean());

			// Test various inputs that should be coerced to booleans
			expect(schema.safeParse(true)).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse(false)).toEqual({
				success: true,
				data: false,
			});

			expect(schema.safeParse(1)).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse(0)).toEqual({
				success: true,
				data: false,
			});

			expect(schema.safeParse("true")).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse("false")).toEqual({
				success: true,
				data: true, // "false" coerces to true
			});

			expect(schema.safeParse("")).toEqual({
				success: true,
				data: false,
			});

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse(null)).toEqual({
				success: true,
				data: false,
			});

			expect(schema.safeParse(undefined)).toEqual({
				success: true,
				data: false,
			});
		});

		test("Coerce date", () => {
			const schema = new Schema((f) => f.coerce.date());

			const testDate = new Date("2024-01-01");

			// Test various inputs that should be coerced to dates
			expect(schema.safeParse(testDate)).toEqual({
				success: true,
				data: testDate,
			});

			expect(schema.safeParse("2024-01-01")).toEqual({
				success: true,
				data: new Date("2024-01-01"),
			});

			expect(schema.safeParse(1704067200000)).toEqual({
				success: true,
				data: new Date(1704067200000),
			});

			// Test invalid date coercion
			const invalidResult = schema.safeParse("not-a-date");
			expect(invalidResult.success).toBe(false);

			// Test with additional validation
			const futureSchema = new Schema((f) =>
				f.coerce
					.date()
					.check((d) => d > new Date())
					.error("Must be in the future"),
			);

			const futureDate = new Date(Date.now() + 86400000); // tomorrow
			const pastDate = new Date(Date.now() - 86400000); // yesterday

			expect(futureSchema.safeParse(futureDate.toISOString()).success).toBe(
				true,
			);
			expect(futureSchema.safeParse(pastDate.toISOString()).success).toBe(
				false,
			);
		});

		test("Coerce with complex validation", () => {
			// Test coercion combined with other validation methods
			const schema = new Schema((f) =>
				f.object({
					id: f.coerce.number().int().required("ID is required"),
					name: f.coerce.string().trim().required("Name is required"),
					active: f.coerce.boolean(),
					createdAt: f.coerce.date().optional(),
				}),
			);

			const inputData = {
				id: "123", // string that coerces to number
				name: "  John Doe  ", // string with whitespace
				active: "false", // string that coerces to boolean (becomes true!)
				createdAt: "2024-01-01", // string that coerces to date
			};

			const result = schema.safeParse(inputData);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.id).toBe(123);
				expect(result.data.name).toBe("John Doe"); // trimmed
				expect(result.data.active).toBe(true); // "false" string coerces to true!
				expect(result.data.createdAt).toEqual(new Date("2024-01-01"));
			}

			// Test with undefined (should use default value)
			const inputData2 = {
				id: "456",
				name: "Jane Doe",
				// active is undefined, should be false
			};

			const result2 = schema.safeParse(inputData2);
			expect(result2.success).toBe(true);
			if (result2.success) {
				expect(result2.data.active).toBe(false); // Boolean(undefined) === false
			}

			// Test with empty string (should coerce to false)
			const inputData3 = {
				id: "789",
				name: "Bob Smith",
				active: "", // empty string coerces to false
			};

			const result3 = schema.safeParse(inputData3);
			expect(result3.success).toBe(true);
			if (result3.success) {
				expect(result3.data.active).toBe(false); // empty string coerces to false
			}

			// Test validation failure after coercion
			const invalidData = {
				id: "123.5", // coerces to number but fails int() check
				name: "",
				active: true,
			};

			const errorResult = schema.safeParse(invalidData);
			expect(errorResult.success).toBe(false);
		});
	});

	describe("Real-world example", () => {
		test("User registration form", () => {
			const schema = new Schema((f) =>
				f.object({
					username: f
						.string()
						.required()
						.check((s) => s.length >= 3)
						.error("Username must be at least 3 characters")
						.check((s) => s.length <= 20)
						.error("Username must be at most 20 characters")
						.check((s) => /^[a-zA-Z0-9_]+$/.test(s))
						.error(
							"Username can only contain letters, numbers, and underscores",
						),

					email: f
						.string()
						.check((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
						.error("Invalid email format"),

					password: f
						.string()
						.required()
						.check((s) => s.length >= 8)
						.error("Password must be at least 8 characters")
						.check((s) => /[A-Z]/.test(s))
						.error("Password must contain uppercase letter")
						.check((s) => /[0-9]/.test(s))
						.error("Password must contain number"),

					age: f
						.number()
						.required()
						.check((n) => Number.isInteger(n))
						.error("Age must be a whole number")
						.check((n) => n >= 13)
						.error("Must be at least 13 years old")
						.check((n) => n <= 120)
						.error("Must be at most 120 years old"),

					acceptTerms: f
						.boolean()
						.required()
						.check((val) => val === true)
						.error("You must accept the terms"),

					referrer: f.string().optional(),
				}),
			);

			const validData = {
				username: "john_doe",
				email: "john@example.com",
				password: "SecurePass123",
				age: 25,
				acceptTerms: true,
			};

			const result = schema.safeParse(validData);
			expect(result.success).toBe(true);

			// Test invalid password
			const invalidData = {
				...validData,
				password: "weakpass",
			};

			const invalidResult = schema.safeParse(invalidData);
			expect(invalidResult.success).toBe(false);
		});
	});

	describe("Refine method (Zod-compatible)", () => {
		test("Refine with string message", () => {
			const schema = new Schema((f) =>
				f.string().refine((s) => s.length > 3, "Must be longer than 3"),
			);

			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse("hi").success).toBe(false);
		});

		test("Refine with options object", () => {
			const schema = new Schema((f) =>
				f.number().refine((n) => n % 2 === 0, { message: "Must be even" }),
			);

			expect(schema.safeParse(4).success).toBe(true);
			const result = schema.safeParse(3);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Must be even");
			}
		});
	});

	describe("String validation methods", () => {
		test("trim", () => {
			const schema = new Schema((f) => f.string().trim());
			expect(schema.safeParse("  hello  ")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse("  ")).toEqual({ success: true, data: "" });
		});

		test("toLowerCase", () => {
			const schema = new Schema((f) => f.string().toLowerCase());
			expect(schema.safeParse("HELLO")).toEqual({
				success: true,
				data: "hello",
			});
			expect(schema.safeParse("HeLLo WoRLD")).toEqual({
				success: true,
				data: "hello world",
			});
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});
		});

		test("toUpperCase", () => {
			const schema = new Schema((f) => f.string().toUpperCase());
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
			expect(schema.safeParse("HeLLo WoRLD")).toEqual({
				success: true,
				data: "HELLO WORLD",
			});
			expect(schema.safeParse("HELLO")).toEqual({
				success: true,
				data: "HELLO",
			});
		});

		test("min length", () => {
			const schema = new Schema((f) => f.string().min(3));
			expect(schema.safeParse("abc").success).toBe(true);
			expect(schema.safeParse("ab").success).toBe(false);
		});

		test("max length", () => {
			const schema = new Schema((f) => f.string().max(5));
			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse("hello!").success).toBe(false);
		});

		test("exact length", () => {
			const schema = new Schema((f) => f.string().length(5));
			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse("hi").success).toBe(false);
			expect(schema.safeParse("hello!").success).toBe(false);
		});

		test("email", () => {
			const schema = new Schema((f) => f.string().email());
			expect(schema.safeParse("test@example.com").success).toBe(true);
			expect(schema.safeParse("invalid").success).toBe(false);
			expect(schema.safeParse("no@domain").success).toBe(false);
		});

		test("url", () => {
			const schema = new Schema((f) => f.string().url());
			expect(schema.safeParse("https://example.com").success).toBe(true);
			expect(schema.safeParse("http://localhost:3000").success).toBe(true);
			expect(schema.safeParse("not-a-url").success).toBe(false);
		});

		test("regex", () => {
			const schema = new Schema((f) => f.string().regex(/^[A-Z]{3}$/));
			expect(schema.safeParse("ABC").success).toBe(true);
			expect(schema.safeParse("abc").success).toBe(false);
			expect(schema.safeParse("ABCD").success).toBe(false);
		});

		test("startsWith", () => {
			const schema = new Schema((f) => f.string().startsWith("hello"));
			expect(schema.safeParse("hello world").success).toBe(true);
			expect(schema.safeParse("world hello").success).toBe(false);
		});

		test("endsWith", () => {
			const schema = new Schema((f) => f.string().endsWith("world"));
			expect(schema.safeParse("hello world").success).toBe(true);
			expect(schema.safeParse("world hello").success).toBe(false);
		});

		test("includes", () => {
			const schema = new Schema((f) => f.string().includes("middle"));
			expect(schema.safeParse("start middle end").success).toBe(true);
			expect(schema.safeParse("start end").success).toBe(false);
		});
	});

	describe("Number validation methods", () => {
		test("int standalone", () => {
			const schema = new Schema((f) => f.int());
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(0).success).toBe(true);
			expect(schema.safeParse(-10).success).toBe(true);
			expect(schema.safeParse(3.14).success).toBe(false);
			expect(schema.safeParse("5").success).toBe(false);
		});

		test("min", () => {
			const schema = new Schema((f) => f.number().min(5));
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(10).success).toBe(true);
			expect(schema.safeParse(4).success).toBe(false);
		});

		test("max", () => {
			const schema = new Schema((f) => f.number().max(10));
			expect(schema.safeParse(10).success).toBe(true);
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(11).success).toBe(false);
		});

		test("gt (greater than)", () => {
			const schema = new Schema((f) => f.number().gt(5));
			expect(schema.safeParse(6).success).toBe(true);
			expect(schema.safeParse(5).success).toBe(false);
		});

		test("lt (less than)", () => {
			const schema = new Schema((f) => f.number().lt(5));
			expect(schema.safeParse(4).success).toBe(true);
			expect(schema.safeParse(5).success).toBe(false);
		});

		test("gte (alias for min)", () => {
			const schema = new Schema((f) => f.number().gte(5));
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(4).success).toBe(false);
		});

		test("lte (alias for max)", () => {
			const schema = new Schema((f) => f.number().lte(5));
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(6).success).toBe(false);
		});

		test("positive", () => {
			const schema = new Schema((f) => f.number().positive());
			expect(schema.safeParse(1).success).toBe(true);
			expect(schema.safeParse(0).success).toBe(false);
			expect(schema.safeParse(-1).success).toBe(false);
		});

		test("negative", () => {
			const schema = new Schema((f) => f.number().negative());
			expect(schema.safeParse(-1).success).toBe(true);
			expect(schema.safeParse(0).success).toBe(false);
			expect(schema.safeParse(1).success).toBe(false);
		});

		test("nonnegative", () => {
			const schema = new Schema((f) => f.number().nonnegative());
			expect(schema.safeParse(0).success).toBe(true);
			expect(schema.safeParse(1).success).toBe(true);
			expect(schema.safeParse(-1).success).toBe(false);
		});

		test("nonpositive", () => {
			const schema = new Schema((f) => f.number().nonpositive());
			expect(schema.safeParse(0).success).toBe(true);
			expect(schema.safeParse(-1).success).toBe(true);
			expect(schema.safeParse(1).success).toBe(false);
		});

		test("multipleOf", () => {
			const schema = new Schema((f) => f.number().multipleOf(5));
			expect(schema.safeParse(10).success).toBe(true);
			expect(schema.safeParse(15).success).toBe(true);
			expect(schema.safeParse(7).success).toBe(false);
		});

		test("finite", () => {
			const schema = new Schema((f) => f.number().finite());
			expect(schema.safeParse(100).success).toBe(true);
			expect(schema.safeParse(Infinity).success).toBe(false);
			expect(schema.safeParse(-Infinity).success).toBe(false);
		});

		test("safe", () => {
			const schema = new Schema((f) => f.number().safe());
			expect(schema.safeParse(100).success).toBe(true);
			expect(schema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
			expect(schema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
		});
	});

	describe("Array validation methods", () => {
		test("min items", () => {
			const schema = new Schema((f) => f.array(f.string()).min(2));
			expect(schema.safeParse(["a", "b"]).success).toBe(true);
			expect(schema.safeParse(["a"]).success).toBe(false);
		});

		test("max items", () => {
			const schema = new Schema((f) => f.array(f.string()).max(2));
			expect(schema.safeParse(["a", "b"]).success).toBe(true);
			expect(schema.safeParse(["a", "b", "c"]).success).toBe(false);
		});

		test("exact length", () => {
			const schema = new Schema((f) => f.array(f.string()).length(2));
			expect(schema.safeParse(["a", "b"]).success).toBe(true);
			expect(schema.safeParse(["a"]).success).toBe(false);
			expect(schema.safeParse(["a", "b", "c"]).success).toBe(false);
		});

		test("nonempty", () => {
			const schema = new Schema((f) => f.array(f.string()).nonempty());
			expect(schema.safeParse(["a"]).success).toBe(true);
			expect(schema.safeParse([]).success).toBe(false);
		});
	});

	describe("Standard Schema compliance", () => {
		test("~standard property exists on builder", () => {
			const builder = Schema.build.string();
			expect(builder["~standard"]).toBeDefined();
			expect(builder["~standard"].version).toBe(1);
			expect(builder["~standard"].vendor).toBe("talla-ui");
			expect(typeof builder["~standard"].validate).toBe("function");
		});

		test("Standard Schema validate returns success format", () => {
			const builder = Schema.build.string();
			const result = builder["~standard"].validate("hello");

			expect("value" in result).toBe(true);
			if ("value" in result) {
				expect(result.value).toBe("hello");
				expect(result.issues).toBeUndefined();
			}
		});

		test("Standard Schema validate returns failure format", () => {
			const builder = Schema.build.string().email("Invalid email");
			const result = builder["~standard"].validate("not-an-email");

			expect("issues" in result).toBe(true);
			if ("issues" in result) {
				expect(result.issues).toBeDefined();
				expect(result.issues!.length).toBeGreaterThan(0);
				expect(result.issues![0].message).toBe("Invalid email");
			}
		});

		test("Standard Schema validate converts object errors to paths", () => {
			const builder = Schema.build.object({
				user: Schema.build.object({
					name: Schema.build.string().required("Name required"),
				}),
			});
			const result = builder["~standard"].validate({ user: { name: "" } });

			expect("issues" in result).toBe(true);
			if ("issues" in result) {
				expect(result.issues).toBeDefined();
				// Should have path for nested error
				const issue = result.issues!.find(
					(i) => i.path?.join(".") === "user.name",
				);
				expect(issue).toBeDefined();
			}
		});

		test("Standard Schema with array validation failure", () => {
			const builder = Schema.build.array(
				Schema.build.number().error("Must be number"),
			);
			const result = builder["~standard"].validate([1, 2, "three"]);

			expect("issues" in result).toBe(true);
			if ("issues" in result) {
				expect(result.issues).toBeDefined();
				expect(result.issues!.length).toBeGreaterThan(0);
				expect(result.issues![0].message).toContain("Must be number");
			}
		});

		test("Standard Schema with union failure", () => {
			const builder = Schema.build
				.union(Schema.build.literal("a"), Schema.build.literal("b"))
				.error("Must be a or b");
			const result = builder["~standard"].validate("c");

			expect("issues" in result).toBe(true);
			if ("issues" in result) {
				expect(result.issues).toBeDefined();
				expect(result.issues![0].message).toBe("Must be a or b");
			}
		});
	});

	describe("Preprocess method", () => {
		test("Preprocess directly", () => {
			const schema = new Schema((f) =>
				f
					.any()
					.preprocess((v) => String(v).toUpperCase())
					.string(),
			);
			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
			expect(schema.safeParse(123)).toEqual({ success: true, data: "123" });
		});
	});

	describe("Union error messages", () => {
		test("Union error when all types fail", () => {
			const schema = new Schema((f) =>
				f.union(f.literal("a"), f.literal("b")).error("Must be a or b"),
			);
			const result = schema.safeParse("c");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Must be a or b");
			}
		});
	});

	describe("Object extra properties", () => {
		test("Object ignores extra properties", () => {
			const schema = new Schema((f) => f.object({ name: f.string() }));
			const result = schema.safeParse({
				name: "Alice",
				age: 30,
				extra: "ignored",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({ name: "Alice" });
				expect("age" in result.data).toBe(false);
			}
		});
	});

	describe("Array item error format", () => {
		test("Array item error includes index", () => {
			const schema = new Schema((f) =>
				f.array(f.number().error("Must be number")),
			);
			const result = schema.safeParse([1, 2, "three", 4]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("[2] Must be number");
			}
		});
	});

	describe("Literal edge cases", () => {
		test("Numeric literal", () => {
			const schema = new Schema((f) => f.literal(42));
			expect(schema.safeParse(42).success).toBe(true);
			expect(schema.safeParse(43).success).toBe(false);
			expect(schema.safeParse("42").success).toBe(false);
		});

		test("Boolean literal", () => {
			const schema = new Schema((f) => f.literal(false));
			expect(schema.safeParse(false).success).toBe(true);
			expect(schema.safeParse(true).success).toBe(false);
		});

		test("Array of literals", () => {
			const schema = new Schema((f) => f.literal([1, 2, 3]));
			expect(schema.safeParse(1).success).toBe(true);
			expect(schema.safeParse(2).success).toBe(true);
			expect(schema.safeParse(4).success).toBe(false);
		});
	});

	describe("Deeply nested objects", () => {
		test("Deeply nested object (3+ levels)", () => {
			const schema = new Schema((f) =>
				f.object({
					level1: f.object({
						level2: f.object({
							level3: f.string().required("Deep value required"),
						}),
					}),
				}),
			);

			expect(
				schema.safeParse({
					level1: { level2: { level3: "deep" } },
				}).success,
			).toBe(true);

			const result = schema.safeParse({
				level1: { level2: { level3: "" } },
			});
			expect(result.success).toBe(false);
			if (!result.success && result.errors) {
				expect(result.errors["level1.level2.level3"]).toBe(
					"Deep value required",
				);
			}
		});
	});

	describe("Number edge cases", () => {
		test("Number edge case: negative zero", () => {
			const schema = new Schema((f) => f.number());
			expect(schema.safeParse(-0).success).toBe(true);
			expect(schema.safeParse(0).success).toBe(true);
		});

		test("Number edge case: MAX_SAFE_INTEGER boundary", () => {
			const schema = new Schema((f) => f.number().safe());
			expect(schema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
			expect(schema.safeParse(Number.MIN_SAFE_INTEGER).success).toBe(true);
			expect(schema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
			expect(schema.safeParse(Number.MIN_SAFE_INTEGER - 1).success).toBe(false);
		});

		test("Combining int() with positive()", () => {
			const schema = new Schema((f) => f.int().positive());
			expect(schema.safeParse(5).success).toBe(true);
			expect(schema.safeParse(0).success).toBe(false);
			expect(schema.safeParse(-3).success).toBe(false);
			expect(schema.safeParse(3.5).success).toBe(false);
		});
	});

	describe("Default error messages", () => {
		test("string().min() without custom error", () => {
			const schema = new Schema((f) => f.string().min(3));
			const result = schema.safeParse("ab");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().max() without custom error", () => {
			const schema = new Schema((f) => f.string().max(2));
			const result = schema.safeParse("abc");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().length() without custom error", () => {
			const schema = new Schema((f) => f.string().length(5));
			const result = schema.safeParse("ab");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().email() without custom error", () => {
			const schema = new Schema((f) => f.string().email());
			const result = schema.safeParse("invalid");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().url() without custom error", () => {
			const schema = new Schema((f) => f.string().url());
			const result = schema.safeParse("not-a-url");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().regex() without custom error", () => {
			const schema = new Schema((f) => f.string().regex(/^[A-Z]$/));
			const result = schema.safeParse("abc");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().startsWith() without custom error", () => {
			const schema = new Schema((f) => f.string().startsWith("abc"));
			const result = schema.safeParse("xyz");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().endsWith() without custom error", () => {
			const schema = new Schema((f) => f.string().endsWith("xyz"));
			const result = schema.safeParse("abc");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("string().includes() without custom error", () => {
			const schema = new Schema((f) => f.string().includes("foo"));
			const result = schema.safeParse("bar");
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().min() without custom error", () => {
			const schema = new Schema((f) => f.number().min(5));
			const result = schema.safeParse(3);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().max() without custom error", () => {
			const schema = new Schema((f) => f.number().max(2));
			const result = schema.safeParse(5);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().gt() without custom error", () => {
			const schema = new Schema((f) => f.number().gt(5));
			const result = schema.safeParse(3);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().lt() without custom error", () => {
			const schema = new Schema((f) => f.number().lt(0));
			const result = schema.safeParse(5);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().gte() without custom error", () => {
			const schema = new Schema((f) => f.number().gte(10));
			const result = schema.safeParse(5);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().lte() without custom error", () => {
			const schema = new Schema((f) => f.number().lte(-1));
			const result = schema.safeParse(5);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().positive() without custom error", () => {
			const schema = new Schema((f) => f.number().positive());
			const result = schema.safeParse(-1);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().negative() without custom error", () => {
			const schema = new Schema((f) => f.number().negative());
			const result = schema.safeParse(1);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().nonnegative() without custom error", () => {
			const schema = new Schema((f) => f.number().nonnegative());
			const result = schema.safeParse(-1);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().nonpositive() without custom error", () => {
			const schema = new Schema((f) => f.number().nonpositive());
			const result = schema.safeParse(1);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().multipleOf() without custom error", () => {
			const schema = new Schema((f) => f.number().multipleOf(3));
			const result = schema.safeParse(7);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().finite() without custom error", () => {
			const schema = new Schema((f) => f.number().finite());
			const result = schema.safeParse(Infinity);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("number().safe() without custom error", () => {
			const schema = new Schema((f) => f.number().safe());
			const result = schema.safeParse(Number.MAX_SAFE_INTEGER + 1);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("array().min() without custom error", () => {
			const schema = new Schema((f) => f.array(f.string()).min(2));
			const result = schema.safeParse(["a"]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("array().max() without custom error", () => {
			const schema = new Schema((f) => f.array(f.string()).max(1));
			const result = schema.safeParse(["a", "b"]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("array().length() without custom error", () => {
			const schema = new Schema((f) => f.array(f.string()).length(3));
			const result = schema.safeParse(["a"]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});

		test("array().nonempty() without custom error", () => {
			const schema = new Schema((f) => f.array(f.string()).nonempty());
			const result = schema.safeParse([]);
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe("Invalid input");
			}
		});
	});

	describe("Custom error messages", () => {
		function expectError(
			define: (f: typeof Schema.build) => Schema.Builder,
			input: unknown,
			error: string,
		) {
			const result = new Schema(define).safeParse(input);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBe(error);
		}

		// Factory functions
		test("string(error)", () => {
			expectError((f) => f.string("Not a string"), 123, "Not a string");
		});
		test("number(error)", () => {
			expectError((f) => f.number("Not a number"), "abc", "Not a number");
		});
		test("int(error)", () => {
			expectError((f) => f.int("Not an integer"), 1.5, "Not an integer");
		});
		test("boolean(error)", () => {
			expectError((f) => f.boolean("Not a boolean"), "yes", "Not a boolean");
		});
		test("date(error)", () => {
			expectError((f) => f.date("Not a date"), "today", "Not a date");
		});

		// Coerce factory functions
		test("coerce.string(error)", () => {
			// coerce.string uses String(), so it always succeeds — test that valid coercion doesn't produce error
			const result = new Schema((f) => f.coerce.string("err")).safeParse(123);
			expect(result.success).toBe(true);
		});
		test("coerce.number(error)", () => {
			expectError(
				(f) => f.coerce.number("Not a number"),
				"abc",
				"Not a number",
			);
		});
		test("coerce.boolean(error)", () => {
			// coerce.boolean uses Boolean(), so it always succeeds
			const result = new Schema((f) => f.coerce.boolean("err")).safeParse(0);
			expect(result.success).toBe(true);
		});
		test("coerce.date(error)", () => {
			expectError(
				(f) => f.coerce.date("Not a date"),
				"not-a-date",
				"Not a date",
			);
		});

		// String validation methods
		test("string().min(n, error)", () => {
			expectError((f) => f.string().min(3, "Too short"), "ab", "Too short");
		});
		test("string().max(n, error)", () => {
			expectError((f) => f.string().max(2, "Too long"), "abc", "Too long");
		});
		test("string().length(n, error)", () => {
			expectError(
				(f) => f.string().length(5, "Wrong length"),
				"ab",
				"Wrong length",
			);
		});
		test("string().email(error)", () => {
			expectError((f) => f.string().email("Bad email"), "invalid", "Bad email");
		});
		test("string().url(error)", () => {
			expectError((f) => f.string().url("Bad URL"), "not-a-url", "Bad URL");
		});
		test("string().regex(pattern, error)", () => {
			expectError(
				(f) => f.string().regex(/^[A-Z]$/, "Bad format"),
				"abc",
				"Bad format",
			);
		});
		test("string().startsWith(prefix, error)", () => {
			expectError(
				(f) => f.string().startsWith("abc", "Bad prefix"),
				"xyz",
				"Bad prefix",
			);
		});
		test("string().endsWith(suffix, error)", () => {
			expectError(
				(f) => f.string().endsWith("xyz", "Bad suffix"),
				"abc",
				"Bad suffix",
			);
		});
		test("string().includes(str, error)", () => {
			expectError(
				(f) => f.string().includes("foo", "Missing foo"),
				"bar",
				"Missing foo",
			);
		});

		// Number validation methods
		test("number().min(n, error)", () => {
			expectError((f) => f.number().min(5, "Too small"), 3, "Too small");
		});
		test("number().max(n, error)", () => {
			expectError((f) => f.number().max(2, "Too large"), 5, "Too large");
		});
		test("number().gt(n, error)", () => {
			expectError((f) => f.number().gt(5, "Not greater"), 3, "Not greater");
		});
		test("number().lt(n, error)", () => {
			expectError((f) => f.number().lt(0, "Not less"), 5, "Not less");
		});
		test("number().gte(n, error)", () => {
			expectError((f) => f.number().gte(10, "Too small"), 5, "Too small");
		});
		test("number().lte(n, error)", () => {
			expectError((f) => f.number().lte(-1, "Too large"), 5, "Too large");
		});
		test("number().positive(error)", () => {
			expectError(
				(f) => f.number().positive("Not positive"),
				-1,
				"Not positive",
			);
		});
		test("number().negative(error)", () => {
			expectError(
				(f) => f.number().negative("Not negative"),
				1,
				"Not negative",
			);
		});
		test("number().nonnegative(error)", () => {
			expectError(
				(f) => f.number().nonnegative("Is negative"),
				-1,
				"Is negative",
			);
		});
		test("number().nonpositive(error)", () => {
			expectError(
				(f) => f.number().nonpositive("Is positive"),
				1,
				"Is positive",
			);
		});
		test("number().multipleOf(n, error)", () => {
			expectError(
				(f) => f.number().multipleOf(3, "Not multiple"),
				7,
				"Not multiple",
			);
		});
		test("number().finite(error)", () => {
			expectError(
				(f) => f.number().finite("Not finite"),
				Infinity,
				"Not finite",
			);
		});
		test("number().safe(error)", () => {
			expectError(
				(f) => f.number().safe("Not safe"),
				Number.MAX_SAFE_INTEGER + 1,
				"Not safe",
			);
		});

		// Array validation methods
		test("array().min(n, error)", () => {
			expectError(
				(f) => f.array(f.string()).min(2, "Too few"),
				["a"],
				"Too few",
			);
		});
		test("array().max(n, error)", () => {
			expectError(
				(f) => f.array(f.string()).max(1, "Too many"),
				["a", "b"],
				"Too many",
			);
		});
		test("array().length(n, error)", () => {
			expectError(
				(f) => f.array(f.string()).length(3, "Wrong count"),
				["a"],
				"Wrong count",
			);
		});
		test("array().nonempty(error)", () => {
			expectError((f) => f.array(f.string()).nonempty("Empty"), [], "Empty");
		});
	});

	describe("multipleOf edge cases", () => {
		test("multipleOf(0.5) passes for 1.5 and fails for 1.3", () => {
			const schema = new Schema((f) => f.number().multipleOf(0.5));
			expect(schema.safeParse(1.5).success).toBe(true);
			expect(schema.safeParse(1.3).success).toBe(false);
		});

		test("multipleOf(-3) passes for 6", () => {
			const schema = new Schema((f) => f.number().multipleOf(-3));
			expect(schema.safeParse(6).success).toBe(true);
		});

		test("multipleOf(0) always fails (division by zero)", () => {
			const schema = new Schema((f) => f.number().multipleOf(0));
			expect(schema.safeParse(0).success).toBe(false);
			expect(schema.safeParse(1).success).toBe(false);
			expect(schema.safeParse(100).success).toBe(false);
		});
	});

	describe("Chaining multiple validators", () => {
		test("string with min, max, and startsWith", () => {
			const schema = new Schema((f) =>
				f.string().min(3).max(20).startsWith("test_"),
			);

			expect(schema.safeParse("test_value").success).toBe(true);
			expect(schema.safeParse("test_a_longer_value").success).toBe(true);

			// Too short
			expect(schema.safeParse("te").success).toBe(false);
			// Does not start with "test_"
			expect(schema.safeParse("hello_world").success).toBe(false);
			// Too long
			expect(
				schema.safeParse("test_this_is_way_too_long_to_pass").success,
			).toBe(false);
		});

		test("number with positive, finite, and safe", () => {
			const schema = new Schema((f) => f.number().positive().finite().safe());

			expect(schema.safeParse(42).success).toBe(true);
			expect(schema.safeParse(1).success).toBe(true);

			// Infinity is not finite
			expect(schema.safeParse(Infinity).success).toBe(false);
			// Beyond safe integer range
			expect(schema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
			// Zero is not positive
			expect(schema.safeParse(0).success).toBe(false);
			// Negative
			expect(schema.safeParse(-1).success).toBe(false);
		});

		test("string with trim then min(1) rejects whitespace-only input", () => {
			const schema = new Schema((f) => f.string().trim().min(1));

			expect(schema.safeParse("hello").success).toBe(true);
			expect(schema.safeParse("  hello  ").success).toBe(true);

			// Whitespace-only trims to empty, which has length 0
			expect(schema.safeParse("   ").success).toBe(false);
		});
	});

	describe("String validators with empty arguments", () => {
		test("startsWith('') passes for any string", () => {
			const schema = new Schema((f) => f.string().startsWith(""));
			expect(schema.safeParse("anything").success).toBe(true);
			expect(schema.safeParse("").success).toBe(true);
			expect(schema.safeParse("hello world").success).toBe(true);
		});

		test("endsWith('') passes for any string", () => {
			const schema = new Schema((f) => f.string().endsWith(""));
			expect(schema.safeParse("anything").success).toBe(true);
			expect(schema.safeParse("").success).toBe(true);
			expect(schema.safeParse("hello world").success).toBe(true);
		});

		test("includes('') passes for any string", () => {
			const schema = new Schema((f) => f.string().includes(""));
			expect(schema.safeParse("anything").success).toBe(true);
			expect(schema.safeParse("").success).toBe(true);
			expect(schema.safeParse("hello world").success).toBe(true);
		});
	});

	describe("finite() with NaN", () => {
		test("NaN fails at number() check before reaching finite()", () => {
			const schema = new Schema((f) => f.number().finite());
			const result = schema.safeParse(NaN);
			expect(result.success).toBe(false);
		});
	});
});
