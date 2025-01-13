import { AppContext } from "@talla-ui/core";
import { testLogsToString } from "./log.js";
import { TestCase } from "./TestCase.js";
import { TestResult, TestResultsData } from "./TestResult.js";

/** Set to true if any test was added in exclusive mode */
let _exclusiveMode: "test" | "scope" | undefined;

/** List of tests that have been created in exclusive mode (see `addTest()`) */
const _exclusiveTests: TestCase[] = [];

/** List of scopes that include tests that have been created in exclusive mode (see `addTest()`), including parent scopes */
const _exclusiveScopes: TestScope[] = [];

/** Ensures that the global unhandled error handler is set, failing all running tests */
function handleUnhandledErrors() {
	if (_handled) return;
	_handled = true;
	AppContext.setErrorHandler((error) => {
		if (runningTests.length) {
			for (let t of runningTests) t.fail(error);
		} else {
			console.error(error);
		}
	});
}
let _handled: true | undefined;

/** List of all currently running tests (only one if not running in parallel) */
let runningTests: TestCase[] = [];

/**
 * A class that represents a test scope, containing a number of test cases
 *
 * @description Test scopes are created using calls to {@link describe()}. The TestScope instance is passed to the definition function immediately, so it can use its own TestScope methods — for example to set callbacks that run before/after every test in the scope.
 *
 * @example
 * describe("My test scope", (scope) => {
 *   scope.beforeEach(() => {
 *     // ... this runs before each test
 *   });
 *
 *   test("My test case", () => {});
 * });
 *
 * @docgen {hideconstructor}
 */
export class TestScope {
	/** Stack of all scopes currently being defined */
	private static _scope: TestScope[] = [new TestScope(undefined, "")];

	/** Returns the current scope, if a {@link describe()} function is currently running */
	static getScope() {
		return this._scope[0]!;
	}

	/** Returns a list of all currently running (sync and async) tests */
	static getRunningTests() {
		return runningTests.slice();
	}

	/** Creates a new test scope; do not use directly */
	private constructor(
		scope: TestScope | undefined,
		name: string,
		f?: (scope: TestScope) => void,
		private readonly _parallel?: boolean,
		private readonly _exclusive?: boolean,
	) {
		this.scope = scope;
		this.name = name;

		// run the definition function to collect tests
		if (f) {
			TestScope._scope.unshift(this);
			try {
				f(this);
			} finally {
				TestScope._scope.shift();
			}
		}

		// set exclusive mode if requested
		if (_exclusive) {
			if (!_exclusiveMode) _exclusiveMode = "scope";
			let scope: TestScope | undefined = this;
			while (scope) {
				_exclusiveScopes.push(scope);
				scope = scope.scope;
			}
		}
	}

	/** The containing scope, if any */
	readonly scope?: TestScope;

	/** Name of this scope */
	readonly name: string;

	/**
	 * Returns the (current) results of all tests in this scope, and all nested scopes
	 * - Use the {@link getTestResults()} function to get the results of all test scopes
	 */
	getResults(): TestResultsData {
		let time = (this._stopT || Date.now()) - (this._startT || 0);
		let results = this._res.reduce(
			(all: TestResult[], r) => all.concat(r()),
			[],
		);
		let totals: any = {
			wait: 0,
			run: 0,
			fail: 0,
			todo: 0,
			skip: 0,
			pass: 0,
		};
		let failed = false;
		for (let r of results) {
			let state = r.state;
			if (state === "fail" || state === "todo") failed = true;
			if (state === "wait" && this._stopT) state = "skip";
			totals[state]++;
		}
		return { time, failed, results, totals };
	}

	/**
	 * Sets a timeout for all tests in this scope, and nested scopes
	 * - This method must be called **within** the function that's passed to {@link describe()}.
	 * - When a timeout has been set, tests within this scope fail automatically when the timeout has been reached; however, test functions may keep running unless currently awaiting any of the asynchronous methods of {@link TestCase}.
	 * @param timeoutMs Amount of time after which a test will be timed out, in milliseconds
	 *
	 * @example
	 * describe("My scope", (scope) => {
	 *   scope.setTimeout(1000);
	 *
	 *   test("This times out automatically", async () => {
	 *     // ... do something that may time out
	 *   })
	 * });
	 */
	setTimeout(timeoutMs: number) {
		if (TestScope.getScope() !== this)
			throw Error("Invalid call to setTimeout");
		this._timeout = timeoutMs;
	}

	/**
	 * Adds a callback that's called before **each** test in this scope, and nested scopes
	 * @param f The function to be called before each test. The {@link TestCase} instance for each test is passed as the only argument.
	 */
	beforeEach(f: (test: TestCase) => void | Promise<void>) {
		if (this._fnBeforeEach) throw Error("Callback is already set");
		this._fnBeforeEach = async (test) => {
			let prev = this.scope && this.scope._fnBeforeEach;
			if (prev) await prev(test);
			return f(test);
		};
	}

	/**
	 * Adds a callback that's called after **each** test in this scope, and nested scopes
	 * @param f The function to be called after each test. The {@link TestCase} instance for each test is passed as the only argument.
	 */
	afterEach(f: (test: TestCase) => void | Promise<void>) {
		if (this._fnAfterEach) throw Error("Callback is already set");
		this._fnAfterEach = async (test) => {
			await f(test);
			let prev = this.scope && this.scope._fnAfterEach;
			if (prev) await prev(test);
		};
	}

