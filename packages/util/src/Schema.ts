import { StringConvertible } from "./DeferredString";

/** Default error message for invalid values. */
const DEFAULT_ERROR = "Invalid input";

/** Default error message for required values. */
const DEFAULT_REQUIRED_ERROR = "Required";

/** Parse method key. */
const SYM_PARSE = Symbol("parse");

/**
 * A class that represents a validation schema for input values, objects, and arrays.
 *
 * This class validates individual values (strings, numbers, booleans, dates) as well as objects and arrays. Error messages can be customized per validation step; use {@link Schema.errors} to override defaults. Schema instances are reusable and can describe nested objects and arrays.
 *
 * This class is used by {@link FormState} for form validation.
 *
 * The constructor accepts a callback that uses the provided builder functions to define a
 * validation schema. The resulting instance can parse unknown values safely, either throwing an
 * error or returning a success/failure result with parsed data or error messages.
 *
 * @example
 * const userSchema = new Schema((f) =>
 *   f.object({
 *     name: f.string().required("Name is required"),
 *     age: f.number().required().positive(),
 *     email: f.string().email("Invalid email")
 *   })
 * );
 *
 * const result = userSchema.safeParse(formData);
 * if (result.success) {
 *   console.log(result.data); // Typed as { name: string, age: number, email: string }
 * } else {
 *   console.log(result.error); // First error message
 *   console.log(result.errors); // All object property errors
 * }
 */
export class Schema<TBuilder extends Schema.Builder = Schema.Builder> {
	/** The default error messages; override with localizable messages at application startup. */
	static errors = {
		DEFAULT: DEFAULT_ERROR as StringConvertible,
		REQUIRED: DEFAULT_REQUIRED_ERROR as StringConvertible,
	};

	/**
	 * Creates a new schema instance.
	 * @param define A callback that uses the provided {@link Schema.build} methods to define the schema.
	 */
	constructor(
		define:
			| ((build: Schema.Builders) => TBuilder | Schema<TBuilder>)
			| Schema<TBuilder>,
	) {
		let schema =
			define instanceof Schema ? define._builder : define(Schema.build);
		if (schema instanceof Schema) schema = schema._builder;
		if (!(schema instanceof Schema.Builder)) throw RangeError();
		this._builder = schema;
	}

	/**
	 * The schema definition, as a read-only {@link Schema.Builder} instance.
	 * - The builder is the result of one of the builder functions in {@link Schema.build}.
	 */
	get schema(): TBuilder {
		return this._builder;
	}

	/**
	 * Parses and validates the input, throwing an error if validation fails.
	 * @param input The value to validate.
	 * @returns The validated and transformed data.
	 * @error Throws an error with the validation message if validation fails.
	 */
	parse(input: unknown): Schema.Infer<TBuilder> {
		const result = this._builder[SYM_PARSE](input);
		if (!result.success) throw new Error(String((result as any).error));
		return result.data as Schema.Infer<TBuilder>;
	}

	/**
	 * Parses and validates the input, returning a {@link Schema.ParseResult} object.
	 * - On success, the result contains `success: true` and the parsed `data`.
	 * - On failure, the result contains `success: false`, the first `error`, and per-property `errors` for object schemas.
	 * @param input The value to validate.
	 * @returns A result object with either success/data or success/error/errors properties.
	 */
	safeParse(input: unknown): Schema.ParseResult<Schema.Infer<TBuilder>> {
		const result = this._builder[SYM_PARSE](input);
		return result.success
			? ({
					success: true,
					data: result.data,
				} as Schema.ParseResult<any>)
			: ({
					success: false,
					error: (result as any).error,
					errors: (result as any).errors,
				} as Schema.ParseResult<any>);
	}

	/** @internal The schema definition for this schema. */
	private _builder: TBuilder;
}

export namespace Schema {
	/**
	 * The result of a schema parse operation.
	 * - Returned by {@link Schema.safeParse}.
	 * - If `success` is `true`, the `data` property contains the validated data; otherwise, `error` contains the first error message and `errors` contains per-property errors for object schemas.
	 */
	export type ParseResult<T> =
		| { success: true; data: T }
		| {
				success: false;
				error: StringConvertible;
				errors?: Record<string, StringConvertible | undefined>;
		  };

