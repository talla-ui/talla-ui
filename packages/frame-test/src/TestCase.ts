import { app } from "@desk-framework/frame-core";
import { Assertion } from "./Assertion.js";
import { TestScope } from "./TestScope.js";
import { OutputAssertion, OutputSelectFilter } from "./app/OutputAssertion.js";
import {
	RenderedTestMessageDialog,
	TestRenderer,
} from "./renderer/TestRenderer.js";
import { val2str } from "./log.js";

const DEFAULT_TIMEOUT = 10000;
const DUMP_DEPTH = 100;

/** If set, all tests should be skipped from this point on */
let stopAll = false;

/**
 * A class that represents a single test case, part of a {@link TestScope}
 *
 * @description Test cases are created using calls to {@link test()}. The TestCase instance is passed to the function argument when the test itself is run, so it can use its own TestCase methods — for example to capture log output, keep track of counts, or fail early.
 *
 * @example
 * describe("My test scope", () => {
 *   test("My test case", (t) => {
 *     // => t is a TestCase instance
 *     t.log("Logging some values", 123);
 *     t.fail(new Error("Whoops!"));
 *   });
 * });
 */
export class TestCase {
	/**
	 * Creates a new test case; do not use directly.
	 * @hideconstructor
	 */
	constructor(
		scope: TestScope,
		name: string,
		private readonly _function: (test: TestCase) => void | Promise<void>,
	) {
		this.scope = scope;
		this.name = name;
	}

	/** The name of this test case */
	readonly name: string;

	/** The scope that contains this test case */
	readonly scope: TestScope;

	/**
	 * Sets a flag to stop all other tests once this test case fails
	 * - This method should be called at the start of a test function, if the success of this test is critical to other tests or if there's no point to run any further tests if this test case fails.
	 * @example
	 * describe("Two tests", () => {
	 *   test("Critical test", (t) => {
	 *     t.breakOnFail();
	 *     // ... do something critical here
	 *   });
	 *   test("Another test", () => {
	 *     // ... this won't run if the above failed
	 *   });
	 * });
	 */
	breakOnFail() {
		this._breakOnFail = true;
	}

	/**
	 * Returns the elapsed time, or the total time if the test has already completed
	 */
	getTime() {
		return this._startT && this._stopT ? this._stopT - this._startT : 0;
	}

	/**
	 * Returns all log output as an array
	 * @see {@link TestCase.log()}
	 */
	getLogs(): Array<ReadonlyArray<any>> {
		return this._logs.slice();
	}

	/**
	 * Returns the error that occurred during the test run, if any.
	 * The error may have been thrown directly from the test function, or set using {@link TestCase.fail()}. The error may also have been the result of a timeout condition.
	 * @see {@link TestCase.fail()}
	 */
	getError() {
		return this._error;
	}

	/**
	 * Store the provided values as log output for this test case.
	 * - Logged values are converted to strings immediately
	 * - Logs are usually shown only if a test case fails
	 * @param values A list of values, of any type
	 * @see {@link TestCase.getLogs()}
	 */
	log(...values: any[]) {
		this._logs.push(
			values.map((v, i) => (!i && typeof v === "string" ? v : val2str(v))),
		);
	}

	/**
	 * Store the provided value as log output with greater detail
	 * - The logged value is converted to a string immediately, recursing deeper into nested structures than with {@link TestCase.log()}
	 * @param values A list of values, of any type
	 * @see {@link TestCase.getLogs()}
	 */
	dump(value: any) {
		this._logs.push([val2str(value, -DUMP_DEPTH)]);
	}

	/**
	 * Returns the current value of a named counter
	 * @param name The name of the counter
	 * @returns The current counter value (a number), or zero if the counter has never been used.
	 * @see {@link TestCase.count()}
	 * @see {@link TestCase.expectCount()}
	 */
	getCount(name: string) {
		return this._counts[name] || 0;
	}

