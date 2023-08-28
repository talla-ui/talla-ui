import { val2str } from "./log.js";

/** List of assertions that correspond to error messages */
const enum ASSERT {
	toBe,
	toEqual,
	toBeLessThan,
	toBeGreaterThan,
	toBeTypeOf,
	toBeArray,
	toBeInstanceOf,
	toMatchRegExp,
	toHaveProperty,
	toHaveMethod,
	toThrowError,
}

/** Functions that generate error messages for given values */
const msg: { [k in ASSERT]: (...v: any[]) => string } = {
	[ASSERT.toBe]: (n, a, b) => `Expected ${n} to be ${a}, but it is ${b}`,
	[ASSERT.toEqual]: (n, a, b) => `Expected ${n} to equal ${a}, but it is ${b}`,
	[ASSERT.toBeLessThan]: (n, a, b) =>
		`Expected ${n} to be less than ${a}, but it is ${b}`,
	[ASSERT.toBeGreaterThan]: (n, a, b) =>
		`Expected ${n} to be greater than ${a}, but it is ${b}`,
	[ASSERT.toBeTypeOf]: (n, a, b) =>
		`Expected type of ${n} to be ${a}, but it is ${b}`,
	[ASSERT.toBeArray]: (n, a) => `Expected ${n} to be an array, but it is ${a}`,
	[ASSERT.toMatchRegExp]: (n, s, re) => `RegExp ${re} failed on ${n}: ${s}`,
	[ASSERT.toBeInstanceOf]: (n, a, b) =>
		`Expected ${n} to be instance of ${a}, but it is ${b}`,
	[ASSERT.toHaveProperty]: (n, a) => `Expected ${n} to have property ${a}`,
	[ASSERT.toHaveMethod]: (n, a) => `Expected ${n} to have method ${a}`,
	[ASSERT.toThrowError]: (n) =>
		`Expected ${n} function to throw an error, but it did not`,
};

/** Functions that generate error messages for given values */
const msgInv: { [p in ASSERT]: (...v: any[]) => string } = {
	[ASSERT.toBe]: (n, a) => `Expected ${n} not to be ${a}, but it is`,
	[ASSERT.toEqual]: (n, a) => `Expected ${n} not to equal ${a}, but it does`,
	[ASSERT.toBeLessThan]: (n, a, b) =>
		`Expected ${n} not to be less than ${a}, but it is ${b}`,
	[ASSERT.toBeGreaterThan]: (n, a, b) =>
		`Expected ${n} not to be greater than ${a}, but it is ${b}`,
	[ASSERT.toBeTypeOf]: (n, a) => `Expected ${n} type to be not ${a}, but it is`,
	[ASSERT.toBeArray]: (n) => `Expected ${n} not to be an array, but it is`,
	[ASSERT.toBeInstanceOf]: (n, a) =>
		`Expected ${n} not to be instance of ${a}, but it is`,
	[ASSERT.toMatchRegExp]: (n, s, re) => `RegExp ${re} matched on ${n}: ${s}`,
	[ASSERT.toHaveProperty]: (n, a) =>
		`Expected ${n} object not to have property ${a}, but it does`,
	[ASSERT.toHaveMethod]: (n, a) =>
		`Expected ${n} object not to have method ${a}, but it does`,
	[ASSERT.toThrowError]: (n) =>
		`Expected ${n} function not to throw an error, but it did`,
};

/** Represents a value ready to be asserted */
export class Assertion<T> {
	/**
	 * Creates a new assertion using given value to test
	 * @note Use the {@link expect()} function to create assertions rather than instantiating this class directly.
	 */
	constructor(value: any, name = "value") {
		this.value = value;
		this.name = name;
	}

	/** The value being asserted */
	readonly value: any;

	/** The name of the assertion, used in error messages */
	readonly name: string;

