import { LazyString, ManagedObject, StringConvertible } from "../core/index.js";
import { err, ERROR, errorHandler, setErrorHandler } from "../errors.js";
import { ActivationContext } from "./ActivationContext.js";
import { ServiceContext } from "./ServiceContext.js";
import type { Activity } from "./Activity.js";
import type { I18nProvider } from "./I18nProvider.js";
import type { NavigationTarget } from "./NavigationTarget.js";
import type { ActivationPath } from "./ActivationPath.js";
import type { RenderContext } from "./RenderContext.js";
import type { ViewportContext } from "./ViewportContext.js";
import { UITheme } from "../ui/UITheme.js";
import { Scheduler } from "./Scheduler.js";
import { LogWriter } from "./LogWriter.js";

/**
 * A singleton class that represents the global application state
 *
 * @description
 * An instance of this class is available as {@link app} during the entire lifecycle of the application. Use that to access all properties and methods of GlobalContext, e.g. `app.theme` and `app.addActivity(...)`.
 *
 * @hideconstructor
 */
export class GlobalContext extends ManagedObject {
	/** @internal The current singleton instance, available as {@link app} */
	static readonly instance = new GlobalContext();

	/** Private constructor, cannot be used */
	private constructor() {
		if (GlobalContext.instance) throw Error;
		super();
		this.observeAttach("services");
		this.observeAttach("activities");
		this.observeAttach("renderer");

		// define i18n property and handle new objects when set
		let i18n: I18nProvider | undefined;
		Object.defineProperty(this, "i18n", {
			get() {
				return i18n;
			},
			set(v: any) {
				i18n = v;
				LazyString.setI18nInterface(i18n);
				LazyString.invalidateCache();
			},
		});
	}

	/**
	 * The current activation context, an instance of {@link ActivationContext}
	 * - This object (indirectly) contains all activity instances, as well as the current location path object.
	 * @note To add an activity to the application, use the {@link GlobalContext.addActivity() app.addActivity()} method instead.
	 */
	readonly activities = new ActivationContext();

	/**
	 * The current service context, an instance of {@link ServiceContext}
	 * - This object contains all current service instances, and provides methods to observe any changes.
	 * @note To add a service to the application, use the {@link GlobalContext.addService() app.addService()} method instead.
	 */
	readonly services = new ServiceContext();

	/** The current application output renderer, an instance of {@link RenderContext} */
	declare renderer?: RenderContext;

	/**
	 * An object containing information about the user's viewport, e.g. browser window
	 * - You can use `app.viewport` directly, or using a binding (bound to `"viewport"`, since all views and activities are ultimately attached to the global application context, i.e. `app`).
	 * - Refer to {@link ViewportContext} for available properties of `app.viewport`.
	 *
	 * @see {@link ViewportContext}
	 * @example
	 * // Use the viewport size in code:
	 * if (app.viewport.portrait) {
	 *   // ... do something in portrait mode
	 * }
	 *
	 * @example
	 * // Use the viewport size in a view:
	 * UICell.with(
	 *   { hidden: bound("!viewport.portrait") }
	 *   // ... portrait cell content
	 * )
	 */
	declare viewport?: ViewportContext;

	/**
	 * The current internationalization context, an object that implements {@link I18nProvider}
	 * - You can set `app.i18n` to an object that implements {@link I18nProvider}, to change the current internationalization context. Note that labels and other UI text elements aren't updated until the output is re-rendered: emit a change event on `app.renderer` to trigger a global re-render.
	 */
	declare i18n?: I18nProvider;

	/**
	 * The current theme, an instance of {@link UITheme}
	 * - The theme instance can be modified, or a new instance can be created in advance.
	 * - Styling and other properties don't update instantly, a re-render is required after updating the theme: emit a change event on the renderer context to force UI components to evaluate current theme styles.
	 * - Refer to {@link UITheme} for available properties and methods of `app.theme`.
	 * @see {@link UITheme}
	 */
	theme?: UITheme;

	/**
	 * The global asynchronous task scheduler, an instance of {@link Scheduler}
	 * - You can use `app.scheduler` to create and manage queues for scheduling asynchronous (background) tasks.
	 * - Refer to {@link Scheduler} for available methods of `app.scheduler`.
	 */
	scheduler = new Scheduler();

	/**
	 * The global message log writer instance, an instance of {@link LogWriter}
	 * - You can use `app.log` methods to write messages to the current application log.
	 * - To add a log output handler, use {@link GlobalContext.addLogHandler app.addLogHandler()}. If none are added, log messages are written to the console.
	 * - Refer to {@link LogWriter} for available methods of `app.log`.
	 */
	log = new LogWriter();

