import { ConfigOptions } from "@talla-ui/util";

/**
 * A class that contains options for the test application context
 * - These options should be set in a configuration callback passed to {@link useTestContext}.
 */
export class TestContextOptions extends ConfigOptions {
	/** The initial navigation path on the history stack, defaults to empty string */
	navigationPath = "";

	/** The delay (in milliseconds) after which path changes are applied, defaults to 5 */
	navigationDelay = 5;

	/** True (default) if uncaught errors should be thrown anyway, including async; sets global error handler */
	throwUncaughtErrors = true;

	/** Default persisted data, i.e. data made available through `app.localData`; must be serializable as JSON */
	localData: Record<string, unknown> = {};
}
