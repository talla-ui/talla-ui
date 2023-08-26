---
title: Writing tests
abstract: Take a deeper dive into scopes and tests, defined by the {@link describe `describe`} and {@link test `test`} functions.
nav_parent: "test_api"
breadcrumb_uplink: "[Test library](../)"
breadcrumb_name: Getting started
applies_to:
  - describe
  - describe.skip
  - describe.only
  - describe.parallel
  - test
  - test.skip
  - test.only
  - expect
  - TestCase
  - TestScope
---

## Scopes, tests, and assertions {#scopes}

Tests should be contained in source files (JavaScript or TypeScript), separate from your application code.

Each file should define at least one _scope_, which relates to a particular feature or other architectural element of your app. Scopes are created using a call to {@link describe()}.

Within each scope, you can add more (nested) scopes, as well as individual _tests_. In the function passed to {@link describe()}, tests are created using a call to {@link test()}.

- {@ref describe}
- {@ref test}

```js
describe("My feature", () => {
	test("My first test", () => {
		// ... test goes here
	});

	// more tests or scopes here...
});
```

All errors that are thrown by your test functions will be handled. To validate the results of your program in a readable and consistent way, you can use the {@link expect()} function to create _assertions_. Assertion methods throw an error with a helpful message if they fail.

- {@ref expect}
- {@ref Assertion}

A basic assertion looks like this:

```js
describe("Basics", () => {
	test("Simple assertion", () => {
		let sum = 1 + 1;
		expect(sum).toBeGreaterThan(1);
	});
});
```

### Nested scopes

You can add a scope _within_ a scope, by calling {@link describe()} again. This gives you more control over how tests are organized, if you're writing a lot of tests for a single feature.

```js
describe("My feature", () => {
	describe("First scope", () => {
		test("My test in the first scope", () => {});
	});

	describe("Another scope", () => {
		test("My test in the second scope", () => {});
	});
});
```

### Asynchronous tests

Asynchronous test functions are handled transparently. Just pass an `async` function to {@link test()} (but **not** {@link describe}) to run the test asynchronously.

```js
describe("Asynchronous", () => {
	test("Wait for me", async () => {
		// ... do something asynchronously
	});
});
```

Normally, asynchronous test functions are run one after another. To start multiple tests _in parallel_, create an asynchronous (sub) scope using {@link describe.parallel()}.

- {@ref describe.parallel}

```js
describe.parallel("Asynchronous scope", () => {
	test("At the same time", async () => {
		// ...
	});

	test("Run in parallel", async () => {
		// ...
	});
});
```

Note that tests in the _next_ scope at the root level, or within a non-parallel scope, are only started when _all_ tests within the parallel scope have completed.

### Skipped and exclusive tests

Tests or entire scopes can be skipped temporarily when they're not relevant, by changing {@link describe()} or {@link test()} to {@link describe.skip()} or {@link test.skip()}.

- {@ref describe.skip}
- {@ref test.skip}

```js
describe.skip("Not relevant", () => {
	// ... entire scope skipped
});

describe("Relevant", () => {
	test.skip("Not relevant", () => {
		// ... single test skipped
	});
});
```

Sometimes the opposite is useful: to see if tests fail in isolation of each other — or simply to speed up test runs — you can skip all _other_ tests by changing {@link describe()} or {@link test()} to {@link describe.only()} or {@link test.only()}.

- {@ref describe.only}
- {@ref test.only}

```js
describe.only("Run in isolation", () => {
	// ... only this scope is run
});

describe("Some scope", () => {
	test("Skipped", () => {
		// ... not run, if ANY other test is marked as '.only'
	});

	test.only("Single test", () => {
		// ... only this test is run
	});
});
```

Note that multiple tests or scopes can be marked with `.only`, in which case all of those are run, but not others.

### To-do placeholders

If you want to remind yourself that you still need to write a specific test, you can add a to-do test placeholder. A test that's marked as to-do will be considered failing, while a skipped test isn't.

- {@ref test.todo()}

```js
describe("My new feature", () => {
	test.todo("Create a widget");
	test.todo("Expect an error");
	test.todo("Validate output");
});
```

## Setup and teardown functions {#setup-teardown}

The following methods can be used on a {@link TestScope} instance (passed as an argument to scope functions) to add setup and teardown functions.

- {@ref TestScope.beforeAll}
- {@ref TestScope.afterAll}
- {@ref TestScope.beforeEach}
- {@ref TestScope.afterEach}

Setup and teardown functions may be asynchronous, and are always awaited. {@link TestCase} instances are passed to {@link TestScope.beforeEach beforeEach} and {@link TestScope.afterEach afterEach} callbacks.

```js
describe("Some scope", (scope) => {
	scope.beforeAll(() => {
		// ... run once
	});
	scope.beforeEach((t) => {
		// ... run for each test t
	});

	// .. tests go here
});
```

## Counters {#counters}

For some tests, it may be useful to count the number of times a particular event happens. Rather than using a local variable for each test, you can use the {@link TestCase.count count()} method of the {@link TestCase} instance (passed as argument to test functions) to maintain named counters.

- {@ref TestCase.count}
- {@ref TestCase.expectCount}

```js
describe("Counters", () => {
	test("Count to 3", (t) => {
		t.count("foo");
		t.count("foo");
		t.count("foo");
		t.expectCount("foo").toBe(3);
	});

	test("Count up and down", (t) => {
		t.count("foo", 3);
		t.count("foo", -1);
		t.expectCount("foo").toBeLessThan(3);
		t.count("foo", 2);
		t.expectCount("foo").toBe(3 - 1 + 2);
	});
});
```

## Other TestCase methods {#other-testcase}

The {@link TestCase} class — an instance of which is passed as argument to the test function — provides several other methods that can be used in test functions:

- {@ref TestCase.log}
- {@ref TestCase.fail}
- {@ref TestCase.sleep}
- {@ref TestCase.pollAsync}
- {@ref TestCase.tryRun}
- {@ref TestCase.tryRunAsync}
- {@ref TestCase.breakOnFail}

The following {@link TestCase} methods can be used to test activities and views. Refer to [App tests](App%20tests.html) for details:

- {@ref TestCase.expectPathAsync}
- {@ref TestCase.expectOutputAsync}

## Related {#related}

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/index"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/Assertions"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/App tests"}}-->
