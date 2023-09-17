import {
	ActivationContext,
	ConfigOptions,
	GlobalContext,
	app,
} from "desk-frame";
import { TestScope } from "../TestScope.js";
import { TestTheme } from "../style/TestTheme.js";
import { TestActivationPath } from "./TestActivationPath.js";
import { TestRenderer } from "../renderer/TestRenderer.js";
import { TestViewportContext } from "./TestViewportContext.js";

/** Type definition for the global {@link app} context with test-specific render and activation contexts, set by the {@link useTestContext} function */
export type TestContext = GlobalContext & {
	renderer: TestRenderer;
	activities: ActivationContext & { activationPath: TestActivationPath };
};

/**
 * A class that contains options for the test context
 * - These options should be set in a configuration callback passed to {@link useTestContext}.
 */
export class TestContextOptions extends ConfigOptions {
	/** The initial path on the history stack, defaults to empty string (i.e. `/`) */
	path = "";

	/** The delay (in milliseconds) after which path changes are applied, defaults to 5 */
	pathDelay = 5;

	/** The frequency (in milliseconds) with which output is added, defaults to 15 */
	renderFrequency = 15;

	/** True if all logs (using `app.log`) should be captured and added to currently running test(s) */
	captureLogs = false;
}

/**
 * Clears the current global {@link app} context and initializes a test context
 *
 * @param config A {@link TestContextOptions} object, or a callback to set options
 * @returns The {@link app} global context, typed as {@link TestContext}.
 *
 * @example
 * describe("My scope", (scope) => {
 *   scope.beforeEach(() => {
 *     useTestContext((options) => {
 *       options.path = "foo"
 *       options.renderFrequency = 5;
 *     });
 *   });
 *
 *   // ... add some tests here, to use `app`
 * });
 */
export function useTestContext(config?: ConfigOptions.Arg<TestContextOptions>) {
	let options = TestContextOptions.init(config);

	// clear the current app properties first
	app.clear();

	// add a log sink if required
	if (options.captureLogs) {
		app.addLogHandler(0, (msg) => {
			let tests = TestScope.getRunningTests();
			for (let t of tests) {
				t.log(msg.message);
				if (msg.data) t.log(msg.data);
			}
		});
	}

	// create test renderer
	app.renderer = new TestRenderer(options);
	app.theme = new TestTheme();

	// create no-op viewport context
	app.viewport = new TestViewportContext();

	// create test activation path and set initial path
	app.activities.activationPath = new TestActivationPath(options);

	return app as TestContext;
}