	/**
	 * Clears the state of the global application context
	 * @summary This method is used to reset the app to its initial state. It's called automatically by context initialization functions such as `useTestContext()` and `useWebContext()`, before setting up a new global context with platform-specific details. The following actions take place:
	 * 1. The current renderer's output is cleared;
	 * 2. All activities are unlinked;
	 * 3. All services are unlinked;
	 * 4. All scheduler queues are stopped;
	 * 5. The i18n provider is unlinked;
	 * 6. The theme is removed
	 * 7. Log sink(s) are removed;
	 */
	clear() {
		if (this.renderer) this.renderer.clear();
		this.activities.clear();
		this.services.clear();
		this.scheduler.stopAll();
		this.scheduler = new Scheduler();
		this.i18n = undefined;
		this.theme = undefined;
		this.log = new LogWriter();
		return this;
	}

	/**
	 * Adds an activity to the global application context
	 *
	 * @summary
	 * This method adds an {@link Activity} instance to the current {@link ActivationContext}, i.e. `app.activities`. This allows the activity to use the current path and renderer to activate and/or render its view automatically.
	 *
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	addActivity(activity: Activity, activate?: boolean) {
		this.activities.root.add(activity);
		if (activate) activity.activateAsync().catch(errorHandler);
		return this;
	}

	/**
	 * Adds a service to the global application context
	 *
	 * @summary
	 * This method adds a global service to the current {@link ServiceContext}, i.e. `app.services`. This allows other parts of the application to find and observe the service.
	 *
	 * @param name The name of the service to be added
	 * @param service The service to be added
	 */
	addService(name: string, service: ManagedObject) {
		this.services.set(name, service);
		return this;
	}

	/**
	 * Navigates to the specified path asynchronously
	 * - The behavior of this method is platform dependent. It uses {@link ActivationPath.navigateAsync()} to navigate to the specified path, which in turn updates the path returned by {@link GlobalContext.getPath app.getPath()} — and may activate or deactivate activities.
	 * @param target The target location: a path in URL format, or a {@link NavigationTarget} instance
	 * @param mode The navigation mode, refer to {@link ActivationPath.navigateAsync()}
	 *
	 * @example
	 * // In a web application, navigate to the /foo URL
	 * app.navigate("/foo");
	 */
	navigate(
		target:
			| StringConvertible
			| NavigationTarget
			| { getNavigationTarget(): NavigationTarget },
		mode?: ActivationPath.NavigationMode
	) {
		if (this.activities.activationPath) {
			if (typeof (target as any).getNavigationTarget === "function") {
				target = (target as any).getNavigationTarget();
			}
			this.activities.activationPath
				.navigateAsync(String(target), mode)
				.catch(errorHandler);
		}
		return this;
	}

	/**
	 * Navigates back to the previous location in the location history stack
	 * - The behavior of this method is platform dependent. It uses {@link ActivationPath.navigateAsync()} to navigate back, which in turn updates the path returned by {@link GlobalContext.getPath app.getPath()} — and may activate or deactivate activities.
	 */
	goBack() {
		if (this.activities.activationPath) {
			this.activities.activationPath
				.navigateAsync("", { back: true })
				.catch(errorHandler);
		}
		return this;
	}

	/**
	 * Returns the current application location
	 *
	 * @summary
	 * This method returns {@link ActivationPath.path} from the current {@link ActivationContext} instance. This property is used by activities to activate and deactivate automatically according to their {@link Activity.path} value, if any.
	 * @note To set the application location (i.e. navigate to a different path), use the {@link GlobalContext.navigate app.navigate()} method.
	 */
	getPath() {
		return this.activities.activationPath.path;
	}

	/**
	 * Renders the provided view using specified placement options
	 *
	 * @summary This method can be used to render any view object to the screen (or in-memory test output, when called from a test function), such as a {@link UICell} or {@link ViewComposite} instance.
	 *
	 * @note Don't call this method directly with views that are part of {@link ViewActivity} instances; add activities to the global context (using {@link GlobalContext.addActivity app.addActivity()}) and activate them to render the associated view.
	 *
	 * @param view The view object to be rendered
	 * @param place Global view placement options, refer to {@link RenderContext.PlacementOptions}
	 * @returns A new {@link RenderContext.DynamicRendererWrapper} instance, which can be used to control the rendered view
	 * @error This method throws an error if the renderer hasn't been initialized yet.
	 */
	render(
		view: RenderContext.Renderable,
		place?: RenderContext.PlacementOptions
	) {
		if (!this.renderer) throw err(ERROR.GlobalContext_NoRenderer);
		return this.renderer.render(view, undefined, place || { mode: "default" });
	}

