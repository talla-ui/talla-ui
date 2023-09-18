---
title: Using the Desk test library
abstract: Learn how to write and run tests using the `test` package.
sort: -10
nav_parent: "test_api"
breadcrumb_uplink: "[Test library](../)"
breadcrumb_name: Getting started
applies_to:
  - runTestsAsync
  - getTestResults
  - describe
  - test
  - TestCase
  - TestScope
---

## Overview {#overview}

The Desk framework test library allows you to write tests for your Desk application.

- Unit tests can be used to test specific classes and methods of your application. Each test consists of a function that calls into a single point within your application, and matches output with expected results.
- Integration tests can be used to test functionality across a set of classes or modules. The Desk framework test library can be used to validate UI output, triggering interactions such as button clicks, as well as register test-specific services.

## Installation {#installation}

To use the Desk framework test library, include `@desk-framework/frame-test` in your application package's dev-dependencies. Include a reference in your `package.json` file, or run the following command from within your application package folder:

<!--{{html-attr class=terminal}}-->

```sh
npm install @desk-framework/dev --save-dev
```

## Writing tests {#writing-tests}

Like many other test runners, the Desk framework test library allows you to define tests using a set of simple functions, combined with 'assertions' to check that values match specific expectations.

Tests themselves are written as functions, either synchronous or asynchronous (returning a `Promise`), which are run one after another — or in parallel.

The following example defines a _test scope_ that includes two tests, one of which is skipped temporarily.

```js
describe("My test scope", () => {
	test("This should work", () => {
		let myValue = 1;
		expect(myValue).toBe(1);
		myValue++;
		expect(myValue).toBeGreaterThan(1);
	});

	test.skip("This fails but is skipped", async () => {
		await expect(async () => {
			await Promise.resolve();
			throw Error("Hello from the test");
		}).not.toThrowErrorAsync();
	});
});
```

For more information about writing tests, refer to the following guide.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/Writing tests"}}-->

## Running tests {#running-tests}

The test library doesn't include a command-line test runner (yet). Therefore, tests must be imported and run manually using a test entrypoint module.

The entrypoint must contain a single call to {@link runTestsAsync()}, which returns a promise for the test results. The results can also be obtained using {@link getTestResults()}.

- {@ref runTestsAsync}
- {@ref getTestResults()}
- {@ref TestResultsData}

### Example

```js
// test/index.js
// Test entrypoint using Desk framework test library

import { runTestsAsync } from "@desk-framework/test";

// import tests to run `describe` functions
import "./tests/some-test.js";

let details = await runTestsAsync();
console.log(`Tests completed in ${details.time}ms`);

// show errors and skipped tests
for (let r of details.results) {
	if (r.state === "skip") console.log("-- Skipped: " + r.name);
	if (r.state === "todo") console.log("[ ] TODO: " + r.name);
	if (r.state === "fail") {
		console.log("\n<FAIL> " + r.name);
		if (r.logs) console.log(r.logs);
		if (r.error) console.log(r.error);
	}
}

// show summary
let { fail, todo, skip } = details.totals;
if (details.failed) {
	console.log(`\n=> FAIL, ${fail} errors, ${todo} todo`);
	process.exit(1);
} else {
	console.log(`\n=> PASS, ${skip} skipped`);
}
```

## Up next {#related}

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/Writing tests"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/Assertions"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/App tests"}}-->