	/**
	 * Returns a new Assertion for the current value of a named counter
	 * @param name The name of the counter
	 * @returns A new instance of {@link Assertion}
	 * @see {@link TestCase.count()}
	 * @see {@link TestCase.getCount()}
	 */
	expectCount(name: string) {
		return new Assertion(this._counts[name] || 0, "counter " + name);
	}

	/**
	 * Increment a named counter
	 * @param name The name of the counter to increment
	 * @param inc The amount with which to increment, defaults to 1
	 * @see {@link TestCase.getCount()}
	 * @see {@link TestCase.expectCount()}
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("My test", (t) => {
	 *     t.count("foo"); // +1
	 *     t.count("foo", 2); // +2
	 *     t.expectCount("foo").toBe(3); // OK
	 *   });
	 * });
	 */
	count(name: string, inc = 1) {
		if (!this._counts[name]) this._counts[name] = 0;
		this._counts[name]! += inc;
	}

	/**
	 * Fails this test case immediately with the provided error
	 * - This method does **not** throw an error, so control flow continues after calling `.fail(...)`. This may be useful to fail a test from within a callback function rather than the main test function.
	 * - If the test case has already failed, this method does nothing.
	 * @param error The error to associate with this test case, preferably as an Error instance (to be able to display the JavaScript call stack) but may be any value
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Failing case", (t) => {
	 *     t.fail(new Error("Oops"))
	 *   });
	 * });
	 */
	fail(error?: Error | string | unknown) {
		if (this._error || stopAll) return;
		this._error = error;
		if (this._breakOnFail) stopAll = true;
	}

	/**
	 * Resolves a promise after a specified timeout
	 * - This method is asynchronous and **must** be `await`-ed.
	 * - You can omit the `ms` parameter to wait (asynchronously) only until the next 'tick'
	 * @param ms The time to wait, in milliseconds
	 * @example
	 * describe("My scope", () => {
	 *   test("My test", async (t) => {
	 *     await t.sleep(100);
	 *   });
	 * });
	 */
	async sleep(ms = 0) {
		this._awaiting++;
		await new Promise((r) => setTimeout(r, ms));
		this._awaiting--;
	}

	/**
	 * Runs a function at the specified interval (in ms)
	 *
	 * @summary
	 * This method calls a poll function at a specific interval (in milliseconds), until it returns `true`. When it does, the promise returned by this method is resolved, and the test case may continue.
	 *
	 * If a timeout is provided (also in milliseconds), then the returned promise is rejected after the specified amount of time and the poll function will no longer be called — if the function didn't already return true or threw an error, and if the test hasn't yet failed otherwise. The returned promise is rejected with a generic timeout error, or the result of the `onTimeout` function if provided.
	 *
	 * - The provided function runs _synchronously_, promise return values aren't awaited.
	 * - If the provided function throws an error, the error is passed on: the promise returned by this method is rejected.
	 * - If the test itself fails in the meantime, the provided function will no longer be called.
	 * @note This method is asynchronous, and **must** be awaited (otherwise any running test will fail automatically).
	 * @param poll The function to call at the specified interval
	 * @param interval The poll interval, in milliseconds
	 * @param timeout The timeout, in milliseconds, after which the returned promise is rejected
	 * @param onTimeout A function that's called just before the promise is rejected on timeout; may return an error which is used when rejecting the promise
	 * @returns A promise (void) that's resolved when polling stops, or rejected if the function throws an error or a timeout occurs
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Do something", async (t) => {
	 *     // ... start something that goes on for a while
	 *     await t.pollAsync(() => {
	 *       if (something.isDone()) return true;
	 *       if (something.hasFailed()) throw Error("Oops");
	 *     }, 100);
	 *   });
	 * });
	 */
	async pollAsync(
		poll: () => true | any,
		interval?: number,
		timeout?: number,
		onTimeout?: () => Error | void,
	) {
		let startT = Date.now();
		this._awaiting++;
		try {
			await new Promise<void>((resolve, reject) => {
				let id = setInterval(() => {
					if (timeout && Date.now() > startT + timeout) {
						// timeout
						reject((onTimeout && onTimeout()) || Error("pollAsync timeout"));
					} else if (this._done || stopAll) {
						// test already done (maybe failed async), stop polling
						clearInterval(id);
						resolve();
					} else {
						// poll again
						try {
							if (poll() === true) {
								clearInterval(id);
								resolve();
							}
						} catch (err) {
							clearInterval(id);
							reject(err);
						}
					}
				}, interval);
			});
		} finally {
			this._awaiting--;
		}
	}

