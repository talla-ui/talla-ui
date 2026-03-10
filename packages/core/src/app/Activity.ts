import type { StringConvertible } from "@talla-ui/util";
import { ERROR, err, safeCall } from "../errors.js";
import { Binding, ObservableEvent, ObservableObject } from "../object/index.js";
import { $_origin } from "../object/object_util.js";
import { AppContext } from "./AppContext.js";
import type { RenderContext } from "./RenderContext.js";
import { View } from "./View.js";
import type { ViewBuilder } from "./ViewBuilder.js";

// Minimal AbortController stub for pre-2018 browsers:
class _AbortSignalStub {
	aborted = false;
	addEventListener(type: string, handler: () => void) {
		if (type === "abort") this._handlers.push(handler);
	}
	_handlers: Array<() => void> = [];
}
class _AbortControllerStub {
	signal = new _AbortSignalStub();
	abort() {
		if (!this.signal.aborted) {
			this.signal.aborted = true;
			for (let h of this.signal._handlers) safeCall(h);
		}
	}
}
const _AbortController: typeof AbortController =
	typeof AbortController !== "undefined"
		? AbortController
		: (_AbortControllerStub as any);

/** A cache of activity view builders, by function */
const _viewBuilders = new WeakMap<Function, ViewBuilder>();

/** A symbol that's used to bind to the activity instance */
const $_activity = Symbol("activity");

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of an application. It represents a potential 'place' in the application, which can be activated and deactivated as the user navigates around.
 *
 * Path-based routing is managed by {@link ActivityRouter}, {@link NavigationContext}, and {@link AppContext.addRoutes()}. Alternatively, activities can be activated and deactivated manually.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur. Override {@link afterActive} for initialization (receiving an AbortSignal for cancellation), and {@link afterInactive} for cleanup.
 *
 * The static {@link Activity.View} property must be set to a function that returns a view builder, which is used to create the view object when the activity becomes active. This function is called only once for each activity, as well as when the activity is reloaded using Hot Module Replacement (HMR).
 *
 * As soon as the activity is activated and a view is created, the view is rendered. The view is unlinked when the activity is deactivated, and the `view` property is set to undefined. To change rendering options or disable automatic rendering, use the {@link setRenderMode()} method.
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   static View = MyView; // typically imported from a view file
 *
 *   // ... state, event handlers, etc.
 * }
 *
 * app.addActivity(new MyActivity(), true);
 */
export class Activity extends ObservableObject {
	/**
	 * Returns a view builder for the activity's view, to be set for each activity class
	 * - The function is called with a binding that refers to the activity instance, when the view is created.
	 * - The base implementation of this method in the Activity class does nothing. This method must be set for each activity class, typically referring to a function from a dedicated view file.
	 * - The referenced function is called only once for each activity class. Using Hot Module Replacement (HMR), the function is replaced with a new one, and the view is updated accordingly.
	 */
	protected static View?: (v: Binding) => ViewBuilder;

	/**
	 * Creates a new activity instance
	 * @see {@link AppContext.addActivity}
	 */
	constructor() {
		super();
		Object.defineProperty(this, $_activity, { value: this, enumerable: false });
	}

	/**
	 * AbortSignal for the current activation
	 * - This signal is aborted when the activity is deactivated or unlinked. Pass this signal to fetch requests, timers, or other async operations to automatically cancel them when the activity becomes inactive.
	 */
	get activeSignal(): AbortSignal {
		return this._abortController.signal;
	}

	/**
	 * A user-facing name for this activity, if any
	 * - The title string of an active activity may be displayed as the current window or document title.
	 * - This property may be set to any object that includes a `toString()` method, notably {@link DeferredString} — the result of a call to {@link fmt()}. This way, the activity title is localized automatically.
	 */
	title?: StringConvertible;

	/**
	 * The current view, if any (attached automatically)
	 * - This property is set automatically when active, using the view builder returned by the function set on the static {@link Activity.View} property.
	 * - By default, the view is rendered as a scrollable page. This can be changed using the {@link setRenderMode()} method, typically in the constructor.
	 * - The view is automatically unlinked when the activity is deactivated or unlinked itself.
	 * - Events emitted by the view are automatically delegated to the activity, see {@link delegate()}.
	 */
	view?: View = undefined;

	/**
	 * Delegates incoming events to methods of this object, notably from the attached view
	 * - This method is called automatically when an event is emitted by the current view object (except if {@link ObservableEvent.noPropagation} was set on the event; see {@link ObservableObject.attach()} which is used to set up view event delegation).
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ObservableObject.attach}
	 * @see {@link ObservableObject.EventDelegate}
	 */
	delegate(event: ObservableEvent): Promise<boolean | void> | boolean | void {
		return (this as any)["on" + event.name]?.(event);
	}

	/** Returns true if this activity is currently active */
	isActive() {
		return !this.isUnlinked() && this._active;
	}

