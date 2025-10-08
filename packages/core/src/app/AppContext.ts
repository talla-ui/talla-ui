import { DeferredString, StringConvertible, fmt } from "@talla-ui/util";
import {
	ERROR,
	err,
	invalidArgErr,
	safeCall,
	setErrorHandler,
} from "../errors.js";
import { ObservableObject } from "../object/index.js";
import type { Activity } from "./Activity.js";
import { ActivityRouter } from "./ActivityRouter.js";
import { I18nContext } from "./I18nContext.js";
import { LocalData } from "./LocalData.js";
import { LogWriter } from "./LogWriter.js";
import { MessageDialogOptions } from "./MessageDialogOptions.js";
import { ModalMenuOptions } from "./ModalMenuOptions.js";
import type { NavigationContext } from "./NavigationContext.js";
import type { RenderContext } from "./RenderContext.js";
import { AsyncTaskQueue, Scheduler } from "./Scheduler.js";
import type { View } from "./View.js";
import type { Viewport } from "./Viewport.js";

/** Last (and first) instance of AppContext, if any */
let instance: AppContext | undefined;

/**
 * A singleton class that represents the global application state
 *
 * @description
 * An instance of this class is available as {@link app} during the entire lifecycle of the application. Use that to access all properties and methods of AppContext, e.g. `app.log` and `app.addActivity(...)`.
 *
 * @docgen {hideconstructor}
 */
export class AppContext extends ObservableObject {
	/**
	 * Returns the current application context
	 * - The application context is also exported as `app`, which should be used from application code instead of calling this method.
	 * @error This method throws an error if the application context hasn't been initialized yet.
	 */
	static getInstance() {
		if (!instance) throw Error;
		return instance;
	}

	/**
	 * Sets a global unhandled error handler
	 * - This method _replaces_ the current handler, if any, and is not cleared by {@link AppContext.clear()}.
	 * - The default error handler logs all errors using {@link LogWriter.error()} (i.e. `app.log.error(...)`). Consider using a log sink instead of changing this behavior — refer to {@link LogWriter.addHandler}.
	 * - In a test handler context, the global error handler is overridden to catch all unhandled errors during tests.
	 * @param f A handler function, which should accept a single error argument (with `unknown` type)
	 */
	static setErrorHandler(f: (err: unknown) => void) {
		setErrorHandler(f);
		DeferredString.setErrorHandler(f);
	}

	/** App constructor, do not use (refer to {@link app} instead) */
	constructor() {
		super();
		if (instance) throw Error;
		instance = this;

		// set as root object (cannot be attached, no more bindings)
		ObservableObject.makeRoot(this);

		// Link up deferred string i18n provider
		DeferredString.setI18nInterface(this.i18n);
	}

	/** @internal A reference to the application context itself */
	appContext = this;

	/**
	 * The root activity router
	 * - Activities that are added to this router can be activated automatically based on the result of their {@link Activity.matchNavigationPath()} method, which is invoked by the root {@link ActivityRouter}, i.e. {@link activities}. By default, the implementation of this method returns true if the path matches {@link Activity.navigationPath} exactly.
	 */
	readonly activities = this.attach(new ActivityRouter());

	/**
	 * The global message log writer instance, an instance of {@link LogWriter}
	 * - You can use `app.log` methods to write messages to the current application log, and add a log sink handler. If no handler is added, log messages are written to the console.
	 * - Refer to {@link LogWriter} for available methods of `app.log`.
	 */
	readonly log = new LogWriter();

	/**
	 * The current i18n context, an instance of {@link I18nContext}
	 * - This object encapsulates the current locale and options, which are used by {@link fmt()} and {@link Binding.fmt()} to translate and format strings.
	 * - To set the current locale, use {@link I18nContext.configure()} and/or {@link I18nContext.setText()}.
	 */
	readonly i18n = new I18nContext();

	/**
	 * The global asynchronous task scheduler, an instance of {@link Scheduler}
	 * - You can use `app.scheduler` to create and manage queues for scheduling asynchronous (background) tasks.
	 * - You can use {@link schedule()} to schedule a task on the default queue of this scheduler.
	 * - Refer to {@link Scheduler} for available methods of `app.scheduler`.
	 */
	readonly scheduler = new Scheduler();

	/**
	 * The current application output renderer, an instance of {@link RenderContext}
	 * - This property is set by the platform-specific renderer package.
	 */
	renderer?: RenderContext = undefined;

	/**
	 * Current viewport information, an object of type {@link Viewport}
	 * - This property is set by the platform-specific renderer package.
	 * - Bindings are available from the {@link UI.viewport} object, allowing you to create a UI that changes based on viewport size and orientation.
	 */
	viewport?: Viewport = undefined;

	/**
	 * The current navigation context, an instance of {@link NavigationContext}
	 * - This object encapsulates the current location path, and coordinates automatic activation of activities based on their navigation path.
	 * - This property is set by the platform-specific renderer package.
	 * @note To navigate around the application, use the {@link AppContext.navigate app.navigate()} and {@link AppContext.goBack app.goBack()} methods, rather than calling the methods of the navigation context directly.
	 */
	navigation?: NavigationContext = undefined;

