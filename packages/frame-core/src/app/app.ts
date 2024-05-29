import { setErrorHandler } from "../errors.js";
import { GlobalContext } from "./GlobalContext.js";

/**
 * The current instance of the global application context
 *
 * @description
 * Use `app` to access properties and methods of {@link GlobalContext}, e.g. `app.theme` and `app.addActivity(...)`. This instance is available immediately when the application starts, and remains the same throughout its lifetime.
 */
export const app = new GlobalContext();

// use default error handler
setErrorHandler((err) => {
	app.log.error(err);
});
