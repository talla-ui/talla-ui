import { StringConvertible } from "./DeferredString";

/** Default error message for invalid values */
const DEFAULT_ERROR = "Invalid input";

/** Default error message for required values */
const DEFAULT_REQUIRED_ERROR = "Required";

/** Parse method key (for hiding the parse method on the ValidationBuilder class) */
const SYM_PARSE = Symbol("parse");

/**
 * A class that represents a validation schema for input values, objects, and arrays
 *
 * This class can be used to validate and parse both individual values (strings, numbers, booleans, dates) as well as objects and arrays. The constructor accepts a callback function, which should use the provided set of builder functions with a fluent interface to define a validation schema.
 *
 * The resulting instance can be used to 'parse' unknown values safely, either throwing an error if the value is invalid, or returning an object with a success/failure flag and the parsed data on success (or the error message(s) on failure).
 *
 * Error messages can be specified as part of the schema. It's recommended to use specific, localizable error messages for all input values, if errors are exposed to the application user. Limited default error messages are provided and can be overridden, using {@link InputValidator.errors}.
 *
 * Input validators are reusable, and can be used to specify the schema for nested objects and arrays.
 *
 * This class is also used for form validation by the {@link FormState} class. That class creates (or reuses) a {@link InputValidator} instance to validate the form data and update field errors.
 *
 * @example
 * const userSchema = new InputValidator((f) =>
 *   f.object({
 *     name: f.string().required("Name is required"),
 *     age: f.number().required().positive(),
 *     email: f.string().check(s => s.includes("@")).error("Invalid email")
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
export class InputValidator<
	TSchema extends
		InputValidator.ValidationBuilder = InputValidator.ValidationBuilder,
> {
	/** Default error messages, can be changed to localizable messages at application startup */
	static errors = {
		DEFAULT: DEFAULT_ERROR as StringConvertible,
		REQUIRED: DEFAULT_REQUIRED_ERROR as StringConvertible,
	};

	/**
	 * Creates a new input validator instance
	 * @param define A callback function that should use the provided set of schema builder functions to define the schema.
	 */
	constructor(
		define:
			| ((build: InputValidator.Builders) => TSchema | InputValidator<TSchema>)
			| InputValidator<TSchema>,
	) {
		let schema =
			define instanceof InputValidator
				? define._schema
				: define(InputValidator.build);
		if (schema instanceof InputValidator) schema = schema._schema;
		if (!(schema instanceof InputValidator.ValidationBuilder))
			throw RangeError();
		this._schema = schema;
	}

	/**
	 * The schema definition for this input validator, read-only
	 * @note The validation schema is expressed as an instance of {@link InputValidator.ValidationBuilder}, i.e. the result of one of the builder functions in {@link InputValidator.build}.
	 */
	get schema(): TSchema {
		return this._schema;
	}

	/**
	 * Parses and validates the input, throwing an error if validation fails.
	 * @param input The value to validate
	 * @returns The validated and transformed data
	 * @error If validation fails, throws an error with the validation message
	 */
	parse(input: unknown): InputValidator.Infer<TSchema> {
		const result = this._schema[SYM_PARSE](input);
		if (!result.success) throw new Error((result as any).error);
		return result.data as InputValidator.Infer<TSchema>;
	}

	/**
	 * Parses and validates the input, returning an object with the result or error message(s)
	 * - On success, the result includes a `true` value for the success property, and the parsed data (typed using the schema: either a single value or an object/array).
	 * - On failure, the result includes a `false` value for the success property, and the error message(s). A single error message is returned if the schema is a single value. If the schema defines an object, multiple error messages are returned as properties of the errors object.
	 * @param input The value to validate
	 * @returns A result object with either success/data or success/error/errors properties
	 */
	safeParse(
		input: unknown,
	): InputValidator.ParseResult<InputValidator.Infer<TSchema>> {
		const result = this._schema[SYM_PARSE](input);
		return result.success
			? ({
					success: true,
					data: result.data,
				} as InputValidator.ParseResult<any>)
			: ({
					success: false,
					error: (result as any).error,
					errors: (result as any).errors,
				} as InputValidator.ParseResult<any>);
	}

	/** @internal The schema definition for this input validator */
	private _schema: TSchema;
}

