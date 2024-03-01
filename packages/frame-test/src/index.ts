import { Assertion, NegatedAssertion } from "./Assertion.js";
import { TestCase } from "./TestCase.js";
import { TestScope } from "./TestScope.js";
import { TestResult, TestResultsData } from "./TestResult.js";

export {
	Assertion,
	NegatedAssertion,
	TestCase,
	TestScope,
	TestResult,
	TestResultsData,
};
export * from "./app/TestNavigationController.js";
export * from "./app/OutputAssertion.js";
export * from "./app/TestOutputElement.js";
export * from "./renderer/TestRenderer.js";
export * from "./app/TestContext.js";

/**
 * Creates a new {@link Assertion} object, ready to evaluate the given value
 * @param value The value to be evaluated
 * @param name An optional name for the assertion, used in error messages
 * @see {@link Assertion}
 */
export function expect<T>(value: T, name?: string) {
	return new Assertion(value, name);
}

/**
 * Adds a test case in the current scope
 * - This function must be used within a function passed to {@link describe()}.
 * - Test functions may be `async`, all promises are awaited automatically.
 * @param name The name of the test
 * @param f The function that defines the test; if this function throws an error, the test fails automatically
 * @example
 * // define a simple test:
 * describe("Math", () => {
 *   test("One plus one", () => {
 *     expect(1 + 1).toBe(2);
 *   });
 * });
 */
export function test(
	name: string,
	f: (test: TestCase) => void | Promise<void>,
) {
	TestScope.getScope().addTest(name, f);
}
export namespace test {
	/**
	 * Adds a test case that will be skipped
	 * - The test function won't be called at all.
	 * - Skipped tests aren't considered failures in the overall test results.
	 * @example
	 * // define a test that doesn't run:
	 * describe("Something", () => {
	 *   test.skip("Not run", () => {
	 *     // ... this will not be run
	 *   })
	 * });
	 */
	export function skip(
		name: string,
		f: (test: TestCase) => void | Promise<void>,
	) {
		TestScope.getScope().addTest(name, f, false, { state: "skip" });
	}

	/**
	 * Adds a test case that will be marked as 'to do'
	 * - The test function won't be called at all.
	 * - Tests marked as 'to do' are considered failures, even without an error.
	 * @example
	 * // define a test case that's marked as to do:
	 * describe("Something", () => {
	 *   test.todo("Test my new feature")
	 *   test.todo("Complete me", () => {
	 *     let result = undefined; // to do
	 *     expect(result).toBe(1);
	 *   })
	 * });
	 */
	export function todo(
		name: string,
		f?: (test: TestCase) => void | Promise<void>,
	) {
		if (!f) f = () => {};
		TestScope.getScope().addTest(name, f, false, { state: "todo" });
	}

	/**
	 * Adds a test case that will be run exclusively
	 * - Multiple exclusive tests can be added at the same time. Only those test will run, and none of the others.
	 * @example
	 * // run only one test
	 * describe("Something", () => {
	 *   test.only("This will run", () => {
	 *     // ... this will run
	 *   })
	 *   test("Another test", () => {
	 *     // ... this will not run
	 *   })
	 * });
	 */
	export function only(
		name: string,
		f: (test: TestCase) => void | Promise<void>,
	) {
		TestScope.getScope().addTest(name, f, true);
	}
}

/**
 * Creates a new test scope
 * @param name The name of the test scope
 * @param f A function that's run immediately, which should add tests using the {@link test()} function. The new {@link TestScope} instance is passed as the only argument.
 * @example
 * // define a simple test:
 * describe("Math", (scope) => {
 *   test("One plus one", () => {
 *     expect(1 + 1).toBe(2);
 *   });
 * });
 */
