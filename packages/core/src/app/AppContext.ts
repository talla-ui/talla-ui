import {
	ConfigOptions,
	LazyString,
	ManagedObject,
	StringConvertible,
} from "../base/index.js";
import { ERROR, err, safeCall, setErrorHandler } from "../errors.js";
import { UITheme } from "../ui/UITheme.js";
import { Activity } from "./Activity.js";
import { ActivityContext } from "./ActivityContext.js";
import { LocalData } from "./LocalData.js";
import type { I18nProvider } from "./I18nProvider.js";
import { LogWriter } from "./LogWriter.js";
import { MessageDialogOptions } from "./MessageDialogOptions.js";
import { NavigationContext } from "./NavigationContext.js";
import { NavigationTarget } from "./NavigationTarget.js";
import { RenderContext } from "./RenderContext.js";
import { Scheduler } from "./Scheduler.js";
import type { View } from "./View.js";
import { $_app_bind_label } from "./app_binding.js";

/** @internal Counter that blocks multiple invocations of AppContext constructor */
let once = 0;

/**
 * A singleton class that represents the global application state
 *
 * @description
 * An instance of this class is available as {@link app} during the entire lifecycle of the application. Use that to access all properties and methods of AppContext, e.g. `app.theme` and `app.addActivity(...)`.
 *
 * @docgen {hideconstructor}
 */
export class AppContext extends ManagedObject {
	/**
	 * Sets a global unhandled error handler
	 * - This method _replaces_ the current handler, if any, and is not cleared by {@link AppContext.clear()}.
	 * - The default error handler logs all errors using {@link LogWriter.error()} (i.e. `app.log.error(...)`). Consider using a log sink instead of changing this behavior — refer to {@link LogWriter.addHandler}.
	 * - In a test handler context, the global error handler is overridden to catch all unhandled errors during tests.
	 * @param f A handler function, which should accept a single error argument (with `unknown` type)
	 */
	static setErrorHandler(f: (err: unknown) => void) {
		setErrorHandler(f);
	}

	/** App constructor, do not use (refer to {@link app} instead) */
	constructor() {
		if (once++) throw Error;
		super();

		// set as root object (cannot be attached, no more bindings)
		ManagedObject.makeRoot(this);
		(this as any)[$_app_bind_label] = true;

		// set renderer property to undefined, to enable bindings
		(this as any).renderer = undefined;

		// define i18n property and handle new objects when set
		let i18n: I18nProvider | undefined;
		Object.defineProperty(this, "i18n", {
			configurable: true,
			enumerable: true,
			get() {
				return i18n;
			},
			set(v: any) {
				i18n = v;
				LazyString.setI18nInterface(i18n);
				LazyString.invalidateCache();
			},
		});

		// define theme property and remount renderer when set
		let theme: UITheme | undefined;
		Object.defineProperty(this, "theme", {
			configurable: true,
			enumerable: true,
			get() {
				return theme;
			},
			set(v: any) {
				theme = v;
				Promise.resolve().then(() => {
					if (v && this.renderer) {
						this.renderer.remount();
					}
				});
			},
		});
	}

	/**
	 * The current activity context, an instance of {@link ActivityContext}
	 * - This object contains all activity instances. Activities must be either added to this context object (using the {@link AppContext.addActivity app.addActivity()} method), or attached to a parent activity.
	 */
	readonly activities = this.attach(new ActivityContext());

	/**
	 * The current navigation context, an instance of {@link NavigationContext}
	 * - This object encapsulates the current location path, and coordinates automatic activation of activities based on their page ID.
	 * @note To navigate around the application, use the {@link AppContext.navigate app.navigate()} and {@link AppContext.goBack app.goBack()} methods, rather than calling the methods of the navigation context directly.
	 */
	navigation = new NavigationContext();

	/**
	 * The global asynchronous task scheduler, an instance of {@link Scheduler}
	 * - You can use `app.scheduler` to create and manage queues for scheduling asynchronous (background) tasks.
	 * - Refer to {@link Scheduler} for available methods of `app.scheduler`.
	 */
	scheduler = new Scheduler();

	/**
	 * The global message log writer instance, an instance of {@link LogWriter}
	 * - You can use `app.log` methods to write messages to the current application log, and add a log sink handler. If no handler is added, log messages are written to the console.
	 * - Refer to {@link LogWriter} for available methods of `app.log`.
	 */
	log = new LogWriter();

	/**
	 * Persisted key-value object data, made available as an instance of {@link LocalData}
	 * - Data is persisted in a platform-dependent way. While testing, all data is _only_ persisted during the lifetime of the test handler.
	 */
	localData = new LocalData();