export namespace InputValidator {
	/**
	 * The result of an input validator parse operation.
	 * - An object of this type is returned by the {@link InputValidator.safeParse} method.
	 * - If the `success` property is `true`, the `data` property contains the validated and transformed data. Otherwise, the `error` property contains the error message, and the `errors` property contains individual error messages for each object property that failed validation, if the schema defines an object.
	 */
	export type ParseResult<T> =
		| {
				success: true;
				data: T;
				error: undefined;
				errors: undefined;
		  }
		| {
				success: false;
				error: StringConvertible;
				errors?: Record<string, StringConvertible | undefined>;
				data: undefined;
		  };

	/**
	 * Utility type that infers the type of a parsed value
	 * - This type can be used to infer the type of a parsed value, based on a {@link ValidationBuilder} or {@link InputValidator} instance.
	 */
	export type Infer<T extends ValidationBuilder | InputValidator<any>> =
		T extends InputValidator<infer Schema>
			? Infer<Schema>
			: T extends ValidationBuilder<infer T>
				? T
				: never;

	/**
	 * A type that can be used to initialize an {@link InputValidator} instance, as the constructor argument.
	 * @note This type can be used to accept an argument outside of the {@link InputValidator.build} class, and be able to construct an {@link InputValidator} instance from it.
	 */
	export type Initializer<TOutput> =
		| InputValidator<ValidationBuilder<TOutput>>
		| ((builders: Builders) => ValidationBuilder<TOutput>);

	/** The type of the {@link InputValidator.build} object, passed to the initializer function */
	export type Builders = typeof build;

	/**
	 * An object containing functions that create {@link ValidationBuilder} instances for specific types
	 *
	 * @example
	 * const schema = new InputValidator((f) => {
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
		/** Creates a validation that accepts any value type */
		any: () => new ValidationBuilder(),

		/** Creates a validation that accepts a string value */
		string: () => new ValidationBuilder().string(),

		/** Creates a validation that accepts a number value */
		number: () => new ValidationBuilder().number(),

		/** Creates a validation that accepts an integer value */
		int: () => new ValidationBuilder().int(),

		/** Creates a validation that accepts a boolean value */
		boolean: () => new ValidationBuilder().boolean(),

		/** Creates a validation that accepts a date value */
		date: () => new ValidationBuilder().date(),

		/**
		 * Creates a validation that accepts an array of values
		 * @param item The validation builder that validates each array item
		 */
		array: <T extends ValidationBuilder>(item: T | InputValidator<T>) =>
			new ValidationBuilder().array(item),

		/**
		 * Creates a validation that accepts an object with specific properties
		 * @param schema An object mapping property names to validation builders
		 */
		object: <T extends Record<string, ValidationBuilder | InputValidator<any>>>(
			schema: T,
		) => new ValidationBuilder().object(schema),

		/**
		 * Creates a validation that only accepts a specific value.
		 * @param value The exact value that must match
		 */
		literal: <T extends string | number | boolean>(value: T | T[]) =>
			new ValidationBuilder().literal(value),

		/**
		 * Creates a validation that accepts any of the provided types (validations)
		 * - The resulting validation will try to validate against each type in order, until one succeeds.
		 * @param types The validations to try (in order)
		 */
		union: <T extends (ValidationBuilder | InputValidator<any>)[]>(
			...types: T
		) => new ValidationBuilder().union(...types),

		/** A shortcut for calling `optional` on the provided validation builder */
		optional: <T>(b: ValidationBuilder<T>) => b.optional(),

		/** A shortcut for calling `nullable` on the provided validation builder */
		nullable: <T>(b: ValidationBuilder<T>) => b.nullable(),

