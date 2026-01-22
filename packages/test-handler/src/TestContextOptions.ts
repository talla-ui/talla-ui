/**
 * A class that contains options for the test application context
 * - These options should be set in a configuration callback passed to {@link useTestContext}.
 */
export class TestContextOptions {
	/** The initial navigation path on the history stack, defaults to empty string */
	navigationPath = "";

	/** The delay (in milliseconds) after which path changes are applied, defaults to 5 */
	navigationDelay = 5;

	/** True (default) if uncaught errors should be thrown anyway, including async; sets global error handler */
	throwUncaughtErrors = true;
}