	/**
	 * Sets a callback that's called before the first test in this scope
	 * @param f The function to be called. The {@link TestScope} instance is passed as the only argument.
	 */
	beforeAll(f: (scope: TestScope) => void | Promise<void>) {
		if (this._fnBeforeAll) throw Error("Callback is already set");
		this._fnBeforeAll = f;
	}

	/**
	 * Sets a callback that's called after the last test in this scope
	 * @param f The function to be called. The {@link TestScope} instance is passed as the only argument.
	 */
	afterAll(f: (scope: TestScope) => void | Promise<void>) {
		if (this._fnAfterAll) throw Error("Callback is already set");
		this._fnAfterAll = f;
	}

	/**
	 * Adds a test to this scope (used by {@link test()})
	 * - Use the {@link test()} function within a {@link describe()} callback instead of calling this method directly.
	 * @see {@link test()}
	 * @see {@link describe()}
	 */
	addTest(
		name: string,
		f: (test: TestCase) => void | Promise<void>,
		exclusive?: boolean,
		initResult?: Partial<TestResult>,
	) {
		let test = new TestCase(this, name, f);
		if (exclusive) {
			// set exclusive mode and add test and scope to array
			_exclusiveMode = "test";
			_exclusiveTests.push(test);
			let scope: TestScope | undefined = this;
			while (scope) {
				_exclusiveScopes.push(scope);
				scope = scope.scope;
			}
		}

		// add callback to get test state
		let result: TestResult = {
			state: "wait",
			name: this.name + " :: " + test.name,
			time: 0,
			...initResult,
		};
		this._res.push(() => [result]);

		// add test runner to list of async runners for this scope
		this._runners.push(async (timeout?: number) => {
			if (
				result.state !== "wait" ||
				(_exclusiveMode === "test" && !_exclusiveTests.includes(test))
			)
				return;

			runningTests.push(test);
			result.state = "run";
			try {
				await this._runBeforeEach(test);

				// run actual test function:
				try {
					await test.runTestAsync(timeout);
				} catch (err) {
					test.fail(err);
				}

				await this._runAfterEach(test);
			} catch (err) {
				test.fail(err);
			}

			// remove test from list of running tests (for unhandled errors)
			for (let i = runningTests.length - 1; i >= 0; i--)
				if (runningTests[i] === test) runningTests.splice(i, 1);

			// update test result
			result.logs = testLogsToString(test) || undefined;
			result.time = test.getTime();
			let error = test.getError();
			if (!error) {
				result.state = "pass";
			} else {
				result.state = "fail";
				if (typeof error === "string") {
					result.error = error;
				} else if (error instanceof Error) {
					result.error = error.message;
					result.stack = error.stack;
				}
			}
		});
	}

	/**
	 * Adds a nested scope to this scope (used by {@link describe()})
	 * - Use the {@link describe()} function within another scope callback instead of calling this method directly.
	 * @see {@link describe()}
	 */
	addScope(
		name: string,
		f: (scope: TestScope) => void,
		parallel?: boolean,
		exclusive?: boolean,
	) {
		let scope = new TestScope(
			this,
			this.name ? this.name + " :: " + name : name,
			f,
			parallel,
			exclusive || this._exclusive,
		);
		this._runners.push(async (timeout?: number) => {
			await scope.runTestsAsync(timeout);
		});
		this._res.push(() => scope.getResults().results);
	}

	/** Runs all tests in this scope asynchronously (used by {@link runTestsAsync()}) */
	async runTestsAsync(timeout?: number): Promise<TestResultsData> {
		// wait for (more) tests to be registered if needed
		await Promise.resolve();

		// quit immediately if don't need to run
		if (_exclusiveMode && !_exclusiveScopes.includes(this)) {
			this._stopT = Date.now();
			return this.getResults();
		}
		handleUnhandledErrors();

		// mark start and run beforeAll
		this._startT = Date.now();
		let beforeAll = this._fnBeforeAll;
		if (beforeAll) await beforeAll(this);

		// run all tests
		if (this._timeout) timeout = this._timeout;
		if (this._parallel) {
			await Promise.all(this._runners.map((r) => r(timeout)));
		} else {
			for (let r of this._runners) await r(timeout);
		}

		// run afterAll and mark stop
		let afterAll = this._fnAfterAll;
		if (afterAll) await afterAll(this);
		this._stopT = Date.now();
		return this.getResults();
	}

	/** Run the current beforeEach function and that of the containing scope(s) */
	private async _runBeforeEach(test: TestCase) {
		await this.scope?._runBeforeEach?.(test);
		await this._fnBeforeEach?.call(undefined, test);
	}

	/** Run the current afterEach function and that of the containing scope(s) */
	private async _runAfterEach(test: TestCase) {
		await this.scope?._runAfterEach?.(test);
		await this._fnAfterEach?.call(undefined, test);
	}

	private _timeout?: number;
	private _runners: Array<(timeout?: number) => void | Promise<void>> = [];
	private _res: Array<() => readonly TestResult[]> = [];
	private _startT?: number;
	private _stopT?: number;
	private _fnBeforeEach?: (test: TestCase) => void | Promise<void>;
	private _fnAfterEach?: (test: TestCase) => void | Promise<void>;
	private _fnBeforeAll?: (scope: TestScope) => void | Promise<void>;
	private _fnAfterAll?: (scope: TestScope) => void | Promise<void>;
}