	/**
	 * Activates the activity.
	 * - After activation, the activity's view is created automatically, and displayed if needed.
	 * - The {@link afterActive} method is called after activation for initialization (may be async).
	 * @returns This activity instance, for chaining
	 * @error This method throws an error if the activity has been unlinked or not attached.
	 */
	activate(): this {
		if (this._active) return this;
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		if (!AppContext.whence(this)) throw err(ERROR.Activity_NotAttached);

		this._abortController = new _AbortController();
		this._active = true;
		this.emitChange("Active");

		// HMR tracking, using hidden Set that's initialized in dev mode only
		if (this._$hotInstances && !this._$isHot) {
			this._$isHot = true;
			this._$hotInstances.add(this);
			this.listen({ unlinked: () => this._$hotInstances!.delete(this) });
		}

		// create view and run handler asynchronously, to allow processing or redirection
		let signal = this._abortController.signal;
		AppContext.getInstance().schedule(async () => {
			if (signal.aborted) return;
			this._showView();
			try {
				await this.afterActive(signal);
			} catch (e: any) {
				if (!this._active || e?.name === "AbortError") return;
				throw e;
			}
		});
		return this;
	}

	/**
	 * Deactivates the activity.
	 * - The activity's view is unlinked and the {@link view} property is set to undefined.
	 * - The {@link activeSignal} is aborted to cancel any pending async operations.
	 * - The {@link afterInactive} method is called after deactivation for cleanup (may be async).
	 * @returns This activity instance, for chaining
	 */
	deactivate(): this {
		if (!this._active) return this;
		this._abortController.abort();
		this._active = false;

		if (this.view) {
			this.view.unlink();
			this.view = undefined;
		}

		this.emitChange("Inactive");
		let signal = this._abortController.signal;
		AppContext.getInstance().schedule(async () => {
			// Only call if no reactivation (same signal) and not unlinked
			if (!this.isUnlinked() && this.activeSignal === signal) {
				await this.afterInactive();
			}
		});
		return this;
	}

	/**
	 * Called after activation, for initialization (may be async).
	 * - The view has been created before this method is called (if a View function is defined), but hasn't been rendered yet.
	 * - Use the signal parameter to cancel fetch requests, timers, etc. when the activity deactivates or is unlinked.
	 * - This method is not called if the activity is deactivated before the scheduler runs; check {@link activeSignal}.aborted if needed.
	 * @param signal Aborted when activity deactivates or is unlinked
	 */
	protected afterActive(signal: AbortSignal): void | Promise<void> {}

	/**
	 * Called after deactivation, for cleanup (may be async).
	 * - This method is not called if the activity is reactivated before the scheduler runs.
	 * - This method is not called if the activity is unlinked; override {@link beforeUnlink} for cleanup on unlink.
	 */
	protected afterInactive(): void | Promise<void> {}

	/**
	 * Called immediately before the activity is unlinked.
	 * - Override this method to perform cleanup when the activity is destroyed.
	 * - The {@link activeSignal} is aborted automatically to cancel any pending async operations.
	 * - Note: {@link afterInactive} is not called when the activity is unlinked.
	 */
	protected override beforeUnlink() {
		this._abortController.abort();
		this._active = false;
	}

	/**
	 * Shows a dialog activity, and returns a promise that resolves when the dialog is closed
	 *
	 * This method activates the provided activity as a dialog, and resolves the returned promise when the dialog activity is unlinked (either by itself, e.g. when the user confirms or cancels, or when the parent activity is deactivated).
	 *
	 * - The dialog activity's render mode is set to `dialog` before activation. The dialog can override this in its {@link afterActive} method (e.g. to show as a page on smaller viewports).
	 * - The dialog activity is attached to this activity, and is automatically unlinked when this activity is deactivated or unlinked.
	 * - The returned promise resolves with the (now unlinked) dialog activity, so that results can be read from its properties.
	 *
	 * @param dialog The dialog activity to show
	 * @returns A promise that resolves with the dialog activity after it has been unlinked
	 *
	 * @example
	 * // Show a dialog and handle the result
	 * let dialog = await this.showDialogAsync(new MyDialogActivity());
	 * if (dialog.confirmed) {
	 *   // ... handle confirmation
	 * }
	 */
	async showDialogAsync<T extends Activity>(dialog: T): Promise<T> {
		dialog.setRenderMode("dialog");
		this.attach(dialog);
		this.activeSignal.addEventListener("abort", () => {
			if (!dialog.isUnlinked()) dialog.unlink();
		});
		dialog.activate();
		for await (let _ of dialog.listenAsync());
		return dialog;
	}