	/**
	 * A utility type that infers the parsed value type from a {@link Builder} or {@link Schema} instance.
	 */
	export type Infer<T extends Builder | Schema<any>> =
		T extends Schema<infer S>
			? Infer<S>
			: T extends Builder<infer U>
				? U
				: never;

	/**
	 * A type that can be used to initialize a {@link Schema} instance as the constructor argument.
	 * - Useful for accepting a schema definition outside of the {@link Schema} class and constructing a {@link Schema} instance from it.
	 */
	export type Initializer<TOutput> =
		| Schema<Builder<TOutput>>
		| ((builders: Builders) => Builder<TOutput>);

	/** The type of the {@link Schema.build} object, passed to the initializer function. */
	export type Builders = typeof build;

	// --- typed builder interfaces

	/**
	 * A validation builder for string values.
	 * - Returned by {@link Schema.build.string()} and provides string-specific validation and transformation methods.
	 */
	export interface StringBuilder extends Builder<string> {
		/**
		 * Validates that the string has at least the specified number of characters.
		 * @param length The minimum number of characters.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		min(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the string has at most the specified number of characters.
		 * @param length The maximum number of characters.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		max(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the string has exactly the specified number of characters.
		 * @param length The exact number of characters required.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		length(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the string is a valid email address.
		 * - Uses a simple pattern check (non-whitespace, `@`, dot in domain); not a full RFC 5322 validation.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().email("Please enter a valid email address")
		 */
		email(error?: StringConvertible): this;

		/**
		 * Validates that the string is a valid URL.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		url(error?: StringConvertible): this;

		/**
		 * Validates that the string matches the specified regular expression.
		 * @param pattern The regular expression to match.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		regex(pattern: RegExp, error?: StringConvertible): this;

		/**
		 * Validates that the string starts with the specified prefix.
		 * @param prefix The prefix to check for.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		startsWith(prefix: string, error?: StringConvertible): this;

		/**
		 * Validates that the string ends with the specified suffix.
		 * @param suffix The suffix to check for.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		endsWith(suffix: string, error?: StringConvertible): this;

		/**
		 * Validates that the string contains the specified substring.
		 * @param str The substring to check for.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		includes(str: string, error?: StringConvertible): this;

		/**
		 * Removes leading and trailing whitespace from the string.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().trim()
		 */
		trim(): this;

		/**
		 * Transforms the string to lowercase.
		 * @returns This builder, for chaining.
		 */
		toLowerCase(): this;

		/**
		 * Transforms the string to uppercase.
		 * @returns This builder, for chaining.
		 */
		toUpperCase(): this;
	}

	/**
	 * A validation builder for number values.
	 * - Returned by {@link Schema.build.number()} and provides number-specific validation methods.
	 */
	export interface NumberBuilder extends Builder<number> {
		/**
		 * Validates that the number is at least the specified value.
		 * @param value The minimum allowed value (inclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		min(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is at most the specified value.
		 * @param value The maximum allowed value (inclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		max(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is greater than the specified value.
		 * @param value The value to compare against (exclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		gt(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is less than the specified value.
		 * @param value The value to compare against (exclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		lt(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is greater than or equal to the specified value; alias for {@link min}.
		 * @param value The value to compare against (inclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		gte(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is less than or equal to the specified value; alias for {@link max}.
		 * @param value The value to compare against (inclusive).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		lte(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is positive (greater than 0).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		positive(error?: StringConvertible): this;

		/**
		 * Validates that the number is negative (less than 0).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		negative(error?: StringConvertible): this;

		/**
		 * Validates that the number is non-negative (greater than or equal to 0).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		nonnegative(error?: StringConvertible): this;

		/**
		 * Validates that the number is non-positive (less than or equal to 0).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		nonpositive(error?: StringConvertible): this;

		/**
		 * Validates that the number is a multiple of the specified value.
		 * @param value The divisor.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		multipleOf(value: number, error?: StringConvertible): this;

		/**
		 * Validates that the number is finite (not Infinity or -Infinity).
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		finite(error?: StringConvertible): this;

		/**
		 * Validates that the number is within the safe integer range.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		safe(error?: StringConvertible): this;
	}

	/**
	 * A validation builder for array values.
	 * - Returned by {@link Schema.build.array()} and provides array-specific validation methods.
	 */
	export interface ArrayBuilder<T> extends Builder<T[]> {
		/**
		 * Validates that the array has at least the specified number of items.
		 * @param length The minimum number of items.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		min(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the array has at most the specified number of items.
		 * @param length The maximum number of items.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		max(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the array has exactly the specified number of items.
		 * @param length The exact number of items required.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		length(length: number, error?: StringConvertible): this;

		/**
		 * Validates that the array is not empty.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 */
		nonempty(error?: StringConvertible): this;
	}

