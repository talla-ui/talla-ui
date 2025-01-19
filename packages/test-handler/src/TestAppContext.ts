import { AppContext, ConfigOptions, LocalData, app } from "@talla-ui/core";
import { TestRenderer } from "./renderer/TestRenderer.js";
import { makeTheme } from "./theme/theme.js";
import { TestNavigationContext } from "./TestNavigationContext.js";

/** Type definition for the global {@link app} context with test-specific render and activity contexts, set by the {@link useTestContext} function */
export type TestAppContext = AppContext & {
	renderer: TestRenderer;
	navigation: TestNavigationContext;
};

/**
 * A class that contains options for the test application context
 * - These options should be set in a configuration callback passed to {@link useTestContext}.
 */
export class TestContextOptions extends ConfigOptions {
	/** The initial page ID on the history stack, defaults to empty string */
	navigationPageId = "";

	/** The initial navigation detail on the history stack */
	navigationDetail = "";

	/** The delay (in milliseconds) after which path changes are applied, defaults to 5 */
	navigationDelay = 5;

	/** The frequency (in milliseconds) with which output is added, defaults to 15 */
	renderFrequency = 15;

	/** True (default) if uncaught errors should be thrown anyway, including async; sets global error handler */
	throwUncaughtErrors = true;

	/** Mock persisted data, i.e. data made available through `app.localData`; must be serializable as JSON */
	localData: Record<string, Record<string, unknown>> = {};
}

/**
 * Clears the current global {@link app} context and initializes a test application context
 *
 * @param config A {@link TestContextOptions} object, or a callback to set options
 * @returns The global {@link app} context, typed as {@link TestAppContext}.
 *
 * @example
 * describe("My scope", (scope) => {
 *   scope.beforeEach(() => {
 *     useTestContext({
 *       path: "foo",
 *       renderFrequency: 5,
 *     });
 *   });
 *
 *   // ... add some tests here, to use `app`
 * });
 */
export function useTestContext(config?: ConfigOptions.Arg<TestContextOptions>) {
	let options = TestContextOptions.init(config);

	// set error handler
	AppContext.setErrorHandler((e) => {
		app.log.error(e);
		if (options.throwUncaughtErrors) throw e;
	});

	// clear the current app properties first
	app.clear();

	// create test renderer
	app.theme = makeTheme();
	(app as any).renderer = new TestRenderer(options);

	// create test navigation path and set initial path
	app.navigation.unlink();
	app.navigation = new TestNavigationContext(options);

	// reset local data
	app.localData = new LocalData();
	let data = options.localData;
	if (data) for (let k in data) app.localData.write(k, data[k]);

	return app as TestAppContext;
}
