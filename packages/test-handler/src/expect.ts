import { app, ConfigOptions, View } from "@talla-ui/core";
import { OutputAssertion, OutputSelectFilter } from "./OutputAssertion.js";
import {
	TestRenderer,
	RenderedTestMessageDialog,
} from "./renderer/TestRenderer.js";
import { TestOutputElement } from "./TestOutputElement.js";

/** @internal Retrieves app.renderer typed as TestRenderer */
function getTestRenderer() {
	if (!(app.renderer instanceof TestRenderer)) {
		throw Error("Test renderer not found, run `useTestContext()` first");
	}
	return app.renderer;
}

/** Options to be used with {@link expectNavAsync()} */
export class ExpectNavOptions extends ConfigOptions {
	/** Page ID to wait for, must be an exact match */
	pageId = "";
	/** Detail string to wait for, must be an exact match; defaults to en empty string (i.e. exact page match) */
	detail = "";
	/** Timeout, in milliseconds; defaults to 200ms */
	timeout = 200;
}

/**
 * Waits for the global navigation location to match the given page ID and detail
 *
 * @summary This function starts checking the navigation controller periodically, and waits for the path to match the provided string. If the path still doesn't match after the given timeout (number of milliseconds) this function throws an error.
 * @note This function is asynchronous and **must** be `await`-ed.
 * @param timeout Timeout, in milliseconds
 * @param pageId Page ID to wait for, must be an exact match
 * @param detail Detail string to wait for (defaults to empty string), must be an exact match
 * @returns A promise (void) that's resolved when the path matches, or rejected when a timeout occurs.
 *
 * @example
 * test("Wait for navigation", async (t) => {
 *   // ... navigate to a path somehow, then:
 *   await expectNavAsync({ pageId: "foo" });
 * });
 */
export async function expectNavAsync(
	expect: ConfigOptions.Arg<ExpectNavOptions>,
) {
	let options = ExpectNavOptions.init(expect);

	// create error first, to capture accurate stack trace
	let error = Error(
		"Expected navigation to " + options.pageId + "/" + options.detail,
	);

	// start polling
	let start = Date.now();
	while (true) {
		let match =
			app.navigation.pageId === options.pageId &&
			app.navigation.detail === options.detail;
		if (match) return;

		// check timeout or loop
		if (Date.now() - start > options.timeout) {
			error.message +=
				", but location is " +
				app.navigation.pageId +
				"/" +
				app.navigation.detail;
			throw error;
		}
		await new Promise((r) => setTimeout(r, 5));
	}
}

/**
 * Waits for output to be rendered (by the test renderer) that matches the provided filters
 * - This function uses {@link TestRenderer.expectOutputAsync()}, refer to its documentation for details.
 * - This function is asynchronous and **must** be `await`-ed.
 * @param select A set of output filters to match, including optional timeout (defaults to 200ms)
 * @param nested Further output filters to match, if any
 * @returns A promise that's resolved to an {@link OutputAssertion} instance for matching output, or rejected when a timeout occurs.
 *
 * @example
 * test("Wait for output", async (t) => {
 *   // ... render output somehow
 *   await expectOutputAsync({ type: "button" });
 * });
 */
export async function expectOutputAsync(
	select: OutputSelectFilter & { timeout?: number },
	...nested: OutputSelectFilter[]
): Promise<OutputAssertion> {
	return getTestRenderer().expectOutputAsync(select, ...nested);
}

/**
 * Returns an assertion for the elements matching the provided filters
 * - This function returns the same result as {@link expectOutputAsync} but without waiting for (new) rendering to complete.
 * - This function uses {@link TestRenderer.expectOutputAsync()}, refer to its documentation for details.
 * @param select A set of output filters to match, including optional timeout (defaults to 200ms)
 * @param nested Further output filters to match, if any
 * @returns A promise that's resolved to an {@link OutputAssertion} instance for matching output, or rejected when a timeout occurs.
 */
export function expectOutput(
	select: OutputSelectFilter & { timeout?: number },
	...nested: OutputSelectFilter[]
): OutputAssertion {
	return getTestRenderer().expectOutput(select, ...nested);
}

/**
 * Waits for an alert or confirm dialog to be rendered (by the test renderer)
 * - This function uses {@link TestRenderer.expectMessageDialogAsync()}, refer to its documentation for details.
 * - This function is asynchronous and **must** be `await`-ed.
 * @param timeout Timeout, in milliseconds
 * @param match A list of strings or regular expressions to match the dialog message
 * @returns A promise that's resolved to a {@link RenderedTestMessageDialog} instance for checking content or pressing buttons, or rejected when a timeout occurs.
 *
 * @example
 * test("Cancel confirm dialog", async (t) => {
 *   // ...
 *   let p = app.showConfirmDialog("Are you sure?");
 *   await (
 *     await expectMessageDialogAsync(100, /sure/)
 *   ).cancelAsync();
 *   let result = await p;
 *   expect(result).toBe(false);
 * });
 */
export async function expectMessageDialogAsync(
	timeout: number,
	...match: Array<string | RegExp>
): Promise<RenderedTestMessageDialog> {
	return getTestRenderer().expectMessageDialogAsync(timeout, ...match);
}

/**
 * Waits for matching output to be rendered, and simulates a user click event
 * - This function awaits the result of {@link expectOutputAsync()}, finds a single element, and sends a click event using {@link TestOutputElement.click()}.
 * @error This function throws an error if the output is not found after the provided timeout (or default value of 200ms) or if multiple elements match the selection criteria.
 * @returns The test output element itself
 */
export async function clickOutputAsync(
	select: OutputSelectFilter & { timeout?: number },
	...nested: OutputSelectFilter[]
): Promise<TestOutputElement> {
	let out = await expectOutputAsync(select, ...nested);
	return out.getSingle().click();
}

/**
 * Waits for matching output to be rendered, and simulates user text input
 * - This function awaits the result of {@link expectOutputAsync()}, finds a single element, and sends text input using {@link TestOutputElement.setValue()}.
 * - The selection criteria don't automatically include the text field type; to match a text field element, use the `textfield` type, or use an accessible label or name property.
 * @error This function throws an error if the output is not found after the provided timeout (or default value of 200ms) or if multiple elements match the selection criteria.
 * @returns The test output element itself
 */
export async function enterTextOutputAsync(
	value: string,
	select: OutputSelectFilter & { timeout?: number },
	...nested: OutputSelectFilter[]
): Promise<TestOutputElement> {
	let out = await expectOutputAsync(select, ...nested);
	return out.getSingle().setValue(value);
}

/**
 * Renders the specified view using the current test application context
 * - This function is provided as a shortcut to render a view exclusively. It clears all rendered test output, if any, and then renders the specified view.
 * - The test application context must be initialized using {@link useTestContext()} before calling this function.
 */
export function renderTestView(view: View) {
	let renderer = getTestRenderer();
	renderer.clear();
	renderer.render(view, { mode: "page" });
}