	/**
	 * A validation builder for boolean values.
	 * - Returned by {@link Schema.build.boolean()}.
	 */
	export interface BooleanBuilder extends Builder<boolean> {}

	/**
	 * A validation builder for Date values.
	 * - Returned by {@link Schema.build.date()} and {@link Schema.build.coerce.date()}.
	 */
	export interface DateBuilder extends Builder<Date> {}

	/**
	 * A validation builder for object values.
	 * - Returned by {@link Schema.build.object()} and provides access to the object's property schema via {@link shape}.
	 */
	export interface ObjectBuilder<T> extends Builder<T> {
		/** The schema for each property of the validated object. */
		shape: Record<string, Builder | Schema<any>>;
	}

	/**
	 * A validation builder for literal values.
	 * - Returned by {@link Schema.build.literal()} and provides access to the accepted values via {@link values}.
	 */
	export interface LiteralBuilder<T> extends Builder<T> {
		/** The set of accepted literal values. */
		values: T[];
	}

	/**
	 * An object containing functions that create {@link Builder} instances for specific types.
	 *
	 * @example
	 * const schema = new Schema((f) => {
	 *   // f is the build object:
	 *   return f.object({
	 *     // each method creates an object with fluent interface:
	 *     name: f.string().required(),
	 *     age: f.number(),
	 *     active: f.boolean()
	 *   });
	 * });
	 */
	export const build = Object.freeze({
		/** Creates a validation builder that accepts any value type. */
		any: () => new Builder(),

		/**
		 * Creates a validation builder that accepts string values.
		 * @param error Custom error message for type validation.
		 * @returns A {@link StringBuilder} with string-specific validation methods.
		 */
		string: (error?: StringConvertible): StringBuilder =>
			new Builder().string(error) as any,

		/**
		 * Creates a validation builder that accepts number values.
		 * @param error Custom error message for type validation.
		 * @returns A {@link NumberBuilder} with number-specific validation methods.
		 */
		number: (error?: StringConvertible): NumberBuilder =>
			new Builder().number(error) as any,

		/**
		 * Creates a validation builder that accepts integer values.
		 * @param error Custom error message for type validation.
		 * @returns A {@link NumberBuilder} with number-specific validation methods.
		 */
		int: (error?: StringConvertible): NumberBuilder =>
			new Builder().int(error) as any,

		/**
		 * Creates a validation builder that accepts boolean values.
		 * @param error Custom error message for type validation.
		 * @returns A {@link BooleanBuilder}.
		 */
		boolean: (error?: StringConvertible): BooleanBuilder =>
			new Builder().boolean(error) as any,

		/**
		 * Creates a validation builder that accepts Date values.
		 * @param error Custom error message for type validation.
		 * @returns A {@link DateBuilder}.
		 */
		date: (error?: StringConvertible): DateBuilder =>
			new Builder().date(error) as any,

		/**
		 * Creates a validation builder that accepts an array of values.
		 * @param item The validation builder or {@link Schema} that validates each array item.
		 * @returns An {@link ArrayBuilder} with array-specific validation methods.
		 */
		array: <T extends Builder>(item: T | Schema<T>): ArrayBuilder<Infer<T>> =>
			new Builder().array(item) as any,

		/**
		 * Creates a validation builder that accepts an object with specific properties.
		 * @param schema An object mapping property names to validation builders.
		 * @returns An {@link ObjectBuilder}.
		 */
		object: <T extends Record<string, Builder | Schema<any>>>(
			schema: T,
		): ObjectBuilder<{ [K in keyof T]: Infer<T[K]> }> =>
			new Builder().object(schema) as any,

		/**
		 * Creates a validation builder that only accepts a specific value.
		 * @param value The exact value that must match.
		 * @returns A {@link LiteralBuilder}.
		 */
		literal: <T extends string | number | boolean>(
			value: T | T[],
		): LiteralBuilder<T> => new Builder().literal(value) as any,

		/**
		 * Creates a validation builder that accepts any of the provided types.
		 * - Tries to validate against each type in order until one succeeds.
		 * @param types The validations to try, in order.
		 */
		union: <T extends (Builder | Schema<any>)[]>(...types: T) =>
			new Builder().union(...types),

		/** Shortcut for calling {@link Builder.optional optional()} on the provided validation builder. */
		optional: <T>(b: Builder<T>) => b.optional(),

		/** Shortcut for calling {@link Builder.nullable nullable()} on the provided validation builder. */
		nullable: <T>(b: Builder<T>) => b.nullable(),

		/** Validation builder methods that coerce the input value to the target type. */
		coerce: {
			/** Coerces the input to a string using `String()`. */
			string: (error?: StringConvertible): StringBuilder =>
				new Builder().preprocess(String).string(error) as any,
			/** Coerces the input to a number using `Number()`. */
			number: (error?: StringConvertible): NumberBuilder =>
				new Builder().preprocess(Number).number(error) as any,
			/** Coerces the input using `Boolean()`; note that non-empty strings like `"false"` become `true`. */
			boolean: (error?: StringConvertible): BooleanBuilder =>
				new Builder().preprocess(Boolean).boolean(error) as any,
			/** Coerces the input to a Date using `new Date()`. */
			date: (error?: StringConvertible): DateBuilder =>
				new Builder().preprocess((d) => new Date(d as any)).date(error) as any,
		},
	});