	/**
	 * The current application output renderer, an instance of {@link RenderContext}
	 * - This property will be set by the platform-specific renderer package
	 */
	declare readonly renderer?: RenderContext; // (defined in constructor)

	/**
	 * The current internationalization context, an object that implements {@link I18nProvider}
	 * - You can set `app.i18n` to an object that implements {@link I18nProvider}, to change the current internationalization context.
	 * - Note that labels and other UI controls that are already rendered won't be updated automatically. If needed, use `app.renderer.remount()` to force a full re-render.
	 */
	declare i18n?: I18nProvider; // (defined in constructor)

	/**
	 * The current theme, an instance of {@link UITheme}
	 * - Instead of modifying the existing theme instance, use the {@link UITheme.clone()} method and set this property to the new instance. This will trigger an update of all rendered output automatically.
	 * @see {@link UITheme}
	 */
	declare theme?: UITheme; // (defined in constructor)

	/**
	 * Clears the state of the global application context
	 * @summary This method is used to reset the app to its initial state. It's called automatically by context initialization functions such as `useTestContext()` and `useWebContext()`, before setting up a new global application context with platform-specific details. The following actions take place:
	 * 1. The current renderer's output is cleared;
	 * 2. All activities are unlinked;
	 * 3. All scheduler queues are stopped;
	 * 4. The i18n provider is unlinked;
	 * 5. The theme is removed
	 * 6. Log sink(s) are removed;
	 */
	clear() {
		this.renderer?.clear();
		this.activities.clear();
		this.navigation.clear();
		this.scheduler.stopAll();
		this.scheduler = new Scheduler();
		this.i18n = undefined;
		this.theme = undefined;
		this.log = new LogWriter();
		return this;
	}

	/**
	 * Adds an activity to the list of root activities
	 *
	 * @summary
	 * This method adds an {@link Activity} instance to the {@link ActivityContext} (i.e. `app.activities`), activating it automatically if the current location matches {@link Activity.navigationPageId} or if the `activate` argument was set to true.
	 *
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately regardless of page ID
	 *
	 * @note You only need to add activities to the application context if they should be activated based on their page ID, or if they're not attached to a parent activity. If an activity is attached to a parent activity you will need to activate it manually (e.g. for detail pages or dialog activities).
	 */
	addActivity(activity: Activity, activate?: boolean) {
		this.activities.add(activity);
		if (activate) safeCall(activity.activateAsync, activity);
		return this;
	}

	/**
	 * Navigates to the specified path asynchronously
	 * - The behavior of this method is platform dependent. It uses {@link NavigationContext.navigateAsync()} to navigate to the specified path, which may in turn activate or deactivate activities using the {@link Activity.navigationPageId} property.
	 * - The target location can be a {@link NavigationTarget} instance, an object that provides a navigation target (i.e. an {@link Activity}), or a URL-like path (i.e. `pageId/detail...`).
	 * @param target The target location
	 * @param mode The navigation mode, refer to {@link NavigationContext.navigateAsync()}
	 *
	 * @example
	 * // In a web application, navigate to the /foo URL
	 * app.navigate("foo");
	 */
	navigate(
		target:
			| string
			| LazyString
			| NavigationTarget
			| { getNavigationTarget(): NavigationTarget },
		mode?: NavigationContext.NavigationMode,
	) {
		safeCall(
			this.navigation.navigateAsync,
			this.navigation,
			new NavigationTarget(target),
			mode,
		);
		return this;
	}

	/**
	 * Navigates back to the previous location in the location history stack
	 * - The behavior of this method is platform dependent. It uses {@link NavigationContext.navigateAsync()} to navigate back within navigation history, if possible.
	 */
	goBack() {
		safeCall(this.navigation.navigateAsync, this.navigation, undefined, {
			back: true,
		});
		return this;
	}

	/**
	 * Renders the provided view using specified placement options
	 *
	 * @summary This method can be used to render any view object to the screen (or in-memory test output, when called from a test function), such as a {@link UICell} or {@link ViewComposite} instance.
	 *
	 * @param view The view object to be rendered
	 * @param place View placement options, as an object of type {@link RenderContext.PlacementOptions}
	 * @returns A new {@link RenderContext.ViewController} instance, which can be used to control the rendered view
	 * @error This method throws an error if the renderer hasn't been initialized yet.
	 */
	render(view: View, place?: RenderContext.PlacementOptions) {
		if (!this.renderer) throw err(ERROR.Render_Unavailable);
		return new RenderContext.ViewController(
			this.renderer.getRenderCallback(),
		).render(view, undefined, place);
	}