	/**
	 * Runs a function (synchronously), expecting it to throw an error
	 *
	 * @summary This method runs the provided function within a try-catch statement. If the function throws an error **or** if the test case fails otherwise, the error that was caught is returned and the test case doesn't fail. If the function doesn't throw an error, this method returns undefined.
	 * @param f The function to run
	 * @returns The error that was caught, or undefined otherwise
	 * @error This method throws the current error, if the test case _already_ failed before (e.g. using {@link fail()})
	 * @see {@link TestCase.tryRunAsync()}
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Try to run a bad function", (t) => {
	 *     function bad() { let x = undefined; return x["foo"]; }
	 *     let error = t.tryRun(bad);
	 *     expect(error).toBeDefined();
	 *   });
	 * });
	 */
	tryRun(f: () => void): unknown {
		if (this._error) throw this._error;
		let breakOnFail = this._breakOnFail;
		this._breakOnFail = false;
		let error: any;
		try {
			f();
		} catch (err) {
			error = err;
		}
		if (this._error) error = this._error;
		this._error = undefined;
		this._breakOnFail = breakOnFail;
		return error;
	}

	/**
	 * Runs a function asynchronously, expecting it to throw an error
	 *
	 * @summary This method calls the provided function asynchronously within a try-catch statement. If the function throws an error (or returns a promise that's rejected) **or** if the test case fails otherwise, the error that was caught is returned and the test case won't fail. If the function doesn't throw an error, this method returns undefined.
	 * @note This method is asynchronous and **must** be `await`-ed.
	 * @param f The function to run
	 * @returns A promise for the error that was caught, or undefined otherwise
	 * @error This method throws the current error, if the test case _already_ failed before (e.g. using {@link fail()})
	 * @see {@link TestCase.tryRunAsync()}
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Try to run a bad async function", async (t) => {
	 *     async function bad() { let x = undefined; return x["foo"]; }
	 *     let error = await t.tryRunAsync(bad);
	 *     expect(error).toBeDefined();
	 *   });
	 * });
	 */
	async tryRunAsync(f: () => Promise<void>): Promise<unknown> {
		if (this._error) throw this._error;
		let breakOnFail = this._breakOnFail;
		this._breakOnFail = false;
		let error: any;
		this._awaiting++;
		try {
			await f();
		} catch (err) {
			error = err;
		}
		this._awaiting--;
		if (this._error) error = this._error;
		this._error = undefined;
		this._breakOnFail = breakOnFail;
		return error;
	}

	/**
	 * Waits for the global navigation path to match the given string
	 *
	 * @summary This method starts checking the navigation path periodically (using {@link GlobalContext.getPath()}), and waits for the path to match the provided string. If the path still doesn't match after the given timeout (number of milliseconds) this method throws an error.
	 * @note This method is asynchronous and **must** be `await`-ed.
	 * @param timeout Timeout, in milliseconds
	 * @param path Path to wait for, must be an exact match
	 * @returns A promise (void) that's resolved when the patch matches, or rejected when a timeout occurs.
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Wait for path", async (t) => {
	 *     // ... navigate to a path somehow
	 *     await t.expectPathAsync(100, "foo/bar");
	 *   });
	 * });
	 */
	async expectPathAsync(timeout: number, path: string) {
		await this.pollAsync(
			() => app.getPath() === path,
			5,
			timeout,
			() =>
				Error(
					`Expected path ${val2str(path)} but it is ${val2str(app.getPath())}`,
				),
		);
	}

