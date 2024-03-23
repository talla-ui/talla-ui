---
title: Tests
folder: topics
abstract: Learn how to write and run tests using the Desk test library.
---

# Tests

> {@include abstract}

## Overview {#overview}

The Desk framework provides a complete test library, that facilitates running tests using your actual application code from the command line.

This library consists the following elements:

- Functions for describing test scopes and cases
- Functions for asserting values and objects during and after each test case
- Functions for running all tests and collating results
- The _test context_ — a runtime environment that includes simulations for framework functions such as UI rendering and user navigation, allowing for the application to run normally after which a test case can 'query' the resulting state (including UI)

Using the Desk test library, you can include tests alongside your source code, which can then be run using a separate entry point directly from the command line. Refer to the sections below to learn how to add tests to your application.

## Importing the test package {#import}

From all of your test-related files, you'll need to import functions for describing tests and performing assertions from the `@desk-framework/frame-test` package.

You'll need to install this package separately, e.g. from NPM. The use of this package is similar to how the web application entry point needs to be imported from `@desk-framework/frame-web`. For more information, refer to the platform-specific {@link tutorials} documentation.

```ts
// top of a test-related file:
import { assert, describe, test } from "@desk-framework/frame-test";

describe("My first test scope", () => {
	// ...
});
```

## Describing test scopes {#describe}

A test **scope** is simply a group of test cases that are either run one after another or in parallel (async). Before you can run any test cases, they need to be _described_ as part of a scope, using a callback that's passed to the {@link describe()} function.

- {@link describe +}

The specified callback is run immediately, provided with a single parameter that represents the scope itself. This object is of type {@link TestScope} and can be used for some advanced functionality (see below).

- {@link TestScope +}

Each test file (usually with a `.test.js` or `.test.ts` extension) typically describes at least one test scope, making it easier to trace errors back to the source file.

**Describing tests** — Within the scope callback, you can use the {@link test()} function to add tests to the enclosing test scope. Before we go into detail, let's look at a simple example: the following code creates a test scope with multiple tests.

```ts
describe("Example test scope", (scope) => {
	test("First test", () => {
		// test code goes here...
	});

	test("Second test", () => {
		// another test goes here...
	});
});
```

The code within each test callback is _not_ run immediately — tests are only described and added to the scope, until they're started (see [Running tests](#run) below). In the example above, the first test is completed first, followed by the second one.

**Asynchronous tests and nested scopes** — While the callback passed to {@link describe()} must run synchronously, each test can be asynchronous. Normally, the scope waits for each test to be completed (using `await`) before running the next one. However, using {@link describe.parallel()} you can create a scope that runs all test in one go, and then waits for all of them to be completed before finishing the scope.

To combine multiple scopes, whether parallel or not, you can call {@link describe()} or {@link describe.parallel()} from _within_ each callback to create a nested scope.

```ts
describe("Example test scope", (scope) => {
	test("First test", async () => {
		// test code goes here...
	});

	describe.parallel("Nested scope", (nestedScope) => {
		test("Second test", async () => {
			// this test is run after first, parallel with third
		});

		test("Third test", async () => {
			// ...
		});
	});
});
```

Note that tests within multiple scopes are run in the order they're described, but always _after all tests_ in the parent scope.

> **Note:** Parallel tests are still run within the same process, so any change to global state (e.g. a global variable, or UI rendering) can affect other tests. Use parallel tests only for asynchronous unit tests that have no side effects, or are otherwise completely isolated from each other.

**Skipped and exclusive scopes** — You can skip all tests in a scope temporarily, without removing the actual test code, using the {@link describe.skip()} function. Conversely, you can run _only_ the tests in a scope, using {@link describe.only()}.

```ts
describe.skip("Example test scope", (scope) => {
	// ... all tests and nested scopes here are skipped temporarily
});

// or:
describe.only("Example test scope", (scope) => {
	// ... ONLY these tests are run, ignoring all other scopes temporarily
});
```

**Specifying a test timeout** — By default, tests are expected to complete within a certain time limit, and are considered failed if they don't. You can change this limit using the {@link TestScope.setTimeout()} function.

- {@link TestScope.setTimeout}

```ts
describe("Example test scope", (scope) => {
	scope.setTimeout(5000); // 5 seconds

	test("Some test", async () => {
		// ... this test fails if it takes longer than 5 seconds
	});
});
```

**Running code before and after tests** — You can run code before and after each test, or before and after the entire scope, using the {@link TestScope.beforeEach()}, {@link TestScope.afterEach()}, {@link TestScope.beforeAll()}, and {@link TestScope.afterAll()} methods.

