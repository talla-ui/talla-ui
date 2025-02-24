export * from "./Scheduler.js";
export * from "./I18nProvider.js";
export * from "./AppException.js";
export * from "./RenderContext.js";
export * from "./NavigationTarget.js";
export * from "./ActivityList.js";
export * from "./NavigationContext.js";
export * from "./Activity.js";
export * from "./View.js";
export * from "./FormContext.js";
export * from "./LogWriter.js";
export * from "./LocalData.js";
export * from "./MessageDialogOptions.js";
export * from "./ModalMenuOptions.js";
export * from "./AppContext.js";
export * from "./app_binding.js";

// create app context instance last
import { AppContext } from "./AppContext.js";

/**
 * The current instance of the global application context
 *
 * @description
 * Use `app` to access properties and methods of {@link AppContext}, e.g. `app.theme` and `app.addActivity(...)`. This instance is available immediately when the application starts, and remains the same throughout its lifetime.
 */
export const app = new AppContext();
AppContext.setErrorHandler((err) => {
	app.log.error(err);
});

import { Binding } from "../base/index.js";
Binding.log_debug = (message, data) => {
	app.log.debug(message, data);
};