	/**
	 * Displays an alert dialog with the specified content and a single dismiss button
	 * - Use {@link strf} to translate content if necessary; this method doesn't localize strings by default.
	 * @param config An instance of {@link MessageDialogOptions}; or a callback function to set options for the dialog to be displayed; or one or more messages to be displayed
	 * @param buttonLabel The label for the dismiss button (if a single message was provided)
	 * @returns A promise that resolves when the dialog is closed.
	 * @error This method throws an error if the theme modal dialog controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal dialog views).
	 */
	async showAlertDialogAsync(
		config:
			| ConfigOptions.Arg<MessageDialogOptions>
			| LazyString
			| string
			| StringConvertible[],
		buttonLabel?: StringConvertible,
	) {
		let controller = this.theme?.modalFactory?.buildAlertDialog?.(
			config instanceof MessageDialogOptions || typeof config === "function"
				? MessageDialogOptions.init(config)
				: new MessageDialogOptions(config, buttonLabel),
		);
		if (!controller) throw err(ERROR.Render_NoModal);
		await controller.showAsync();
	}

	/**
	 * Displays a confirmation dialog with the specified text and buttons
	 * - Use {@link strf} to translate content if necessary; this method doesn't localize strings by default.
	 * @param config An instance of {@link MessageDialogOptions}; or a callback function to set options for the dialog to be displayed; or one or more messages to be displayed
	 * @param confirmLabel The label for the confirm button (if a single message was provided instead of an options object or callback)
	 * @param cancelLabel The label for the cancel button (if a single message was provided instead of an options object or callback)
	 * @returns A promise that resolves to true if the confirm button was clicked, false if cancelled, or the number 0 if the alternative option is selected (if any).
	 * @error This method throws an error if the theme modal dialog controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal dialog views).
	 */
	async showConfirmDialogAsync(
		config:
			| ConfigOptions.Arg<MessageDialogOptions>
			| LazyString
			| string
			| StringConvertible[],
		confirmLabel?: StringConvertible,
		cancelLabel?: StringConvertible,
	) {
		let controller = this.theme?.modalFactory?.buildConfirmDialog?.(
			config instanceof MessageDialogOptions || typeof config === "function"
				? MessageDialogOptions.init(config)
				: new MessageDialogOptions(config, confirmLabel, cancelLabel),
		);
		if (!controller) throw err(ERROR.Render_NoModal);
		let result = await controller.showAsync();
		return result.confirmed ? true : result.other ? 0 : false;
	}

	/** Displays a context/dropdown menu with the provided list of items
	 *
	 * @summary
	 * This method displays a modal menu, using the specified options (or options that are set in a configuration function). The menu is positioned near a particular UI component, an instance of {@link UIComponent}, e.g. a button that was clicked by the user.
	 *
	 * The `key` value of the chosen menu item, if any, is returned asynchronously. If the menu was dismissed, the returned promise is resolved to `undefined`.
	 *
	 * @note Use {@link strf} to translate item labels if necessary; this method doesn't localize strings by default.
	 *
	 * @param config An instance of {@link UITheme.MenuOptions}, including a list of menu items; or a callback function to set options for the menu to be displayed
	 * @param ref The related UI component
	 * @returns A promise that resolves to the selected item key, if any
	 * @error This method throws an error if the theme modal menu controller can't be initialized (i.e. there's no current theme, or the theme doesn't support modal menu views).
	 */
	async showModalMenuAsync(
		config: ConfigOptions.Arg<UITheme.MenuOptions>,
		ref?: { lastRenderOutput?: RenderContext.Output },
	) {
		let controller = this.theme?.modalFactory?.buildMenu?.(
			UITheme.MenuOptions.init(config),
		);
		if (!controller) throw err(ERROR.Render_NoModal);
		let result = await controller.showAsync({
			ref: ref && ref.lastRenderOutput,
		});
		return result && result.key;
	}

	/**
	 * Runs an animation on the provided view output element
	 *
	 * @summary This method passes a renderer-specific transformation object to an asynchronous transformer, which may use methods on the transform object to animate a view.
	 * @see {@link RenderContext.OutputTransform}
	 * @see {@link RenderContext.OutputTransformer}
	 * @see {@link UITheme.animations}
	 *
	 * @param ref The UI component to be animated
	 * @param transformer An asynchronous function that performs transformations, or a named animation from the current theme
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
}
