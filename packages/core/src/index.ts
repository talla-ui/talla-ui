export * from "./object/index.js";
export * from "./app/index.js";
export * from "./ui/index.js";

import { AppContext } from "./app/index.js";

/**
 * The current instance of the global application context
 *
 * @description
 * Use `app` to access properties and methods of {@link AppContext}, e.g. `app.log` and `app.addActivity(...)`. This instance is available immediately when the application starts, and remains the same throughout its lifetime.
 */
export const app = new AppContext();