	/** @internal Standard Schema v1 result type. */
	export type StandardResult<T> =
		| { value: T; issues?: undefined }
		| { issues: ReadonlyArray<{ message: string; path?: PropertyKey[] }> };

	/** @internal Standard Schema v1 interface (inlined to avoid dependency). */
	export interface StandardSchemaV1<Input = unknown, Output = Input> {
		readonly "~standard": {
			readonly version: 1;
			readonly vendor: string;
			readonly validate: (value: unknown) => StandardResult<Output>;
		};
	}

	/**
	 * A class that represents a validation builder for an input value.
	 * - Returned by {@link Schema.build} methods, e.g. `f.string()`.
	 * - Provides a fluent interface for adding default values, validation checks, transformations, and error messages.
	 *
	 * @example
	 * f.string()
	 *   .optional()               // Allow undefined
	 *   .nullable()               // Allow null
	 *   .default("fallback")      // Provide default value
	 *   .check(s => s.length > 0) // Custom validation
	 *   .error("Cannot be empty") // Custom error message
	 *   .transform(s => s.trim()) // Transform the value
	 *   .required("Required")     // Require non-empty value
	 */
	export class Builder<T = any> {
		/** @internal Validation steps, in order of execution. */
		protected _steps: Array<undefined | ((state: ValidationState) => void)> = [
			undefined, // default / optional
		];

		/**
		 * The Standard Schema v1 compliance property.
		 * - Enables interoperability with libraries and frameworks that support Standard Schema.
		 * @see https://standardschema.dev/
		 */
		get ["~standard"](): StandardSchemaV1<unknown, T>["~standard"] {
			const self = this;
			return {
				version: 1,
				vendor: "talla-ui",
				validate(value: unknown): StandardResult<T> {
					const result = self[SYM_PARSE](value);
					if (result.success) {
						return { value: result.data };
					}
					// Convert to Standard Schema issue format
					const issues: Array<{ message: string; path?: PropertyKey[] }> = [];
					if (result.errors) {
						for (const key in result.errors) {
							const msg = result.errors[key];
							if (msg) {
								issues.push({
									message: String(msg),
									path: key.split("."),
								});
							}
						}
					} else if (result.error) {
						issues.push({ message: String(result.error) });
					}
					return { issues };
				},
			};
		}