	/**
	 * Persisted key-value object data, made available as an instance of {@link LocalData}
	 * - Data is persisted in a platform-dependent way. While testing, all data is _only_ persisted during the lifetime of the test handler.
	 * - This property is set by the platform-specific renderer package.
	 */
	localData = new LocalData();

	/**
	 * Clears the state of the global application context
	 * @summary This method is used to reset the app to its initial state. It's called automatically by context initialization functions such as `useTestContext()` and `useWebContext()`, before setting up a new global application context with platform-specific details. The following actions take place:
	 * 1. All activities are unlinked and removed;
	 * 2. The current renderer's output is cleared;
	 * 3. All scheduler queues are stopped and removed;
	 * 4. Log sink handlers are removed;
	 * 5. The i18n context is cleared, and the current locale is reset;
	 */
	clear() {
		this.activities.clear();
		this.navigation?.clear();
		this.renderer?.clear();
		this.scheduler.clear();
		this.log.removeHandlers();
		this.i18n.clear();
		return this;
	}

	/**
	 * Schedules a task on the default queue of the global scheduler
	 * @param f An (async) function that accepts a single argument, an instance of {@link AsyncTaskQueue.Task}
	 * @param priority The priority of the task (higher values _deprioritize_ the task)
	 */
	schedule(f: (t: AsyncTaskQueue.Task) => Promise<void> | void, priority = 0) {
		this.scheduler.getDefault().add(f, priority);
	}

	/**
	 * Adds an activity to the application
	 *
	 * @summary
	 * This method adds an {@link Activity} instance to the root activity router, i.e. {@link activities}. If the activity is added before the navigation context is initialized (asynchronously), the activity may be activated automatically based on the initial navigation path.
	 *
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	addActivity(activity: Activity, activate?: boolean) {
		this.activities.add(activity, activate);
		return this;
	}

	/**
	 * Navigates to the specified path asynchronously
	 * - The behavior of this method is platform dependent. It uses {@link NavigationContext.navigateAsync()} to navigate to the specified path, which may in turn activate or deactivate activities using the {@link Activity.navigationPath} property.
	 * @param target The target location
	 * @param mode The navigation mode, refer to {@link NavigationContext.navigateAsync()}
	 *
	 * @example
	 * // In a web application, navigate to the /foo URL
	 * app.navigate("foo");
	 */
	navigate(target: StringConvertible, mode?: NavigationContext.NavigationMode) {
		let path = String(target).replace(/^\/+|\/+$/g, "");
		if (path.startsWith(".")) throw invalidArgErr("target");
		if (this.navigation) {
			safeCall(this.navigation.navigateAsync, this.navigation, path, mode);
		}
		return this;
	}

	/**
	 * Navigates back to the previous location in the history stack
	 * - The behavior of this method is platform dependent. It uses {@link NavigationContext.navigateAsync()} to navigate back within navigation history, if possible.
	 */
	goBack() {
		if (this.navigation) {
			safeCall(this.navigation.navigateAsync, this.navigation, undefined, {
				back: true,
			});
		}
		return this;
	}

	/**
	 * Renders the provided view using specified placement options
	 *
	 * @summary This method can be used to render any view object to the screen (or in-memory test output, when called from a test function), such as a {@link UICell} or {@link ComponentView} instance.
	 *
	 * @param view The view object to be rendered
	 * @param place View placement options, as an object of type {@link RenderContext.PlacementOptions}; defaults to page placement
	 * @returns A new {@link RenderContext.ViewController} instance, which can be used to control the rendered view
	 * @error This method throws an error if the renderer hasn't been initialized yet.
	 */
	render(view: View, place?: RenderContext.PlacementOptions) {
		if (!this.renderer) throw err(ERROR.Render_Unavailable);
		return this.renderer.render(view, place || { mode: "page" });
	}

	/**
	 * Displays an alert dialog with the specified content and a single dismiss button
	 * - Use {@link fmt} to translate content if necessary; this method doesn't localize strings by default.
	 * @param config An instance of {@link MessageDialogOptions}; or a callback function to set options for the dialog to be displayed; or one or more messages to be displayed
	 * @param buttonText The text for the dismiss button (if a single message was provided)
	 * @returns A promise that resolves when the dialog is closed.
	 * @error This method throws an error if the modal dialog controller can't be initialized (i.e. there's no modal factory or alert dialog builder).
	 */
	async showAlertDialogAsync(
		config:
			| MessageDialogOptions
			| DeferredString
			| string
			| StringConvertible[],
		buttonText?: StringConvertible,
	) {
		let controller = this.renderer?.modalFactory.buildAlertDialog?.(
			config instanceof MessageDialogOptions
				? config
				: new MessageDialogOptions(config, buttonText),
		);
		if (!controller) throw err(ERROR.Render_Unavailable);
		await controller.showAsync();
	}