	/**
	 * Runs an animation on the provided view output element
	 *
	 * @summary This method passes a renderer-specific transformation object to an asynchronous function, which may use methods on the transformation object to animate the view output.
	 * @see {@link RenderContext.OutputTransform}
	 * @see {@link RenderContext.OutputTransformer}
	 *
	 * @param out The view output element to be animated, platform dependent
	 * @param transformer An asynchronous function that performs transformations, or a named animation from the current theme
	 * @error This method throws an error if the renderer hasn't been initialized yet.
	 */
	async animateAsync(
		out?: RenderContext.Output,
		animation?: RenderContext.OutputTransformer | string
	) {
		if (!this.renderer) throw err(ERROR.GlobalContext_NoRenderer);
		let t = out && this.renderer.transform(out);
		let f =
			typeof animation === "string"
				? UITheme.getAnimation(animation)
				: animation;
		if (t && f) await f(t);
	}

	/**
	 * Displays an alert dialog with the specified content
	 * - Use {@link strf} to translate content if necessary; this method doesn't localize strings by default.
	 * @param message
	 *  The message to be displayed, or an array with multiple messages
	 * @param title
	 *  The dialog title, displayed at the top of the dialog (optional)
	 * @param buttonLabel
	 *  The label for the dismiss button
	 * @returns A promise that resolves when the dialog is closed.
	 * @error This method throws an error if the theme modal dialog controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal dialog views).
	 */
	async showAlertDialogAsync(
		message: StringConvertible | StringConvertible[],
		title?: StringConvertible,
		buttonLabel?: StringConvertible
	) {
		let controller = this.theme?.modalFactory?.createAlertDialog?.();
		if (!controller) throw err(ERROR.GlobalContext_NoModal);

		// use controller to set message, title, and button text
		for (let m of Array.isArray(message) ? message : [message]) {
			controller!.addMessage(m);
		}
		if (title) controller.setTitle(title);
		if (buttonLabel) controller.setButtonLabel(buttonLabel);

		// create the dialog and display it
		await controller.showAsync();
	}

	/**
	 * Displays a confirmation dialog with the specified content
	 * - Use {@link strf} to translate content if necessary; this method doesn't localize strings by default.
	 * @param message
	 *  The message to be displayed, or an array with multiple messages
	 * @param title
	 *  The dialog title, displayed at the top of the dialog (optional)
	 * @param confirmButtonLabel
	 *  The label for the 'confirm' button
	 * @param cancelButtonLabel
	 *  The label for the 'cancel' button
	 * @returns A promise that resolves to true if the confirm button was clicked, false otherwise.
	 * @error This method throws an error if the theme modal dialog controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal dialog views).
	 */
	async showConfirmationDialogAsync(
		message: StringConvertible | StringConvertible[],
		title?: StringConvertible,
		confirmButtonLabel?: StringConvertible,
		cancelButtonLabel?: StringConvertible
	) {
		let controller = this.theme?.modalFactory?.createConfirmationDialog?.();
		if (!controller) throw err(ERROR.GlobalContext_NoModal);

		// use controller to set message, title, and button text
		for (let m of Array.isArray(message) ? message : [message]) {
			controller!.addMessage(m);
		}
		if (title) controller.setTitle(title);
		if (confirmButtonLabel)
			controller.setConfirmButtonLabel(confirmButtonLabel);
		if (cancelButtonLabel) controller.setCancelButtonLabel(cancelButtonLabel);

		// create the dialog and display it, then return confirmed boolean
		return (await controller.showAsync()).confirmed;
	}