		/** @internal Parses the provided value and returns a result object. */
		[SYM_PARSE](value: unknown): ParseResult<T> {
			const state = new ValidationState(value).run(this._steps);
			return state.isValid
				? ({
						success: true,
						data: state.value,
					} as Schema.ParseResult<any>)
				: ({
						success: false,
						error: state.error || Schema.errors.DEFAULT,
						errors: state.errors,
					} as Schema.ParseResult<any>);
		}

		/** The accepted literal values, for a literal value validator only. */
		values: T[] | undefined;

		/** The accepted object properties, for an object validator only. */
		shape: Record<string, Builder | Schema<any>> | undefined;

		/**
		 * Sets a default value.
		 * - The default value is used if the input value is undefined.
		 * - Can be a static value or a callback function that returns a value.
		 * - Does not require calling {@link optional()} first; undefined values are replaced by the default.
		 * @param value The default value, or a callback that returns the default value.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().default("abc");
		 * f.number().default(() => Math.random());
		 */
		default(value: T | (() => T)): this {
			this._steps[0] = (state) => {
				if (state.value === undefined) {
					state.value =
						typeof value === "function" ? (value as () => T)() : value;
				}
			};
			return this;
		}

		/**
		 * Marks the value as optional, allowing undefined values.
		 * @returns This builder, for chaining.
		 */
		optional(): Builder<T | undefined> {
			this._steps[0] ||= (state) => state.value === undefined && state.skip();
			return this;
		}

		/**
		 * Marks the value as nullable, allowing null values but not undefined.
		 * @returns This builder, for chaining.
		 */
		nullable(): Builder<T | null> {
			this._steps.splice(1, 0, (state) => state.value === null && state.skip());
			return this;
		}

		/**
		 * Adds a required check (not null, undefined, NaN, or empty string).
		 * - Applied after all other checks and transformations added so far.
		 * - If no error message is provided, the default message is used; see {@link Schema.errors}.
		 * @param error Custom error message.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().required();
		 * f.number().required("Age must be a valid number");
		 */
		required(error?: StringConvertible): Builder<Exclude<T, undefined | null>> {
			this._steps.push((state) => {
				const value = state.value;
				if (
					value === null ||
					value === undefined ||
					(typeof value === "number" && isNaN(value)) ||
					(typeof value === "string" && value === "")
				) {
					state.isValid = false;
					state.error = error || Schema.errors.REQUIRED;
				}
			});
			return this as any;
		}

		/**
		 * Adds a validation check using the provided function.
		 * - The input value is considered valid if the function returns a truthy value.
		 * - Runs only if all previous validation steps have passed.
		 * @param f The callback function for checking each value.
		 * @returns This builder, for chaining.
		 */
		check(f: (value: T) => void | boolean): this {
			this._steps.push((state) => state.check(f));
			return this;
		}

		/**
		 * Sets the error message for the previously failed check(s).
		 * - Multiple calls are allowed; each sets the error message if the preceding check(s) failed.
		 * @param message The error message to use.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().error("Not a string");
		 * f.union(f.string(), f.number()).error("Not a string or number");
		 * f.number().error("Not a number").positive().error("Must be positive");
		 */
		error(message: StringConvertible): this {
			this._steps.push((state) => {
				if (!state.isValid && !state.error) state.error = message;
			});
			return this;
		}

		/**
		 * Adds a refinement check; shorthand for {@link check} followed by {@link error}.
		 * @param fn Validation function returning boolean.
		 * @param messageOrOptions Error message or options object with message property.
		 * @returns This builder, for chaining.
		 *
		 * @example
		 * f.string().refine(s => s.length > 0, "Cannot be empty");
		 * f.number().refine(n => n % 2 === 0, { message: "Must be even" });
		 */
		refine(
			fn: (value: T) => boolean,
			messageOrOptions?: StringConvertible | { message?: StringConvertible },
		): this {
			const message =
				typeof messageOrOptions === "object" &&
				messageOrOptions !== null &&
				"message" in messageOrOptions
					? messageOrOptions.message
					: (messageOrOptions as StringConvertible | undefined);
			this.check(fn);
			if (message) this.error(message);
			return this;
		}

