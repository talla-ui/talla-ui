import { describe, expect, test } from "vitest";
import { InputValidator } from "../dist/index.js";

describe("InputValidator", () => {
	describe("Basic types", () => {
		test("String validation", () => {
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) => f.boolean());

			expect(schema.safeParse(true)).toEqual({
				success: true,
				data: true,
			});

			expect(schema.safeParse("true").success).toBe(false);
			expect(schema.safeParse(1).success).toBe(false);
		});

		test("Date validation", () => {
			const schema = new InputValidator((f) => f.coerce.date());
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
	});

	describe("Required and optional", () => {
		test("Required value", () => {
			const schema = new InputValidator((f) => f.string().required());

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "hello",
			});

			expect(schema.safeParse(undefined).success).toBe(false);
			expect(schema.safeParse(null).success).toBe(false);
			expect(schema.safeParse("").success).toBe(false); // empty string
		});

		test("Optional value", () => {
			const schema = new InputValidator((f) => f.string().optional());

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
			const schema = new InputValidator((f) => f.string().nullable());

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
			const schema = new InputValidator((f) => f.string().default("default"));

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
			const schema = new InputValidator((f) =>
				f.number().default(() => Date.now()),
			);

			const result = schema.safeParse(undefined);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data).toBe("number");
				expect(result.data).toBeGreaterThan(0);
			}
		});
	});

	describe("Object validation", () => {
		test("Simple object", () => {
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const fooSchema = new InputValidator((f) =>
				f.object({ foo: f.string() }),
			);
			const schema = new InputValidator((f) => f.object({ bar: fooSchema }));

			expect(schema.safeParse({ bar: { foo: "hello" } })).toEqual({
				success: true,
				data: { bar: { foo: "hello" } },
			});

			expect(schema.safeParse({ bar: { foo: 123 } }).success).toBe(false);
		});
	});

	describe("Array validation", () => {
		test("Array of strings", () => {
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const fooSchema = new InputValidator((f) =>
				f.object({ foo: f.string() }),
			);
			const schema = new InputValidator((f) => f.array(fooSchema));

			expect(schema.safeParse([]).success).toBe(true);
			expect(schema.safeParse([{ foo: "hello" }])).toEqual({
				success: true,
				data: [{ foo: "hello" }],
			});
			expect(schema.safeParse([{ foo: 123 }]).success).toBe(false);
		});
	});

	describe("Union and literal types", () => {
		test("Literal values", () => {
			const schema = new InputValidator((f) => f.literal("active"));

			expect(schema.safeParse("active")).toEqual({
				success: true,
				data: "active",
			});

			expect(schema.safeParse("inactive").success).toBe(false);
		});

		test("Union types", () => {
			const schema = new InputValidator((f) =>
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
			const fooSchema = new InputValidator((f) =>
				f.object({
					foo: f.string(),
				}),
			);
			const barSchema = new InputValidator((f) =>
				f.object({
					bar: f.number(),
				}),
			);

			const schema = new InputValidator((f) => f.union(fooSchema, barSchema));
			expect(schema.safeParse({ foo: "hello" })).toEqual({
				success: true,
				data: { foo: "hello" },
			});
			expect(schema.safeParse({ bar: 123 })).toEqual({
				success: true,
				data: { bar: 123 },
			});
		});
	});

	describe("Transform functionality", () => {
		test("String transform", () => {
			const schema = new InputValidator((f) =>
				f.string().transform((s) => s.toUpperCase()),
			);

			expect(schema.safeParse("hello")).toEqual({
				success: true,
				data: "HELLO",
			});
		});

		test("Transform with validation", () => {
			const schema = new InputValidator((f) =>
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
	});

	describe("Object error details", () => {
		test("Object validation errors structure", () => {
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) => f.coerce.string());

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
			const validatedSchema = new InputValidator((f) =>
				f.coerce
					.string()
					.check((s) => s.length > 0)
					.error("Cannot be empty"),
			);

			expect(validatedSchema.safeParse(123).success).toBe(true);
			expect(validatedSchema.safeParse("").success).toBe(false);
		});

		test("Coerce number", () => {
			const schema = new InputValidator((f) => f.coerce.number());

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
			const positiveSchema = new InputValidator((f) =>
				f.coerce
					.number()
					.check((n) => n > 0)
					.error("Must be positive"),
			);

			expect(positiveSchema.safeParse("123").success).toBe(true);
			expect(positiveSchema.safeParse("-5").success).toBe(false);
		});

		test("Coerce boolean", () => {
			const schema = new InputValidator((f) => f.coerce.boolean());

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
			const schema = new InputValidator((f) => f.coerce.date());

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
			const futureSchema = new InputValidator((f) =>
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
			const schema = new InputValidator((f) =>
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
				expect(result2.data.active).toBe(false); // undefined uses default true
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
			const schema = new InputValidator((f) =>
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
});
