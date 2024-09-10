import { setErrorHandler } from "../errors.js";
import { AppContext } from "./AppContext.js";

/**
 * The current instance of the global application context
 *
 * @description
 * Use `app` to access properties and methods of {@link AppContext}, e.g. `app.theme` and `app.addActivity(...)`. This instance is available immediately when the application starts, and remains the same throughout its lifetime.
 */
export const app = new AppContext();

// use default error handler
setErrorHandler((err) => {
	app.log.error(err);
});