	/**
	 * Evaluates to a new negated assertion, where all methods mean the opposite of those on the current instance
	 * @see {@link NegatedAssertion}
	 * @readonly
	 * @example
	 * // these are the same:
	 * expect(1).toBeLessThan(2);
	 * expect(1).not.toBeGreaterThanOrEqualTo(2);
	 */
	get not(): NegatedAssertion<T> {
		return this instanceof NegatedAssertion
			? new Assertion(this.value, this.name)
			: new NegatedAssertion(this.value, this.name);
	}

	/** Returns a new assertion for the return value of `Array.from(...)` on the current value */
	asArray() {
		if (this instanceof NegatedAssertion) throw TypeError();
		return new Assertion(
			Array.from(this.value),
			"Array.from(" + this.name + ")"
		);
	}

	/** Returns a new assertion for the boolean representation of the current value */
	asBoolean() {
		return new Assertion(
			Boolean(this instanceof NegatedAssertion ? !this.value : this.value),
			"Boolean(" + this.name + ")"
		);
	}

	/** Returns a new assertion for the string representation of the current value */
	asString() {
		if (this instanceof NegatedAssertion) throw TypeError();
		return new Assertion(String(this.value), "String(" + this.name + ")");
	}

	/**
	 * Returns a new assertion for the number representation of the current value
	 * @note The current value is converted using the `+` operator (i.e. `+value`).
	 */
	asNumber() {
		if (this instanceof NegatedAssertion) throw TypeError();
		return new Assertion(+this.value, "+(" + this.name + ")");
	}

	/**
	 * Returns a new assertion for the JSON representation of the current value
	 * @summary This method calls `JSON.stringify()` with the current value, and given arguments.
	 * @param replacer The replacer passed to `JSON.stringify`, if any
	 * @param space Indentation string passed to `JSON.stringify`, if any
	 */
	asJSONString(replacer?: (key: string, value: any) => any, space?: string) {
		if (this instanceof NegatedAssertion) throw TypeError();
		return new Assertion(
			JSON.stringify(this.value, replacer, space),
			"JSON of " + this.name
		);
	}

	/** Asserts that the value is strictly equal to given value (using the `===` operator) */
	toBe(value?: T) {
		if (this.value === value) return;
		throw Error(
			msg[ASSERT.toBe](this.name, val2str(value), val2str(this.value))
		);
	}

	/** Asserts that the value is strictly equal to one of given values */
	toBeOneOf(...values: T[]) {
		if (values.some((v) => v === this.value)) return;
		throw Error(
			msg[ASSERT.toBe](
				this.name,
				"one of " + val2str(values),
				val2str(this.value)
			)
		);
	}

	/** Asserts that the value is loosely equal to given value (using the `==` operator) */
	toEqual(value: any) {
		if (this.value == value) return;
		throw Error(
			msg[ASSERT.toEqual](this.name, val2str(value), val2str(this.value))
		);
	}

	/** Asserts that the value is loosely equal to one of given values */
	toEqualOneOf(...values: any[]) {
		if (values.some((v) => v == this.value)) return;
		throw Error(
			msg[ASSERT.toEqual](
				this.name,
				"one of " + val2str(values),
				val2str(this.value)
			)
		);
	}