		/**
		 * Transforms the value using the provided callback function.
		 * - Applied after all checks and transformations added so far.
		 * - Additional checks and transformations can be chained after this call.
		 * @param fn The transformation function.
		 * @returns This builder, for chaining; typed using the return type of the transformation function.
		 *
		 * @example
		 * f.string().transform(s => s.trim()).check(s => s.length > 0);
		 * f.number().transform(n => n * 100).positive();
		 */
		transform<R>(fn: (value: T) => R): Builder<R> {
			this._steps.push((state) => {
				if (state.isValid) state.value = fn(state.value);
			});
			return this as any;
		}

		/**
		 * Replaces the input value using the provided callback function.
		 * - Runs before any other checks and transformations, but after optional/default checks.
		 * - Used internally by the {@link Schema.build.coerce coerce} set of functions.
		 * @param fn The callback function for preprocessing the input value.
		 * @returns This builder, for chaining.
		 */
		preprocess(fn: (value: unknown) => unknown): this {
			this._steps.splice(1, 0, (state) => {
				if (state.isValid) state.value = fn(state.value);
			});
			return this;
		}

		/** @internal */
		string(error?: StringConvertible): Builder<string> {
			this.check((value) => typeof value === "string");
			if (error) this.error(error);
			return this as any;
		}

		/** @internal */
		trim(): this {
			return this.transform((value) =>
				typeof value === "string" ? (value as string).trim() : "",
			) as any;
		}

		/** @internal */
		toLowerCase(): this {
			return this.transform((value) =>
				typeof value === "string" ? (value as string).toLowerCase() : "",
			) as any;
		}

		/** @internal */
		toUpperCase(): this {
			return this.transform((value) =>
				typeof value === "string" ? (value as string).toUpperCase() : "",
			) as any;
		}