	/**
	 * Waits for output to be rendered (by the test renderer) that matches the provided filters
	 * - This method uses {@link TestRenderer.expectOutputAsync()}, refer to its documentation for details.
	 * - This method is asynchronous and **must** be `await`-ed.
	 * @param timeout Timeout, in milliseconds
	 * @param select A set of output filters to match
	 * @returns A promise that's resolved to an {@link OutputAssertion} instance for matching output, or rejected when a timeout occurs.
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Wait for output", async (t) => {
	 *     // ... render output somehow
	 *     await t.expectOutputAsync(100, { type: "button" });
	 *   });
	 * });
	 */
	async expectOutputAsync(timeout: number, ...select: OutputSelectFilter[]) {
		if (!(app.renderer instanceof TestRenderer)) {
			throw Error("Test renderer not found, run `useTestContext()` first");
		}
		this._awaiting++;
		try {
			return await (app.renderer as TestRenderer).expectOutputAsync(
				timeout,
				...select,
			);
		} catch (err) {
			this.fail(err);
			if (!this._done) throw err;
		} finally {
			this._awaiting--;
		}
		return new OutputAssertion([]);
	}

	/**
	 * Waits for an alert or confirm dialog to be rendered (by the test renderer)
	 * - This method uses {@link TestRenderer.expectMessageDialogAsync()}, refer to its documentation for details.
	 * - This method is asynchronous and **must** be `await`-ed.
	 * @param timeout Timeout, in milliseconds
	 * @param match A list of strings or regular expressions to match the dialog message
	 * @returns A promise that's resolved to a {@link RenderedTestMessageDialog} instance for checking content or pressing buttons, or rejected when a timeout occurs.
	 *
	 * @example
	 * describe("My scope", () => {
	 *   test("Cancel confirm dialog", async (t) => {
	 *     // ...
	 *     let p = app.showConfirmDialog("Are you sure?");
	 *     await (
	 *       await t.expectMessageDialogAsync(100, /sure/)
	 *     ).cancelAsync();
	 *     let result = await p;
	 *     expect(result).toBe(false);
	 *   });
	 * });
	 */
	async expectMessageDialogAsync(
		timeout: number,
		...match: Array<string | RegExp>
	): Promise<RenderedTestMessageDialog> {
		if (!(app.renderer instanceof TestRenderer)) {
			throw Error("Test renderer not found, run `useTestContext()` first");
		}
		this._awaiting++;
		try {
			return await (app.renderer as TestRenderer).expectMessageDialogAsync(
				timeout,
				...match,
			);
		} finally {
			this._awaiting--;
		}
	}

	/** Runs this test case (used by {@link TestScope}) */
	runTestAsync(timeout = DEFAULT_TIMEOUT) {
		if (this._startT) throw Error("Test has already run");
		this._startT = Date.now();

		// keep track of stop (timeout) time
		let stop = Date.now() + timeout;
		if (stopAll) return Promise.resolve();
		return Promise.any([
			// promise that resolves on timeout:
			(async () => {
				while (Date.now() < stop) {
					await new Promise((r) => {
						setTimeout(r, 10);
					});
					if (this._done || stopAll) return;
				}
				this.fail("Timeout");
				this._done = true;
				this._stopT = Date.now();
			})(),

			// promise that runs the actual test function
			(async () => {
				try {
					if (!this._function) throw Error("Test not defined");
					await this._function(this);
					if (this._awaiting > 0) {
						throw Error(
							"Test function returned but still running async. " +
								"Forgot to await result?",
						);
					}
				} catch (err) {
					if (stopAll) return;
					this.fail(err);
				} finally {
					this._done = true;
					this._stopT = Date.now();
				}
			})(),
		]);
	}

	private _awaiting = 0;
	private _done = false;
	private _startT?: number;
	private _stopT?: number;
	private _breakOnFail = false;
	private _error?: unknown;
	private _logs: Array<ReadonlyArray<any>> = [];
	private _counts: Record<string, number | undefined> = {};
}