- {@link TestScope.beforeEach}
- {@link TestScope.afterEach}
- {@link TestScope.beforeAll}
- {@link TestScope.afterAll}

```ts
describe("Example test scope", (scope) => {
	scope.beforeEach(async (test) => {
		// ... this code runs before each test
	});

	// ...
});
```

> **Note:** The `beforeAll` and `afterAll` callbacks are considered part of each test case. Any errors thrown from these callbacks are caught and reported as part of the test results. This makes these callbacks useful for validating the global state repeatedly before and after each test.

## Adding test cases {#test}

Within a test scope, you can add individual test cases using the {@link test()} function.

When a test case is run, all errors are caught and reported as part of the test results. The test case is considered successful if no errors are thrown, and failed otherwise. Within a test case, you typically use {@link assertions} to validate the expected behavior of your application code, and throw a descriptive error if the test fails.

- {@link test +}

The specified callback is invoked with a single parameter that represents the test case itself. This object is of type {@link TestCase} and can be used for some advanced functionality (see below). Test callbacks can be asynchronous; any promises returned from the callback are awaited before the test is considered completed.

- {@link TestCase +}

**Skipped and exclusive tests** — You can skip a test temporarily, without removing the actual test code, using the {@link test.skip()} function. Conversely, you can run _only_ the test, using {@link test.only()}.

> **Tip:** When a test fails, it's good practice to run the test in isolation to ensure that the failure is not caused by other tests in the same scope. You can use `test.only` to do this temporarily.

```ts
describe("Example test scope", (scope) => {
	test.skip("Some test", async (test) => {
		// ... this test is skipped temporarily
	});

	// or:
	test.only("Some test", async (test) => {
		// ... ONLY this test is run, ignoring all others temporarily
		// (even those in other scopes)
	});
});
```

**Marking a test as to-do** — You can mark a test as to-do, using the {@link test.todo()} function. This is useful when you want to describe a test case that you haven't implemented yet, but don't want to forget about it. The test case isn't run, but is reported as a to-do item in the test results.

```ts
describe("Example test scope", (scope) => {
	test.todo("Some test", async (test) => {
		// ... this code is not run, test is reported as to-do
	});

	// you can also leave out the callback:
	test.todo("Test error conditions");
	test.todo("Validate output");
});
```

**Using counters** — You can use the {@link TestCase.count()} method during a test to count the number of times a certain condition is met. The counter with a specific name is incremented each time the method is called. At any time, you can validate the counter's value using the {@link TestCase.expectCount()} method, with returns an {@link assertions assertion}.

- {@link TestCase.count}
- {@link TestCase.expectCount}

```ts
describe("Example test scope", (scope) => {
	test("Some test", async (test) => {
		for (let i = 0; i < 5; i++) {
			test.count("loop");
		}

		// ... later in the test
		test.expectCount("loop").toBe(5);
	});
});
```

**Other test case methods** — You can use the following methods for more advanced functionality:

- {@link TestCase.log}
- {@link TestCase.fail}
- {@link TestCase.sleep}
- {@link TestCase.pollAsync}
- {@link TestCase.tryRun}
- {@link TestCase.tryRunAsync}
- {@link TestCase.breakOnFail}

In addition, the test case object provides several methods for validating rendered content and navigation state, using the _test context_. For more information, refer to the following article:

- {@link test-context}

## Running tests {#run}

To run all tests in your application, you'll need to create a file that serves as an entry point. From this file, import all files that describe your tests, and then call the {@link runTestsAsync()} function.

- {@link runTestsAsync +}

```ts
// run-test.ts
import "./some/test.js";
import "./another/test.js";

import { runTestsAsync, formatTestResults } from "@desk-framework/frame-test";
let results = await runTestsAsync();
console.log(formatTestResults(results));
if (results.failed) process.exit(1);
```

The {@link runTestsAsync()} function returns a promise that resolves to a {@link TestResultsData} object, which contains the results of all tests that were run.

After running all tests, you can output the results to a file (e.g. a JSON file). Additionally, you can use the {@link formatTestResults()} function to format the results as a string, which can be printed to the console or used in other ways.

- {@link TestResultsData +}
- {@link formatTestResults +}

At any point in time, you can also retrieve partial test results synchronously using the {@link getTestResults()} function. Before completion, the results may include tests that are still running, as indicated by the {@link TestResult TestResult.state} property.

- {@link getTestResults +}
- {@link TestResult +}
- {@link TestState +}

## Further reading {#further-reading}

Learn more about assertions in the following article:

- {@link assertions}

Learn how to go beyond basic tests with simulated rendering and navigation, and query the resulting state, in the following article:

- {@link test-context}
