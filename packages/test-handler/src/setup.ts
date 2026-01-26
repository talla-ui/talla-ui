import { app, AppContext, UIColor, UIIconResource } from "@talla-ui/core";
import defaultColors from "./defaults/colors.js";
import defaultIcons from "./defaults/icons.js";
import { registerTestEffects } from "./effects.js";
import { TestContextOptions } from "./TestContextOptions.js";
import { TestNavigationContext } from "./TestNavigationContext.js";
import { TestRenderer } from "./TestRenderer.js";

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
export function useTestContext(
	config?: (opts: TestContextOptions) => void,
): TestAppContext {
	let options = new TestContextOptions();
	config?.(options);

	// set error handler to re-throw if configured (logging is handled by core)
	if (options.throwUncaughtErrors) {
		AppContext.setErrorHandler((e) => {
			app.log.error(e);
			throw e;
		});
	}

	// clear the current app properties first
	app.clear();

	// create test renderer and set colors/icons
	(app as any).renderer = new TestRenderer();
	UIColor.setColors(defaultColors);
	UIIconResource.setIcons(defaultIcons);

	// register no-op effects for test compatibility
	registerTestEffects();

	// create test navigation path and set initial path
	app.navigation?.unlink();
	app.navigation = new TestNavigationContext(options);

	return app as TestAppContext;
}
