import {
	app,
	AppContext,
	LocalData,
	UIColor,
	UIIconResource,
} from "@talla-ui/core";
import { ConfigOptions } from "@talla-ui/util";
import { TestContextOptions } from "./TestContextOptions.js";
import { TestNavigationContext } from "./TestNavigationContext.js";
import { TestRenderer } from "./TestRenderer.js";
import defaultColors from "./defaults/colors.js";
import defaultIcons from "./defaults/icons.js";

/** Type definition for the global {@link app} context with test-specific render and activity contexts, set by the {@link useTestContext} function */
export type TestAppContext = AppContext & {
	renderer: TestRenderer;
	navigation: TestNavigationContext;
};

/**
 * Clears the current global {@link app} context and initializes a test application context
 *
 * @param config A {@link TestContextOptions} object, or a callback to set options
 * @returns The global {@link app} context, typed as {@link TestAppContext}.
 *
 * @example
 * describe("My scope", (scope) => {
 *   scope.beforeEach(() => {
 *     useTestContext({ path: "foo" });
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

	// create test renderer and set theme values
	(app as any).renderer = new TestRenderer(options);
	UIColor.theme.set({ ...defaultColors });
	UIIconResource.theme.set({ ...defaultIcons });

	// create test navigation path and set initial path
	app.navigation?.unlink();
	app.navigation = new TestNavigationContext(options);

	// reset local data
	app.localData = new LocalData(options.localData);

	return app as TestAppContext;
}
