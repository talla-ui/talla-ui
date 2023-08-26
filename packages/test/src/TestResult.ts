/**
 * A data structure that includes test results from a single run
 *
 * @description
 * This data structure is returned by {@link getTestResults()}, and contains a list of test results as well as a summary.
 *
 * It contains the following properties:
 * - `results` — An array of objects, with one {@link TestResult} for each test. All test are included in the list, even if they haven't (yet) run.
 * - `time` — The total time taken by all tests, in milliseconds.
 * - `failed` — True if _any_ of the tests has failed (i.e. `fail` or `todo` state).
 * - `totals` — An object that contains the total number of tests in each state.
 */
export type TestResultsData = Readonly<{
	/** A list of test results, one {@link TestResult} object for each test */
	results: ReadonlyArray<TestResult>;
	/** The total time taken by all tests, in milliseconds */
	time: number;
	/** True if any of the tests has failed (i.e. `fail` or `todo` state) */
	failed: boolean;
	/** Total number of tests in each state */
	totals: Readonly<{
		wait: number;
		run: number;
		fail: number;
		todo: number;
		skip: number;
		pass: number;
	}>;
}>;

/**
 * An object that represents a single test result, part of {@link TestResultsData}
 *
 * @description
 * This object is returned as part of {@link TestResultsData} by {@link getTestResults()}. It represents the state and/or outcome of a single test, using the following properties:
 *
 * - `name` — The name of the test, including scope(s) separated by ` :: `.
 * - `state` — The test state, one of {@link TestState}.
 * - `time` — The total time taken by the test, in milliseconds.
 * - `logs` — A string containing log output, if any.
 * - `error` — An error message, if any.
 * - `stack` — The call stack associated with the error, if available.
 */
export type TestResult = {
	/** The name of the scope(s) and test, concatenated using ` :: ` */
	name: string;
	/** The current or final state of this test, one of {@link TestState} */
	state: TestState;
	/** The total time taken by this test, in milliseconds */
	time: number;
	/** Log output, if any, as a string concatenated using newlines */
	logs?: string;
	/** The error that caused the test to fail, if any */
	error?: string;
	/** The call stack associated with the error, if available */
	stack?: string;
};

/** Type definition for possible test states */
export type TestState = "wait" | "run" | "fail" | "todo" | "skip" | "pass";