	/**
	 * Displays a confirmation dialog with the specified text and buttons
	 * - Use {@link fmt} to translate content if necessary; this method doesn't localize strings by default.
	 * @param config An instance of {@link MessageDialogOptions}; or a callback function to set options for the dialog to be displayed; or one or more messages to be displayed
	 * @param confirmText The text for the confirm button (if a single message was provided instead of an options object or callback)
	 * @param cancelText The text for the cancel button (if a single message was provided instead of an options object or callback)
	 * @param otherText The text for an alternative button (if a single message was provided instead of an options object or callback)
	 * @returns A promise that resolves to true if the confirm button was clicked, false if cancelled, or the number 0 if the alternative option is selected (if any).
	 * @error This method throws an error if the modal dialog controller can't be initialized (i.e. there's no modal factory or confirm dialog builder).
	 */
	async showConfirmDialogAsync(
		config:
			| MessageDialogOptions
			| DeferredString
			| string
			| StringConvertible[],
		confirmText?: StringConvertible,
		cancelText?: StringConvertible,
		otherText?: StringConvertible,
	) {
		let controller = this.renderer?.modalFactory.buildConfirmDialog?.(
			config instanceof MessageDialogOptions
				? config
				: new MessageDialogOptions(config, confirmText, cancelText, otherText),
		);
		if (!controller) throw err(ERROR.Render_Unavailable);
		let result = await controller.showAsync();
		return result.confirmed ? true : result.other ? 0 : false;
	}

	/** Displays a context/dropdown menu with the provided list of items
	 *
	 * @summary
	 * This method displays a modal menu, using the specified options (or options that are set in a configuration function). The menu is positioned near a particular UI element, an instance of {@link UIElement}, e.g. a button that was clicked by the user.
	 *
	 * The `value` property of the chosen menu item, if any, is returned asynchronously. If the menu was dismissed, the returned promise is resolved to `undefined`.
	 *
	 * @note Use {@link fmt} to translate item text if necessary; this method doesn't localize strings by default.
	 *
	 * @param config An instance of {@link ModalMenuOptions}, including a list of menu items; or a callback function to set options for the menu to be displayed
	 * @param ref The related UI element
	 * @returns A promise that resolves to the selected item value, if any
	 * @error This method throws an error if the modal menu controller can't be initialized (i.e. there's no modal factory or menu builder).
	 */
	async showModalMenuAsync(
		config: ModalMenuOptions | ((opts: ModalMenuOptions) => void),
		ref?: { lastRenderOutput?: RenderContext.Output },
	) {
		let options =
			config instanceof ModalMenuOptions ? config : new ModalMenuOptions();
		if (typeof config === "function") config(options);
		let controller = this.renderer?.modalFactory.buildMenu?.(options);
		if (!controller) throw err(ERROR.Render_Unavailable);
		let result = await controller.showAsync({
			ref: ref && ref.lastRenderOutput,
		});
		return result && result.value;
	}

	/**
	 * Runs an animation on the provided view output element
	 *
	 * @summary This method passes a renderer-specific transformation object to an asynchronous transformer, which may use methods on the transform object to animate a view.
	 * @see {@link RenderContext.OutputTransformer}
	 *
	 * @param ref The UI element to be animated
	 * @param animation An animation transformer (see {@link UIAnimation})
	 * @error This method throws an error if the renderer hasn't been initialized yet.
	 */
	async animateAsync(
		ref: { lastRenderOutput?: RenderContext.Output },
		animation?: RenderContext.OutputTransformer,
	) {
		if (!this.renderer) throw err(ERROR.Render_Unavailable);
		let out = ref.lastRenderOutput;
		if (out && animation) {
			await this.renderer.animateAsync(out, animation);
		}
	}

	/**
	 * Adds a hot-reload handler for the provided module handle, to update instances of a particular activity
	 * - Where supported, hot-reloading the provided module will update instances of the specified activity: updating methods (but not properties), and re-rendering its view.
	 * - If hot-reloading isn't supported, e.g. if the application is compiled in production mode, this method does nothing.
	 * @param handle The module that contains the activity to be hot-reloaded, or hot-reload handle (e.g. `import.meta.hot`, depending on build system)
	 * @param ActivityClass The activity that should be updated and re-rendered
	 */
	hotReload(handle: any, ActivityClass: new (...args: any[]) => Activity) {
		// if this method is not overridden (yet), try again after a while
		let f = this.hotReload;
		Promise.resolve().then(() => {
			if (this.hotReload !== f) this.hotReload(handle, ActivityClass);
		});
	}

	/**
	 * Re-renders output, and relocates existing mounted view output if needed
	 * - Use this method to force a full re-render of all output, e.g. when the color theme has been updated, or when the current locale/language changes after some views have already been rendered.
	 */
	remount() {
		this.renderer?.remount();
	}
}