	/** Asserts that the value is less than given value */
	toBeLessThan(value: number) {
		if ((this.value as any) < value) return;
		throw Error(
			msg[ASSERT.toBeLessThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is greater than given value */
	toBeGreaterThan(value: number) {
		if ((this.value as any) > value) return;
		throw Error(
			msg[ASSERT.toBeGreaterThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is less than or equal to given value */
	toBeLessThanOrEqualTo(value: number) {
		if ((this.value as any) <= value) return;
		throw Error(
			msgInv[ASSERT.toBeGreaterThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is greater than or equal to given value */
	toBeGreaterThanOrEqualTo(value: number) {
		if ((this.value as any) >= value) return;
		throw Error(
			msgInv[ASSERT.toBeLessThan](this.name, value, val2str(this.value))
		);
	}

	/** Evaluates asBoolean().toBe(true) */
	toBeTruthy() {
		this.asBoolean().toBe(true);
	}

	/** Evaluates asBoolean().toBe(false) */
	toBeFalsy() {
		this.asBoolean().toBe(false);
	}

	/** Evaluates toBe(undefined) */
	toBeUndefined() {
		this.toBe(undefined);
	}

	/** Evaluates toBeUndefined() */
	toBeDefined() {
		this.not.toBeUndefined();
	}

	/** Evaluates toBe(null) */
	toBeNull() {
		this.toBe(null as any);
	}

	/** Asserts that the value is `NaN` */
	toBeNaN() {
		if (typeof this.value === "number" && isNaN(this.value)) return;
		throw Error(msg[ASSERT.toBe](this.name, "NaN", val2str(this.value)));
	}

	/**
	 * Asserts that the value is of given type
	 * @example
	 * // this succeeds:
	 * expect("foo").toBeTypeOf("string");
	 * expect(123).toBeTypeOf("number");
	 * expect(null).toBeTypeOf("object");
	 *
	 * // this fails:
	 * expect(undefined).toBeTypeOf("object");
	 */
	toBeTypeOf(typeStr: string) {
		let actual = typeof this.value;
		if (actual === typeStr) return;
		throw Error(msg[ASSERT.toBeTypeOf](this.name, typeStr, actual));
	}

	/**
	 * Asserts that the value is an array, optionally with given length or elements.
	 * @summary If a number parameter is provided, checks that the array length matches the given number. If an array parameter is provided, checks that both the length and all array elements match (strict equals).
	 * @note The {@link NegatedAssertion.toBeArray()} version of this method (i.e. `.not.toBeArray()`) only tests for array types, not length or elements.
	 * @param match The array length, **or** all array elements to match
	 *
	 * @example
	 * // this succeeds:
	 * let a = [1, 2, 3];
	 * expect(a).toBeArray();
	 * expect(a).toBeArray(3);
	 * expect(a).toBeArray([1, 2, 3]);
	 *
	 * // this fails:
	 * expect(a).not.toBeArray();
	 * expect(a).toBeArray(1);
	 * expect(a).toBeArray([3, 2, 1]);
	 */
	toBeArray(match?: number | ReadonlyArray<any>) {
		if (Array.isArray(this.value)) {
			if (Array.isArray(match)) {
				new Assertion(this.value.length, "array length").toBe(match.length);
				match.forEach((m, i) => {
					new Assertion(this.value[i], "array element " + i).toBe(m);
				});
			}
			if (typeof match === "number") {
				new Assertion(this.value.length, "array length").toBe(match);
			}
			return;
		}
		throw Error(msg[ASSERT.toBeArray](this.name, val2str(this.value)));
	}

	/** Asserts that the value is an instance of given class (using the `instanceof` operator) */
	toBeInstanceOf(C: any) {
		if (this.value instanceof C) return;
		throw Error(
			msg[ASSERT.toBeInstanceOf](
				this.name,
				C.name || "Unknown class",
				val2str(this.value)
			)
		);
	}

	/**
	 * Asserts that the value is a string that matches given regular expression
	 * @note The assertion fails if the value is not a string. Use the {@link asString()} method to convert the value first if needed.
	 * @example
	 * // this succeeds:
	 * let s = "foo";
	 * expect(s).toMatchRegExp(/o+/);
	 */
	toMatchRegExp(re: RegExp) {
		this.toBeTypeOf("string");
		if (re.test(this.value)) return;
		throw Error(msg[ASSERT.toMatchRegExp](this.name, val2str(this.value), re));
	}

	/**
	 * Asserts that the value is an object that includes a property with given name (using the `in` operator)
	 * - This method also succeeds for properties that are defined on the object's prototype.
	 * @returns A new assertion for the value of the property, which can be evaluated using further {@link Assertion} methods.
	 * @see {@link toHaveMethod()}
	 * @example
	 * // assert the value of a property, checking that it exists first:
	 * let obj = { foo: "bar" };
	 * expect(obj).toHaveProperty("foo").toBe("bar");
	 */
	toHaveProperty(propertyName: string) {
		let checkAssert = new Assertion(
			this.value,
			"object with property " + propertyName
		);
		checkAssert.not.toBeUndefined();
		checkAssert.not.toBeNull();
		let name = this.name.startsWith("property ")
			? this.name + "." + propertyName
			: "property " + propertyName;
		if (propertyName in this.value)
			return new Assertion(this.value[propertyName], name);
		throw Error(msg[ASSERT.toHaveProperty](this.name, propertyName));
	}

	/**
	 * Asserts that the value is an object that includes the same properties with the same values (strict equals) as the specified object
	 * - This method only checks for properties that strictly equal the specified property values. To check for nested properties, use a separate call for the properties of each object value.
	 * @see {@link toHaveProperty()}
	 * @example
	 * let obj = {
	 *   foo: "foo",
	 *   bar: 123,
	 *   baz: { x: 1, y: 2 }
	 * };
	 *
	 * // assert foo and bar property values
	 * expect(obj).toHaveProperties({ foo: "foo", bar: 123 });
	 *
	 * // assert baz property with x and y property values
	 * expect(obj)
	 *   .toHaveProperty("baz")
	 *   .toHaveProperties({ x: 1, y: 2 })
	 */
	toHaveProperties(object: any) {
		for (let p in object) {
			this.toHaveProperty(p).toBe(object[p]);
		}
	}

	/**
	 * Asserts that the value is an object that includes a function property with given name
	 * @returns A new assertion for the method, bound to the object, which can be evaluated using further {@link Assertion} methods such as {@link toThrowError()}.
	 * @see {@link toHaveProperty()}
	 * @example
	 * // assert that a method exists and doesn't throw an error:
	 * let s = "foo";
	 * expect(s).toHaveMethod("toUpperCase").not.toThrowError();
	 */
	toHaveMethod(methodName: string) {
		let checkAssert = new Assertion(
			this.value,
			"object with property " + methodName
		);
		checkAssert.not.toBeUndefined();
		checkAssert.not.toBeNull();
		let name = methodName + " method of " + this.name;
		if (typeof this.value[methodName] === "function")
			return new Assertion(this.value[methodName].bind(this.value), name);
		throw Error(msg[ASSERT.toHaveMethod](this.name, methodName));
	}

	/**
	 * Runs a function and asserts that it throws an error when called with given arguments
	 * @param args The arguments passed directly to the function, if any
	 * @returns A new assertion for the error that was caught. The negated version {@link NegatedAssertion.toThrowError()} (i.e. `.not.toThrowError()`) returns an assertion for the function's return value instead.
	 * @see {@link toThrowErrorAsync()}
	 * @example
	 * // catch an error:
	 * expect(() => {
	 *   throw Error("Catch me");
	 * }).toThrowError();
	 *
	 * // check the error message:
	 * expect(() => {
	 *   throw Error("Catch me");
	 * })
	 * 	 .toThrowError()
	 *   .toHaveProperty("message")
	 *   .toMatchRegExp(/Catch/);
	 */
	toThrowError(...args: any[]): Assertion<any> {
		if (typeof this.value !== "function") {
			throw Error(this.name + " is not a function: " + val2str(this.value));
		}
		try {
			(this.value as Function).apply(undefined, args);
		} catch (err) {
			return new Assertion(err, "[Caught error]");
		}
		throw Error(msg[ASSERT.toThrowError](this.name));
	}

	/**
	 * Runs a function and asserts that it throws an error _or_ results in a promise that's rejected
	 * @note This function is asynchronous and must be `await`-ed.
	 * @param args The arguments passed directly to the function, if any
	 * @returns A promise for a new assertion for the error that's caught. The negated version {@link NegatedAssertion.toThrowErrorAsync()} (i.e. `.not.toThrowErrorAsync()`) returns a promise for an assertion for the function's return value instead.
	 * @see {@link toThrowError()}
	 * @example
	 * // catch an error or rejected promise:
	 * await expect(async () => {
	 *   throw Error("Catch me");
	 * }).toThrowErrorAsync();
	 *
	 * // check the error message:
	 * let expectError = await expect(async () => {
	 *   throw Error("Catch me");
	 * }).toThrowErrorAsync();
	 * expectError
	 *   .toHaveProperty("message")
	 *   .toMatchRegExp(/Catch/);
	 */
	async toThrowErrorAsync(...args: any[]): Promise<Assertion<any>> {
		if (typeof this.value !== "function") {
			throw Error(this.name + " is not a function: " + val2str(this.value));
		}
		try {
			await this.value.apply(undefined, args);
		} catch {
			return new Assertion(undefined, "[function threw error async]");
		}
		throw Error(msg[ASSERT.toThrowError](this.name + " (async)"));
	}
}

/**
 * Represents a value ready to be asserted, using inverse logic
 * @hideconstructor
 */
export class NegatedAssertion<T> extends Assertion<T> {
	/** Asserts that the value is not strictly equal to given value (using the `!==` operator) */
	override toBe(value?: T) {
		if (this.value !== value) return;
		throw Error(msgInv[ASSERT.toBe](this.name, val2str(value)));
	}

	/** Asserts that the value is not strictly equal to any of given values */
	override toBeOneOf(...values: T[]) {
		if (!values.some((v) => v === this.value)) return;
		throw Error(msgInv[ASSERT.toBe](this.name, "one of " + val2str(values)));
	}

	/** Asserts that the value is not loosly equal to given value (using the `!=` operator) */
	override toEqual(value: number) {
		if (this.value != value) return;
		throw Error(msgInv[ASSERT.toEqual](this.name, val2str(value)));
	}

	/** Asserts that the value is not loosely equal to any of given values */
	override toEqualOneOf(...values: any[]) {
		if (!values.some((v) => v == this.value)) return;
		throw Error(msgInv[ASSERT.toEqual](this.name, "one of " + val2str(values)));
	}

	/** Asserts that the value is not less than given value */
	override toBeLessThan(value: number) {
		if (!((this.value as any) < value)) return;
		throw Error(
			msgInv[ASSERT.toBeLessThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is not greater than given value */
	override toBeGreaterThan(value: number) {
		if (!((this.value as any) > value)) return;
		throw Error(
			msgInv[ASSERT.toBeGreaterThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is not less than or equal to given value */
	override toBeLessThanOrEqualTo(value: number) {
		if (!((this.value as any) <= value)) return;
		throw Error(
			msg[ASSERT.toBeGreaterThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is not greater than or equal to given value */
	override toBeGreaterThanOrEqualTo(value: number) {
		if (!((this.value as any) >= value)) return;
		throw Error(
			msg[ASSERT.toBeLessThan](this.name, value, val2str(this.value))
		);
	}

	/** Asserts that the value is not `NaN` */
	override toBeNaN() {
		if (typeof this.value !== "number" || !isNaN(this.value)) return;
		throw Error(msgInv[ASSERT.toBe](this.name, "NaN"));
	}

	/**
	 * Asserts that the value is not of given type
	 * @example
	 * // this succeeds:
	 * expect(3).not.toBeTypeOf("string");
	 */
	override toBeTypeOf(typeStr: string) {
		let actual = typeof this.value;
		if (actual !== typeStr) return;
		throw Error(msgInv[ASSERT.toBeTypeOf](this.name, typeStr));
	}

	/**
	 * Asserts that the value is not an array
	 * @note This negated version does **not** take the same parameters as the base method {@link Assertion.toBeArray()}
	 */
	override toBeArray(match?: any) {
		if (match)
			throw Error("Array match is not available on negative assertion");
		if (!Array.isArray(this.value)) return;
		throw Error(msgInv[ASSERT.toBeArray](this.name));
	}

	/** Asserts that the value is not an instance of given class */
	override toBeInstanceOf(C: any) {
		if (!(this.value instanceof C)) return;
		throw Error(
			msgInv[ASSERT.toBeInstanceOf](this.name, C.name || "Unknown class")
		);
	}

	/**
	 * Asserts that the value is a string that doesn't match given regular expression
	 * @note The assertion still fails if the value is not a string. Use the {@link Assertion.asString()} method to convert the value first if needed.
	 * @example
	 * // this succeeds:
	 * let s = "foo";
	 * expect(s).not.toMatchRegExp(/a/);
	 *
	 * // this fails:
	 * let n = 123;
	 * expect(n).not.toMatchRegExp(/a/);
	 */
	override toMatchRegExp(re: RegExp) {
		this.not.toBeTypeOf("string");
		if (!re.test(this.value)) return;
		throw Error(
			msgInv[ASSERT.toMatchRegExp](this.name, val2str(this.value), re)
		);
	}

	/**
	 * Asserts that the value is an object that doesn't include given property
	 * @see {@link Assertion.toHaveProperty()}
	 */
	override toHaveProperty(propertyName: string) {
		let checkAssert = new Assertion(
			this.value,
			"object with property " + propertyName
		);
		checkAssert.not.toBeUndefined();
		checkAssert.not.toBeNull();
		let name = this.name.startsWith("property ")
			? this.name + "." + propertyName
			: "property " + propertyName;
		if (!(propertyName in this.value)) return new Assertion(undefined, name);
		throw Error(msgInv[ASSERT.toHaveProperty](this.name, propertyName));
	}

	/**
	 * Asserts that the value is an object that doesn't include the same properties with the same values (strict equals) as the specified object
	 * @see {@link Assertion.toHaveProperties()}
	 */
	override toHaveProperties(object: any) {
		let checkAssert = new Assertion(this.value, "object with properties");
		checkAssert.not.toBeUndefined();
		checkAssert.not.toBeNull();
		for (let p in object) {
			if (!(p in this.value)) continue;
			let assert = new Assertion(this.value[p], "property " + p);
			assert.not.toBe(object[p]);
		}
	}

	/**
	 * Asserts that the value is an object that doesn't include given method
	 * @see {@link Assertion.toHaveMethod()}
	 */
	override toHaveMethod(methodName: string) {
		let checkAssert = new Assertion(
			this.value,
			"object with method " + methodName
		);
		checkAssert.not.toBeUndefined();
		checkAssert.not.toBeNull();
		let name = methodName + " method of " + this.name;
		if (typeof this.value[methodName] !== "function")
			return new Assertion(undefined, name);
		throw Error(msgInv[ASSERT.toHaveMethod](this.name, methodName));
	}

	/**
	 * Runs a function and asserts that it doesn't throw an error when called with given arguments
	 * @param args The arguments passed directly to the function, if any
	 * @returns A new assertion for the return value.
	 * @see {@link Assertion.toThrowError()}
	 * @see {@link toThrowErrorAsync()}
	 */
	override toThrowError(...args: any[]) {
		if (typeof this.value !== "function") {
			throw Error(this.name + " is not a function: " + val2str(this.value));
		}
		try {
			return new Assertion(
				this.value.apply(undefined, args),
				"[call " + this.name + "]"
			);
		} catch {
			throw Error(msgInv[ASSERT.toThrowError](this.name));
		}
	}

	/**
	 * Runs a function and asserts that it doesn't throw an error _or_ returns a promise that's rejected
	 * @note This function is asynchronous and must be `await`-ed.
	 * @param args The arguments passed directly to the function, if any
	 * @returns A promise for a new assertion for the return value.
	 * @see {@link Assertion.toThrowErrorAsync()}
	 * @see {@link toThrowError()}
	 */
	override async toThrowErrorAsync(...args: any[]): Promise<Assertion<any>> {
		if (typeof this.value !== "function") {
			throw Error(this.name + " is not a function: " + val2str(this.value));
		}
		try {
			return new Assertion(
				await this.value.apply(undefined, args),
				"[call " + this.name + "]"
			);
		} catch {
			throw Error(msgInv[ASSERT.toThrowError](this.name + " (async)"));
		}
	}
}