	/** Displays a context/dropdown menu with the provided list of items
	 *
	 * @summary
	 * This method displays a modal menu with the list of items that are provided using the `items` argument. The menu is positioned near a particular UI component (an instance of {@link UIComponent}, e.g. a button that was clicked by the user).
	 *
	 * The `key` value of the chosen menu item, if any, is returned asynchronously. If the menu was dismissed, the returned promise is resolved to `undefined`.
	 *
	 * @note Use {@link strf} to translate content if necessary; this method doesn't localize strings by default.
	 *
	 * @param items
	 *  A list of menu items, as objects of type {@link UITheme.MenuItem}
	 * @param ref
	 * 	The related UI component
	 * @returns A promise that resolves to the selected item key, if any
	 * @error This method throws an error if the theme modal menu controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal menu views).
	 *
	 * @example
	 * // An event handler, part of an activity or view composite:
	 * async onSomeButtonClick(e: UIComponentEvent) {
	 *   let choice = await app.showModalMenuAsync(
	 *     [
	 *       { key: "one", text: "Option one" },
	 *       // ...
	 *     ],
	 *     e.source // <-- the button that was pressed
	 *   )
	 *   if (choice === "one") {
	 *     // the user selected Option one
	 *   }
	 * }
	 */
	async showModalMenuAsync(
		items: UITheme.MenuItem[],
		ref: { lastRenderOutput?: RenderContext.Output },
		width?: number
	) {
		let controller = this.theme?.modalFactory?.createMenu?.();
		if (!controller) throw err(ERROR.GlobalContext_NoModal);

		// use controller to add items
		for (let item of items) {
			controller.addItem(item);
		}
		if (width) controller.setWidth(width);

		// create the menu and display it, then return key
		return (await controller.showAsync({ ref: ref.lastRenderOutput })).key;
	}

	/**
	 * Adds a log sink for the current {@link LogWriter} instance
	 * @param minLevel The minimum log level for which messages are passed to the handler function
	 * @param f A handler function, which should accept a single {@link LogWriter.LogMessageData} argument
	 */
	addLogHandler(
		minLevel: number,
		f: (message: LogWriter.LogMessageData) => void
	) {
		this.log.emitter.listen((e) => {
			if (e.data.severity >= minLevel) f(e.data);
		});
	}

	/**
	 * Sets a global unhandled error handler
	 * - This method _replaces_ the current handler, if any. it's not cleared by {@link GlobalContext.clear()} either; and must not be set in a test context to allow the test runner to catch unhandled errors.
	 * - The default error handler logs all errors using {@link LogWriter.error()} (i.e. `app.log.error(...)`). Consider using a log sink instead of changing this behavior — refer to {@link GlobalContext.addLogHandler app.addLogHandler()}.
	 * @param f A handler function, which should accept a single error argument (with `unknown` type)
	 */
	setErrorHandler(f: (err: unknown) => void) {
		setErrorHandler(f);
	}

	/**
	 * Adds a hot-reload handler for the provided module handle, to update instances of a particular activity
	 * - Where supported, hot-reloading the provided module will update instances of the specified activity: updating methods (but not properties), and re-rendering existing views.
	 * - If hot-reloading isn't supported, e.g. if the application is compiled in production mode, this method does nothing.
	 * @param module The module that contains the activity to be hot-reloaded
	 * @param ActivityClass The activity that should be updated and re-rendered
	 */
	hotReload(handle: any, ActivityClass: new (...args: any[]) => Activity) {
		// if this method is not overridden (yet), try again after a while
		let f = this.hotReload;
		Promise.resolve().then(() => {
			if (this.hotReload !== f) this.hotReload(handle, ActivityClass);
		});
	}
}

/**
 * The current instance of the global application context
 *
 * @description
 * Use `app` to access properties and methods of {@link GlobalContext}, e.g. `app.theme` and `app.addActivity(...)`. This instance is available immediately when the application starts, and remains the same throughout its lifetime.
 *
 * ---
 * **Initializing the app** — Use the following methods to initialize the application.
 *
 * - {@ref GlobalContext.addActivity()}
 * - {@ref GlobalContext.addService()}
 *
 * ---
 * **Logging** — Use the `app.log` methods to write messages and data to the application log.
 *
 * - {@ref GlobalContext.log}
 *
 * ---
 * **Navigation** — Use the following methods to move around the application.
 *
 * - {@ref GlobalContext.navigate()}
 * - {@ref GlobalContext.goBack()}
 * - {@ref GlobalContext.getPath()}
 *
 * ---
 * **Rendering** — Use the following methods to render views.
 *
 * - {@ref GlobalContext.showAlertDialogAsync()}
 * - {@ref GlobalContext.showConfirmationDialogAsync()}
 * - {@ref GlobalContext.showModalMenuAsync()}
 * - {@ref GlobalContext.render()}
 * - {@ref GlobalContext.animateAsync()}
 *
 * ---
 * **Customization** — Use the following properties and methods to add custom behavior and styles to the application.
 *
 * - {@ref GlobalContext.theme}
 * - {@ref GlobalContext.i18n}
 * - {@ref GlobalContext.addLogHandler()}
 * - {@ref GlobalContext.setErrorHandler()}
 */
export const app = GlobalContext.instance;

// use default error handler
setErrorHandler((err) => {
	app.log.error(err);
});