export function describe(name: string, f: (scope: TestScope) => void) {
	TestScope.getScope().addScope(name, f);
}
export namespace describe {
	/**
	 * Creates a new test scope, with tests that will be started in parallel
	 * @param name The name of the test scope
	 * @param f A function that's run immediately, which should add tests using the {@link test()} function. The new {@link TestScope} instance is passed as the only argument.
	 * @example
	 * // these tests run in parallel:
	 * describe.parallel("Foo", () => {
	 *   test(async () => {
	 *     // ... await something here
	 *   });
	 *   test(async () => {
	 *     // ... this runs at the same time
	 *   });
	 * });
	 */
	export function parallel(name: string, f: (scope: TestScope) => void) {
		TestScope.getScope().addScope(name, f, true);
	}

	/**
	 * Creates a new test scope that's skipped (including all tests)
	 * - The function argument won't be called at all.
	 * - Skipped tests aren't considered failures in the overall test results.
	 * @param name The name of the test scope
	 * @example
	 * // this scope is skipped entirely:
	 * describe("Not run", () => {
	 *   test("Also not run", () => {
	 *     // ...
	 *   });
	 * });
	 */
	export function skip(name: string, f: (scope: TestScope) => void) {
		TestScope.getScope().addScope(name, () => {
			test.skip("*", () => {});
		});
	}

	/**
	 * Creates a new test scope that's run exclusively
	 * - Multiple exclusive test scopes can be added at the same time. Only the tests in those scopes will run, and none of the others.
	 * - The function argument is still invoked for other `describe(...)` calls, even if tests won't be run.
	 * @param name The name of the test scope
	 * @param f A function that's run immediately, which should add tests using the {@link test()} function. The new {@link TestScope} instance is passed as the only argument.
	 * @example
	 * // only tests in the first scope are run
	 * describe.only("Run these only", () => {
	 *   test("Foo", () => {});
	 *   // ...
	 * })
	 * describe("Not run", () => {
	 *   test("Bar", () => {});
	 *   // ...
	 * })
	 */
	export function only(name: string, f: (scope: TestScope) => void) {
		TestScope.getScope().addScope(name, f, false, true);
	}
}

/**
 * Runs all tests
 * - Tests must be added first using the {@link describe()} and {@link test()} functions. After all calls to {@link describe()}, this function runs all tests that have been defined, and awaits all results.
 */
export function runTestsAsync(): Promise<TestResultsData> {
	return TestScope.getScope().runTestsAsync();
}

/**
 * Returns the current test results, as a {@link TestResultsData} object (JSON)
 * - This function can be called even while tests are running, to collect data periodically.
 */
export function getTestResults(): TestResultsData {
	return TestScope.getScope().getResults();
}

/**
 * Returns a string-formatted version of the provided test results object, in English
 * - The test results object can be obtained using {@link getTestResults()}.
 * - Formatted results only include skipped, todo, and failed tests. It's advisable to log the full JSON data to a file as well.
 */
export function formatTestResults(results: TestResultsData): string {
	let text = "";
	text += `Tests completed in ${results.time}ms\n`;
	for (let r of results.results) {
		if (r.state === "skip") text += `- Skipped: ${r.name}\n`;
		if (r.state === "todo") text += `- To do: ${r.name}\n`;
	}
	for (let r of results.results) {
		if (r.state === "fail") {
			text += `\nERROR: ${r.name}\n`;
			if (r.logs) text += r.logs + "\n";
			if (r.error) text += r.error + "\n";
			if (r.stack)
				text +=
					String(r.stack)
						.split(/[\r\n]+/)
						.filter((line) => /\.js:\d+/.test(line))
						.filter((line) => !/\/dist\//.test(line))
						.slice(0, 3)
						.join("\n") + "\n";
		}
	}
	text += results.failed ? "\n❌ FAIL" : "✅ PASS";
	if (results.totals.fail) text += ", " + results.totals.fail + " failed";
	if (results.totals.todo) text += ", " + results.totals.todo + " to do";
	if (results.totals.skip) text += ", " + results.totals.skip + " skipped";
	text += ", " + results.totals.pass + " passed.";

	return text;
}
