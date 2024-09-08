---
folder: topics
abstract: Learn how to create and use assertions using the `expect()` function.
---

# Assertions

## Overview <!--{#overview}-->

When testing your application, a test run consists of several different _test cases_, typically run in quick succession. Each test is meant to either return successfully or throw an error. Sometimes a failing test 'naturally' throws an error (from elsewhere in your code), but more often tests include _assertions_ to validate certain values during the test run. An assertion compares a particular value based on an expected condition, and throws an error if the condition isn't met.

The Desk test library provides a fluent API for creating assertions, including a wide range of assertion methods for different types of values. Assertions throw errors that are caught by the test (scope) runner, which then marks the test as failed with a detailed error message that includes the assertion and actual value(s).

## Creating an assertion <!--{#expect}-->

The {@link expect()} function creates an assertion object for a particular value. However, the assertion itself doesn't actually validate anything yet. The returned object is an instance of {@link Assertion}, which contains different methods to compare the encapsulated value based on a particular condition — for example, the `.toBe()` method which checks for strict equality with another specified value.

- {@link expect +}
- {@link Assertion +}

```js
// assert that a variable matches a specific value
expect(myResult).toBe(123);
expect(myString).toMatchRegExp(/foo/);
```

You can also _negate_ the assertion by adding `.not` in front of the assertion method. This turns the {@link Assertion} object into a new {@link NegatedAssertion} object.

- {@link NegatedAssertion +}

```js
// These are the same:
expect(2).toBeGreaterThan(1);
expect(2).not.toBeLessThanOrEqualTo(1);
```

### Asserting equality

The following assertion methods can be used to validate that a value is (strictly) equal to a given value.

- {@link Assertion.toBe}
- {@link Assertion.toBeUndefined}
- {@link Assertion.toBeNull}
- {@link Assertion.toBeOneOf}
- {@link Assertion.toEqual}
- {@link Assertion.toEqualOneOf}

The following method can be used to assert the _type_ of a value (i.e. the result of `typeof`).

- {@link Assertion.toBeTypeOf}

### Numeric assertions

In addition to equality assertions, the following assertion methods can be used to validate numeric values.

- {@link Assertion.toBeLessThan}
- {@link Assertion.toBeLessThanOrEqualTo}
- {@link Assertion.toBeGreaterThan}
- {@link Assertion.toBeGreaterThanOrEqualTo}
- {@link Assertion.toBeNaN}

### Boolean assertions

The following assertion methods can be used to loosely check for 'truthy' and 'falsy' values. The asserted value is converted to a boolean value first, and then checked against `true` or `false`.

- {@link Assertion.toBeTruthy}
- {@link Assertion.toBeFalsy}

> **Note:** It's good practice to use the `.toBe()` method for strict equality checks when a value is _expected_ to be `true` or `false` — rather than `.toBeFalsy()` which also succeeds for e.g `undefined`.

### String assertions

For assertions on string values, in addition to equality assertions (i.e. `.toBe("string value")`), the following method can be used for pattern matching.

- {@link Assertion.toMatchRegExp}

### Object and array assertions

The following assertion methods can be used with objects.

- {@link Assertion.toBeInstanceOf}
- {@link Assertion.toBeArray}
- {@link Assertion.toHaveProperty}
- {@link Assertion.toHaveMethod}

### Function and method call assertions

The following assertion methods can be used to _call_ a function or method and check for errors.

- {@link Assertion.toThrowError}
- {@link Assertion.toThrowErrorAsync}

These methods _fail_ if the function or method doesn't throw an error. They can be combined with `.not` to check for the _absence_ of an error.

If you're not sure whether a function or method throws an error, but also don't want to fail if an error was thrown, you can use the {@link TestCase.tryRun()} and {@link TestCase.tryRunAsync()} methods.

## Conversion <!--{#conversion}-->

The following assertion methods return _another assertion_, encapsulating a value that's converted from the original asserted value to a particular type.

- {@link Assertion.asBoolean}
- {@link Assertion.asString}
- {@link Assertion.asNumber}
- {@link Assertion.asArray}
- {@link Assertion.asJSONString}

## Chaining assertions <!--{#chaining}-->

Several {@link Assertion} methods return a new assertion, which can be used for further validation by 'chaining' {@link Assertion} methods.

### Property values

You can use the result of `expect(value).toHaveProperty(name)` to validate the (value of the) property with given name.

```js
// check that obj.foo is "bar":
let obj = { foo: "bar" };
expect(obj).toHaveProperty("foo").toBe("bar");
```

Note that `expect(value).not.toHaveProperty(name)` never returns anything, since the given property doesn't exist.

Similarly, `expect(value).toHaveMethod(name)` returns an assertion for the method — this time as a _bound_ function. That means it can be used directly with `toThrowError()` and `.not.toThrowError()`.

```js
// check that num.toFixed(2) doesn't throw an error:
let num = 123;
expect(num).toHaveMethod("toFixed").not.toThrowError(2);
```

### Return values and errors

The result of `.not.toThrowError()` is an assertion for the function/method's return value, allowing us to continue stringing assertion methods even further.

```js
// ...as above, and check the return value:
let num = 123;
expect(num).toHaveMethod("toFixed").not.toThrowError(2).toBe("123.00");
```

Conversely, the result of `.toThrowError()` for functions and methods that are _supposed_ to throw an error is an assertion for the error that was caught, allowing us to check the error message, for example.

```js
function doThrow() {
	throw Error("Gotcha!");
}
expect(doThrow)
	.toThrowError()
	.toHaveProperty("message")
	.toMatchRegExp(/Gotcha/);

// or convert error to a string:
expect(doThrow)
	.toThrowError()
	.asString()
	.toMatchRegExp(/Gotcha/);
```