		/** @internal */
		min(min: number, error?: StringConvertible) {
			this.check((v: any) =>
				typeof v === "string" || Array.isArray(v) ? v.length >= min : v >= min,
			);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		max(max: number, error?: StringConvertible) {
			this.check((v: any) =>
				typeof v === "string" || Array.isArray(v) ? v.length <= max : v <= max,
			);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		length(n: number, error?: StringConvertible) {
			this.check((v: any) => v.length === n);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		email(error?: StringConvertible) {
			this.check((v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		url(error?: StringConvertible) {
			this.check((v: any) => {
				try {
					new URL(v);
					return true;
				} catch {
					return false;
				}
			});
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		regex(pattern: RegExp, error?: StringConvertible) {
			this.check((v: any) => pattern.test(v));
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		startsWith(prefix: string, error?: StringConvertible) {
			this.check((v: any) => v.startsWith(prefix));
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		endsWith(suffix: string, error?: StringConvertible) {
			this.check((v: any) => v.endsWith(suffix));
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		includes(str: string, error?: StringConvertible) {
			this.check((v: any) => v.includes(str));
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		number(error?: StringConvertible): Builder<number> {
			this.check((value) => typeof value === "number" && !isNaN(value));
			if (error) this.error(error);
			return this as any;
		}

		/** @internal */
		int(error?: StringConvertible): Builder<number> {
			this.check(Number.isInteger);
			if (error) this.error(error);
			return this as any;
		}

		/** @internal */
		gt(n: number, error?: StringConvertible) {
			this.check((v: any) => v > n);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		lt(n: number, error?: StringConvertible) {
			this.check((v: any) => v < n);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		gte(n: number, error?: StringConvertible) {
			return this.min(n, error);
		}

		/** @internal */
		lte(n: number, error?: StringConvertible) {
			return this.max(n, error);
		}

		/** @internal */
		positive(error?: StringConvertible) {
			return this.gt(0, error);
		}

		/** @internal */
		negative(error?: StringConvertible) {
			return this.lt(0, error);
		}

		/** @internal */
		nonnegative(error?: StringConvertible) {
			return this.min(0, error);
		}

		/** @internal */
		nonpositive(error?: StringConvertible) {
			return this.max(0, error);
		}

		/** @internal */
		multipleOf(n: number, error?: StringConvertible) {
			this.check((v: any) => v % n === 0);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		finite(error?: StringConvertible) {
			this.check(Number.isFinite as any);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		safe(error?: StringConvertible) {
			this.check(
				((v: any) =>
					v >= Number.MIN_SAFE_INTEGER && v <= Number.MAX_SAFE_INTEGER) as any,
			);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		boolean(error?: StringConvertible): Builder<boolean> {
			this.check((value) => typeof value === "boolean");
			if (error) this.error(error);
			return this as any;
		}

		/** @internal */
		date(error?: StringConvertible): Builder<Date> {
			this.check((value) => value instanceof Date && !isNaN(value.getTime()));
			if (error) this.error(error);
			return this as any;
		}

		/** @internal */
		array<R extends Builder>(itemType: R | Schema<R>): Builder<Infer<R>[]> {
			this._steps.push((state) => {
				const input = state.value as unknown[];
				if (!Array.isArray(input)) {
					state.isValid = false;
					return;
				}
				const output: any[] = (state.value = new Array(input.length));
				const v =
					itemType instanceof Schema
						? itemType.safeParse.bind(itemType)
						: itemType[SYM_PARSE].bind(itemType);
				for (let i = 0; i < input.length; i++) {
					const itemResult = v(input[i]);
					if (!itemResult.success) {
						state.isValid = false;
						state.error = `[${i}] ${(itemResult as any).error}`;
						return;
					}
					output[i] = itemResult.data;
				}
			});
			return this as any;
		}

		/** @internal */
		nonempty(error?: StringConvertible) {
			this.check((v: any) => v.length > 0);
			if (error) this.error(error);
			return this;
		}

		/** @internal */
		object<R extends Record<string, Builder | Schema<any>>>(
			shape: R,
		): Builder<{ [K in keyof R]: Infer<R[K]> }> {
			this.shape = shape;
			this._steps.push((state) => {
				const o = state.value as Record<string, unknown>;
				if (typeof o !== "object" || o === null || Array.isArray(o)) {
					state.isValid = false;
					return;
				}

				// validate all known properties from the schema, omit others
				const result: any = (state.value = {});
				const errors = (state.errors = Object.create(null));
				for (let key in shape) {
					let type = shape[key]!;
					const fieldResult =
						type instanceof Schema
							? type.safeParse(o[key])
							: type[SYM_PARSE](o[key]);
					if (fieldResult.success) {
						result[key] = fieldResult.data;
					} else {
						state.isValid = false;
						state.error ||= (fieldResult as any).error;
						errors[key] = (fieldResult as any).error;
						if ((fieldResult as any).errors) {
							for (let k in (fieldResult as any).errors) {
								errors[`${key}.${k}`] = (fieldResult as any).errors[k];
							}
						}
					}
				}
			});
			return this as any;
		}

		/** @internal */
		literal<R extends string | number | boolean>(values: R | R[]): Builder<R> {
			this.check((value: any) =>
				Array.isArray(values) ? values.includes(value) : value === values,
			);
			(this as any).values = Array.isArray(values) ? values : [values];
			return this as any;
		}

		/** @internal */
		union<R extends (Builder | Schema<any>)[]>(
			...types: R
		): Builder<Infer<R[number]>> {
			this._steps.push((state) => {
				let value = state.value;
				for (let type of types) {
					const result =
						type instanceof Schema
							? type.safeParse(value)
							: type[SYM_PARSE](value);
					if (result.success) {
						state.value = result.data;
						return;
					}
				}
				state.isValid = false;
			});
			return this as any;
		}
	}

	/** @internal Validation state for a single parse operation. */
	class ValidationState {
		value: any;
		isValid = true;
		error?: StringConvertible;
		errors?: Record<string, StringConvertible | undefined>;

		constructor(initialValue: any) {
			this.value = initialValue;
		}

		/** Runs the provided validation steps using this validation state. */
		run(steps: Array<undefined | ((state: ValidationState) => void)>) {
			try {
				for (const step of steps) !this._skip && step?.(this);
			} catch (e) {
				this.isValid = false;
				this.error = e instanceof Error ? e.message : String(e);
			}
			return this;
		}

		/** Skips all remaining steps; used for optional/nullable values. */
		skip() {
			this._skip = true;
		}

		/** Checks a condition if still valid. */
		check(fn: (value: any) => void | boolean) {
			this.isValid = this.isValid && !!fn(this.value);
		}

		private _skip?: boolean;
	}
}