		/** Validation builder methods that coerce the input value to the target type */
		coerce: {
			string: () => new ValidationBuilder().preprocess(String).string(),
			number: () => new ValidationBuilder().preprocess(Number).number(),
			boolean: () => new ValidationBuilder().preprocess(Boolean).boolean(),
			date: () =>
				new ValidationBuilder().preprocess((d) => new Date(d as any)).date(),
		},
	});

	/**
	 * A class that represents a validation schema for an input value
	 * - An object of this type is returned by {@link InputValidator.build} methods i.e. `f.string()`. You can add a default value and/or further validation and transformation steps using the methods of this class.
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
	 *   .trim()                   // Trim whitespace
	 *   .toLowerCase()            // Convert to lowercase
	 *   .toUpperCase()            // Convert to uppercase
	 */
	export class ValidationBuilder<T = any> {
		/** @internal Validation steps, in order of execution */
		protected _steps: Array<undefined | ((state: ValidationState) => void)> = [
			undefined, // default / optional
		];

		/** @internal Parses the provided value and returns a result object */
		[SYM_PARSE](value: unknown): ParseResult<T> {
			const state = new ValidationState(value).run(this._steps);
			return state.isValid
				? ({
						success: true,
						data: state.value,
					} as InputValidator.ParseResult<any>)
				: ({
						success: false,
						error: state.error || InputValidator.errors.DEFAULT,
						errors: state.errors,
					} as InputValidator.ParseResult<any>);
		}

		/** For a literal value validator only, the values that are accepted */
		values: T[] | undefined;

		/** For an object validator only, the properties that are accepted */
		shape: Record<string, ValidationBuilder | InputValidator<any>> | undefined;

		/**
		 * Sets a default value
		 * - The default value is used if the input value is undefined.
		 * - The default value can be a static value, or be provided by a callback function that returns a value.
		 * - You don't need to call {@link optional()} before calling this method, since any undefined values will be replaced by the default value anyway.
		 * @param value The default value to use if the input value is undefined
		 * @returns The validation builder object itself, for chaining
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
		 * Marks the value as optional, allowing undefined values
		 * @returns The validation builder object itself, for chaining
		 */
		optional(): ValidationBuilder<T | undefined> {
			this._steps[0] ||= (state) => state.value === undefined && state.skip();
			return this;
		}

		/**
		 * Marks the value as nullable, allowing null values (but not undefined)
		 * @returns The validation builder object itself, for chaining
		 */
		nullable(): ValidationBuilder<T | null> {
			this._steps.splice(1, 0, (state) => state.value === null && state.skip());
			return this;
		}

		/**
		 * Adds a required check (not null, undefined, NaN, or empty string)
		 * - The required check is applied after all other checks and transformations that have been added to this validation so far.
		 * - If no error message is provided, the default error message is used (see {@link InputValidator.errors}). However, it's recommended to provide a more specific and localizable error message as an argument to this method.
		 * @param error The error message to use if the value is not valid
		 * @returns The validation builder object itself, for chaining
		 * @example
		 * f.string().required();
		 * f.number().required("Age must be a valid number");
		 */
		required(
			error?: StringConvertible,
		): ValidationBuilder<Exclude<T, undefined | null>> {
			this._steps.push((state) => {
				const value = state.value;
				if (
					value === null ||
					value === undefined ||
					(typeof value === "number" && isNaN(value)) ||
					(typeof value === "string" && value === "")
				) {
					state.isValid = false;
					state.error = error || InputValidator.errors.REQUIRED;
				}
			});
			return this as any;
		}

		/**
		 * Adds a validation check, using the provided function
		 * - The input value is considered valid if the function returns a truthy value.
		 * - The provided function only runs if all previous validation steps have passed.
		 * @param f The callback function for checking each value
		 * @returns The validation builder object itself, for chaining
		 */
		check(f: (value: T) => void | boolean): this {
			this._steps.push((state) => state.check(f));
			return this;
		}

		/**
		 * Sets the error message, used when the previous check(s) have failed
		 * - Multiple calls to this method are allowed, setting the error message to the provided value if the previously added check(s) have failed.
		 * @param message The error message to use if the value is not valid
		 * @returns The validation builder object itself, for chaining
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
		 * Transforms the value using the provided callback function
		 * - The transformation function is applied after all other checks and transformations that have been added to this validation so far. The argument to the function is therefore the value that has passed all previous checks and transformations.
		 * - Additional checks and transformations can be added after this method call.
		 * @param fn The transformation function
		 * @returns The validation builder object itself, for chaining, but typed using the return type of the transformation function
		 * @example
		 * f.string().transform(s => s.trim()).check(s => s.length > 0);
		 * f.number().transform(n => n * 100).positive();
		 */
		transform<R>(fn: (value: T) => R): ValidationBuilder<R> {
			this._steps.push((state) => {
				if (state.isValid) state.value = fn(state.value);
			});
			return this as any;
		}

		/**
		 * Replaces the input value using the provided callback function
		 * - The specified function is run before any other checks and transformations, but after optional/default checks. The argument to the function is the raw input value, of type `unknown`.
		 * - This method is used by the `coerce` set of functions.
		 * @param fn The callback function for preprocessing the input value
		 * @returns The validation builder object itself, for chaining
		 */
		preprocess(fn: (value: unknown) => unknown): this {
			this._steps.splice(1, 0, (state) => {
				if (state.isValid) state.value = fn(state.value);
			});
			return this;
		}

		/** Validates that the input value is a string */
		string(): ValidationBuilder<string> {
			this.check((value) => typeof value === "string");
			return this as any;
		}

		/**
		 * Transforms string input values to remove all leading and trailing whitespace
		 * @note If the input value is not a string, an empty string is used instead.
		 * @example
		 * f.string().trim();
		 */
		trim() {
			return this.transform((value) =>
				typeof value === "string" ? value.trim() : "",
			);
		}

		/**
		 * Transforms string input values to convert them to lowercase
		 * @note If the input value is not a string, an empty string is used instead.
		 * @example
		 * f.string().toLowerCase();
		 */
		toLowerCase() {
			return this.transform((value) =>
				typeof value === "string" ? value.toLowerCase() : "",
			);
		}

		/**
		 * Transforms string input values to convert them to uppercase
		 * @note If the input value is not a string, an empty string is used instead.
		 * @example
		 * f.string().toUpperCase();
		 */
		toUpperCase() {
			return this.transform((value) =>
				typeof value === "string" ? value.toUpperCase() : "",
			);
		}

		/** Validates that the input value is a number */
		number(): ValidationBuilder<number> {
			this.check((value) => typeof value === "number" && !isNaN(value));
			return this as any;
		}

		/** Validates that the input value is an integer */
		int(): ValidationBuilder<number> {
			this.check(Number.isInteger);
			return this as any;
		}

		/** Validates that the input value is a boolean value */
		boolean(): ValidationBuilder<boolean> {
			this.check((value) => typeof value === "boolean");
			return this as any;
		}

		/** Validates that the input value is a Date instance with a valid date */
		date(): ValidationBuilder<Date> {
			this.check((value) => value instanceof Date && !isNaN(value.getTime()));
			return this as any;
		}

		/**
		 * Validates that the input value is an array
		 * @param itemType The validation builder for the array items, or an existing {@link InputValidator} to use
		 * @returns The validation builder object itself, for chaining
		 */
		array<R extends ValidationBuilder>(
			itemType: R | InputValidator<R>,
		): ValidationBuilder<Infer<R>[]> {
			this._steps.push((state) => {
				const input = state.value as unknown[];
				if (!Array.isArray(input)) {
					state.isValid = false;
					return;
				}
				const output: any[] = (state.value = new Array(input.length));
				const v =
					itemType instanceof InputValidator
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

		/**
		 * Validates that the input value is an object
		 * @note Only the properties defined in the schema are validated and parsed. Other properties are ignored from the input object.
		 * @param shape The schema for the object properties, with property names as keys and validation builders (or existing {@link InputValidator} instances) as values
		 * @returns The validation builder object itself, for chaining
		 */
		object<R extends Record<string, ValidationBuilder | InputValidator<any>>>(
			shape: R,
		): ValidationBuilder<{ [K in keyof R]: Infer<R[K]> }> {
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
						type instanceof InputValidator
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

		/**
		 * Validates that the input value is one of the provided values
		 * @param values The value, or values that are allowed
		 * @returns The validation builder object itself, for chaining
		 */
		literal<R extends string | number | boolean>(
			values: R | R[],
		): ValidationBuilder<R> {
			this.check((value: any) =>
				Array.isArray(values) ? values.includes(value) : value === values,
			);
			(this as any).values = Array.isArray(values) ? values : [values];
			return this as any;
		}

		/**
		 * Validates that the input value matches one of the provided types
		 * @param types The types to try (in order), as validation builders or existing {@link InputValidator} instances
		 * @returns The validation builder object itself, for chaining
		 */
		union<R extends (ValidationBuilder | InputValidator<any>)[]>(
			...types: R
		): ValidationBuilder<Infer<R[number]>> {
			this._steps.push((state) => {
				let value = state.value;
				for (let type of types) {
					const result =
						type instanceof InputValidator
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

	/** @internal Validation state for a single parse operation */
	class ValidationState {
		value: any;
		isValid = true;
		error?: StringConvertible;
		errors?: Record<string, StringConvertible | undefined>;

		constructor(initialValue: any) {
			this.value = initialValue;
		}

		/** Run the provided validation steps using this validation state */
		run(steps: Array<undefined | ((state: ValidationState) => void)>) {
			try {
				for (const step of steps) !this._skip && step?.(this);
			} catch (e) {
				this.isValid = false;
				this.error = e instanceof Error ? e.message : String(e);
			}
			return this;
		}

		/** Skip all remaining steps, if any (used for optional/nullable values) */
		skip() {
			this._skip = true;
		}

		/** Check a condition, if still valid */
		check(fn: (value: any) => void | boolean) {
			this.isValid = this.isValid && !!fn(this.value);
		}

		private _skip?: boolean;
	}
}
