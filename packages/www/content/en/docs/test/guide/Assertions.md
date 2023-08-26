---
title: Assertions
abstract: Learn how to use assertions to validate your test results
nav_parent: "test_api"
breadcrumb_uplink: "[Test library](../)"
breadcrumb_name: Getting started
applies_to:
  - Assertion
  - NegatedAssertion
  - expect
---

## The expect function {#expect}

The {@link expect()} function creates an assertion for a particular value, but doesn't actually validate anything yet. Use one of the {@link Assertion} methods to throw an error when the associated assertion fails.

- {@ref expect}
- {@ref Assertion}

```js
// assert that a variable matches a specific value
expect(myResult).toBe(123);
expect(myString).toMatchRegExp(/foo/);
```

You can also _negate_ the assertion by adding `.not` in front of the assertion method. This turns the {@link Assertion} object into a {@link NegatedAssertion} object. For example:

```js
// These are the same:
expect(2).toBeGreaterThan(1);
expect(2).not.toBeLessThanOrEqualTo(1);
```

### Asserting equality {#equality}

The following assertion methods can be used to validate that a value is (strictly) equal to a given value.

- {@ref Assertion.toBe}
- {@ref Assertion.toBeUndefined}
- {@ref Assertion.toBeNull}
- {@ref Assertion.toBeOneOf}
- {@ref Assertion.toEqual}
- {@ref Assertion.toEqualOneOf}

The following method can be used to assert the _type_ of a value (i.e. the result of **typeof** value).

- {@ref Assertion.toBeTypeOf}

### Numeric assertions {#numeric}

In addition to equality assertions, the following assertion methods can be used to validate numeric values.

- {@ref Assertion.toBeLessThan}
- {@ref Assertion.toBeLessThanOrEqualTo}
- {@ref Assertion.toBeGreaterThan}
- {@ref Assertion.toBeGreaterThanOrEqualTo}
- {@ref Assertion.toBeNaN}

### Boolean assertions {#boolean}

The following assertion methods can be used to loosely check for 'truthy' and 'falsy' values. The asserted value is converted to a boolean value first, and then checked against `true` or `false`.

- {@ref Assertion.toBeTruthy}
- {@ref Assertion.toBeFalsy}

### String assertions {#string}

In addition to equality assertions, the following assertion method can be used to validate string values.

- {@ref Assertion.toMatchRegExp}

### Object and array assertions {#object-array}

The following assertion methods can be used with objects.

- {@ref Assertion.toBeInstanceOf}
- {@ref Assertion.toBeArray}
- {@ref Assertion.toHaveProperty}
- {@ref Assertion.toHaveMethod}

### Function and method call assertions {#function-call}

The following assertion methods can be used to _call_ a function or method and check for errors.

- {@ref Assertion.toThrowError}
- {@ref Assertion.toThrowErrorAsync}

### Conversion {#conversion}

The following assertion methods return another assertion, encapsulating a value that's converted to a particular type.

- {@ref Assertion.asBoolean}
- {@ref Assertion.asString}
- {@ref Assertion.asNumber}
- {@ref Assertion.asArray}
- {@ref Assertion.asJSONString}

## Chaining {#chaining}

Several {@link Assertion} methods return a new assertion, which can be used for further validation by 'chaining' {@link Assertion} methods.

### Property values

You can use the result of `expect(value).toHaveProperty(name)` to validate the (value of the) property with given name.

```js
let obj = { foo: "bar" };
expect(obj).toHaveProperty("foo").toBe("bar");
```

Note that `expect(value).not.toHaveProperty(name)` never returns anything, since the given property doesn't exist.

Similarly, `expect(value).toHaveMethod(name)` returns an assertion for the method — this time as a _bound_ function. That means it can be used directly with `toThrowError()` and `.not.toThrowError()`.

```js
let num = 123;
expect(num).toHaveMethod("toFixed").not.toThrowError(2);
```

### Return values and errors

The result of `.not.toThrowError()` is an assertion for the function/method's return value, allowing us to continue stringing assertion methods even further.

```js
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
```

## Output assertions {#output}

The Desk framework test package can be used to test activities and views, by asserting that the rendered output contains a particular combination of elements (and interacting with them).

Rather than using the {@link expect} method, output assertions are based on the {@link TestRenderer.expectOutput()} method. For more details, refer to [Desk app tests](App%20tests.html).

## Related {#related}

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/index"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/Writing tests"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/App tests"}}-->