	/**
	 * Set rendering mode and additional options
	 * - By default, the activity view is rendered using the `page` rendering mode, as soon as the activity is activated. The mode can be changed using this method, or rendering can be disabled by specifying the `none` mode.
	 * - Use the special `dialog` mode to render the view within a dialog as defined by the current modal factory.
	 * - Additional options may be specified, including the page/screen background color.
	 * @param mode The selected rendering mode
	 * @param options Additional placement options, if any
	 * @see {@link RenderContext.PlacementOptions}
	 * @see {@link RenderContext.modalFactory}
	 */
	protected setRenderMode(
		mode: RenderContext.PlacementMode | "dialog",
		options?: Partial<RenderContext.PlacementOptions>,
	) {
		if ((this._renderDialog = mode === "dialog")) {
			// for dialog mode, set mode to modal instead and keep boolean flag
			mode = "modal";
		}
		this._renderOptions = { ...options, mode };
		return this;
	}

	/** Creates and/or renders the activity's view, called automatically after activation */
	private _showView(force?: boolean) {
		let view = this.view;

		// create view and attach it
		if (!view || force) {
			let viewFunction = (this.constructor as typeof Activity).View;
			if (!viewFunction) return;
			let viewBuilder = _viewBuilders.get(viewFunction);
			if (!viewBuilder || force) {
				viewBuilder = viewFunction(new Binding($_activity));
				_viewBuilders.set(viewFunction, viewBuilder);
			}
			let newView = viewBuilder?.build();
			if (!newView || !(newView instanceof View)) throw err(ERROR.View_Invalid);
			this.view = this.attach(newView, {
				delegate: this,
				detached: (view) => {
					if (this.view === view) this.view = undefined;
				},
			});
			if (view) view.unlink();
			view = newView;
		}

		// schedule rendering (allows afterActive to set render options)
		AppContext.getInstance().schedule(() => {
			if (!this._active || this.view !== view) return;

			// assert that view makes sense
			if (view![$_origin] !== this) {
				throw err(ERROR.View_NotAttached);
			}
			let renderer = AppContext.getInstance().renderer;
			if (!renderer) throw err(ERROR.Render_Unavailable);

			// render view using modal dialog controller if needed
			let renderOptions = this._renderOptions;
			if (this._renderDialog) {
				let controller = renderer.modalFactory.buildDialog?.(view!);
				if (!controller) throw err(ERROR.Render_Unavailable);
				controller.show(renderOptions);
				return;
			}

			// render view normally if placed
			if (renderOptions.mode !== "none") {
				renderer.render(view!, renderOptions);
			}
		});
		return this;
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the activity's view itself. If an object is an instance of the provided class, it's added to the list. Views _within_ matching objects aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: new (...args: any[]) => T): T[] {
		return this.view
			? this.view instanceof type
				? [this.view]
				: this.view.findViewContent(type)
			: [];
	}

	/**
	 * Handles navigation to a provided path, from the current activity
	 * - This method is called automatically by the {@link onNavigate} event handler when a view object emits the `Navigate` event while this activity is active.
	 * - The default implementation directly calls {@link NavigationContext.navigateAsync()}. Override this method to handle navigation differently, e.g. to _replace_ the current path for detail view activities.
	 * - Relative paths (starting with `.`) are resolved against the current navigation path using {@link NavigationContext.resolve()}.
	 */
	protected async navigateAsync(target: StringConvertible) {
		let navigation = AppContext.getInstance().navigation;
		if (navigation) {
			let path = String(target);
			if (path.startsWith(".")) {
				target = navigation.resolve(path);
			}
			await navigation.navigateAsync(target);
		}
	}

	/**
	 * Handles a `Navigate` event emitted by the current view
	 * - This method is called when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - This method calls {@link navigateAsync()} in turn. Override that method rather than this one to handle navigation differently.
	 */
	protected onNavigate(
		e: ObservableEvent<
			ObservableObject & { getNavigationTarget?: () => StringConvertible }
		>,
	) {
		if (typeof e.source.getNavigationTarget !== "function") return false;
		let target = e.source.getNavigationTarget();
		if (target == null) return false;
		return this.navigateAsync(target);
	}

	/**
	 * Handles a `NavigateBack` event emitted by the current view
	 * - This method is called when a view object emits the `NavigateBack` event. This event can be used to go back in the navigation history, e.g. when a back button is clicked.
	 */
	protected onNavigateBack() {
		return AppContext.getInstance().navigation?.navigateAsync(undefined, {
			back: true,
		});
	}

	/** @internal Activation state */
	private _active = false;

	/** @internal Abort controller for current activation */
	private _abortController = new _AbortController();

	/** @internal Render placement options, modified using setRenderMode */
	private _renderOptions: RenderContext.PlacementOptions = { mode: "page" };

	/** @internal True if the view should be rendered within a dialog */
	private _renderDialog?: boolean;

	/** @internal Set of instances, if hot reload has been enabled for this activity (set on prototype by external HMR) */
	declare private _$hotInstances?: Set<Activity>;

	/** @internal Set to true if a listener was added to remove this instance from the hot-reloaded list */
	private _$isHot?: boolean;
}
