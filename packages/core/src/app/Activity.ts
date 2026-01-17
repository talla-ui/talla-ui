import type { StringConvertible } from "@talla-ui/util";
import { ERROR, err, safeCall } from "../errors.js";
import { Binding, ObservableEvent, ObservableObject } from "../object/index.js";
import { $_origin } from "../object/object_util.js";
import { ActivityRouter } from "./ActivityRouter.js";
import { AppContext } from "./AppContext.js";
import type { NavigationContext } from "./NavigationContext.js";
import type { RenderContext } from "./RenderContext.js";
import { AsyncTaskQueue } from "./Scheduler.js";
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

/** Global list of activity instances for (old) activity class, for HMR */
const _hotInstances = new WeakMap<typeof Activity, Set<Activity>>();

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
 * This class provides infrastructure for path-based routing, based on the application's navigation path (such as the browser's current URL), together with {@link NavigationContext} and {@link ActivityRouter}. However, activities can also be activated and deactivated manually.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur. Override {@link afterActive} for initialization (receiving an AbortSignal for cancellation), and {@link afterInactive} for cleanup. Use {@link canDeactivateAsync} as a navigation guard to prevent deactivation when there are unsaved changes.
 *
 * The static {@link Activity.View} property must be set to a function that returns a view builder, which is used to create the view object when the activity becomes active. This function is called only once for each activity, as well as when the activity is reloaded using Hot Module Replacement (HMR).
 *
 * As soon as the activity is activated and a view is created, the view is rendered. The view is unlinked when the activity is deactivated, and the {@link View} property is set to undefined. To change rendering options or disable automatic rendering, use the {@link setRenderMode()} method.
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
	/** @internal Update prototype for given class with newer prototype, and rebuild view */
	static _$hotReload(
		Old: undefined | typeof Activity,
		Updated: typeof Activity,
	) {
		// add new set of instances for the (updated) activity
		_hotInstances.set(Updated, (Updated.prototype._hotInstances = new Set()));

		// update old class, if any
		if (Old) {
			// check if need to recurse for previous versions
			if (Object.prototype.hasOwnProperty.call(Old.prototype, "_OrigClass")) {
				this._$hotReload(Old.prototype._OrigClass, Updated);
			}

			// run async to allow module to complete if needed
			safeCall(async () => {
				await Promise.resolve();

				// update prototype with new properties (methods)
				let desc = Object.getOwnPropertyDescriptors(Updated.prototype) as any;
				for (let p in desc) Object.defineProperty(Old.prototype, p, desc[p]);

				// update view function on old class to create new views
				Old.View = Updated.View;

				// keep a reference to the old class to be able to recurse next time
				Updated.prototype._OrigClass = Old;
				if (Updated.prototype instanceof Activity) {
					let instances = _hotInstances.get(Old);
					if (instances) {
						for (let activity of instances) {
							if (activity.isUnlinked() || !activity._active) continue;
							activity._showView(true);
						}
					}
				}
			});
		}
	}

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
	 * The path associated with this activity, to match the navigation path
	 * - This property is used by the default implementation of {@link matchNavigationPath()}, which returns true only if the current path matches exactly. This behavior can be changed (e.g. to match sub paths) by overriding that method.
	 * - This property is also used for navigating to relative paths starting with `./`, in {@link onNavigate()} when responding to `Navigate` events from buttons that have a {@link UIButton.navigateTo} property set.
	 * - Do not include a leading or trailing slash in the path. To match the root path (`/`), set this property to an empty string.
	 */
	navigationPath?: string = undefined;

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

		// create view and run handler asynchronously, to allow processing or redirection
		let signal = this._abortController.signal;
		AppContext.getInstance().schedule(async () => {
			if (signal.aborted) return;

			// HMR tracking (async to allow hotReload setup to complete first)
			if (this._hotInstances && !this._isHot) {
				this._isHot = true;
				this._hotInstances.add(this);
				this.listen({ unlinked: () => this._hotInstances!.delete(this) });
			}

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
	 * - The view has been created before this method is called (if a View function is defined).
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
	 * A method that's called as a navigation guard, should return false if the activity should not be deactivated.
	 * - Override this method to prevent navigation when there are unsaved changes. Return (a promise that resolves to) false to prevent navigation, or true to allow it.
	 * @returns A promise that resolves to true if the activity can be deactivated
	 */
	async canDeactivateAsync(): Promise<boolean> {
		return true;
	}

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
	 * Set rendering mode and additional options
	 * - By default, the activity view is rendered using the `page` rendering mode, as soon as the activity is activated. The mode can be changed using this method, or rendering can be disabled by specifying the `none` mode.
	 * - Use the special `dialog` mode to render the view within a dialog as defined by the current modal factory.
	 * - Additional options may be specified, including page/screen background color and transform animations.
	 * @param mode The selected rendering mode
	 * @param options Additional placement options, if any
	 * @see {@link RenderContext.PlacementOptions}
	 * @see {@link RenderContext.modalFactory}
	 */
	setRenderMode(
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

		// assert that view makes sense
		if (view[$_origin] !== this) {
			throw err(ERROR.View_NotAttached);
		}
		let renderer = AppContext.getInstance().renderer;
		if (!renderer) throw err(ERROR.Render_Unavailable);

		// render view using modal dialog controller if needed
		let renderOptions = this._renderOptions;
		if (this._renderDialog) {
			let controller = renderer.modalFactory.buildDialog?.(view);
			if (!controller) throw err(ERROR.Render_Unavailable);
			controller.show(renderOptions);
			return this;
		}

		// render view normally if placed
		if (renderOptions.mode !== "none") {
			renderer.render(view, renderOptions);
		}
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
	 * Checks if the provided path should activate this activity
	 * - By default, this method only checks for exact matches with the {@link navigationPath} property.
	 * - To implement other types of routing, override this method to consider further conditions based on the specified path.
	 * - When overriding this method, you can return a callback function that will be called after the activity itself is activated. This may be an async function, and is typically used to activate nested 'sub activities', adding them to an attached {@link ActivityRouter} instance.
	 * @param path The (remainder of the) path to check
	 * @returns True if the path should activate this activity, false if not; or a function to activate this activity and call the provided function afterwards
	 * @see {@link ActivityRouter}
	 * @see {@link NavigationContext}
	 */
	matchNavigationPath(path: string): void | boolean | (() => void) {
		return path === this.navigationPath;
	}

	/**
	 * Handles navigation to a provided path, from the current activity
	 * - This method is called automatically by the {@link onNavigate} event handler when a view object emits the `Navigate` event while this activity is active.
	 * - The default implementation directly calls {@link NavigationContext.navigateAsync()}. Override this method to handle navigation differently, e.g. to _replace_ the current path for detail view activities.
	 */
	protected async navigateAsync(target: StringConvertible) {
		await AppContext.getInstance().navigation?.navigateAsync(target);
	}

	/**
	 * Handles a `Navigate` event emitted by the current view
	 * - This method is called when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - This method calls {@link navigateAsync()} in turn. Override that method rather than this one to handle navigation differently.
	 * - If the target is a relative path (starting with a dot), it's combined with this activity's own {@link navigationPath}. If this activity has no navigation path, the event is propagated to the parent activity.
	 */
	protected onNavigate(
		e: ObservableEvent<
			ObservableObject & { getNavigationTarget?: () => StringConvertible }
		>,
	) {
		if (typeof e.source.getNavigationTarget !== "function") return false;
		let target = e.source.getNavigationTarget();
		if (target == null) return false;

		// normalize target path
		let path = String(target);
		if (path.startsWith(".")) {
			if (this.navigationPath == null) return false;
			path = this.navigationPath + "/" + path + "/";
		}
		path = path
			.replace(/\/+/g, "/") // remove multiple slashes
			.replace(/^\.\/|\/\.\//g, "/") // change foo/./bar => foo/bar
			.replace(/[^\/]*[^\/\.]\/\.\.\//g, "/") // change foo/bar/../baz => foo/baz
			.replace(/^\/+|\/+$/, ""); // remove leading/trailing slash

		// navigate to normalized path using own method
		return this.navigateAsync(path);
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

	/**
	 * Creates an activity router that's enabled while this activity is active
	 * - Use this method to create an {@link ActivityRouter} instance to manage a set of sub-activities that are only active while the parent activity is active.
	 * - The router is disabled when the activity becomes inactive, and re-enabled when the activity becomes active again.
	 * - When the router is disabled, any active activities in the router are deactivated.
	 * @returns A new {@link ActivityRouter} instance
	 */
	protected createActiveRouter() {
		let result = this.attach(new ActivityRouter());
		this.listen((e) => {
			if (e.name === "Active") {
				result.disableMatch(false);
			} else if (e.name === "Inactive") {
				result.disableMatch();
				result.toArray().forEach((a) => a.deactivate());
			}
		});
		return result;
	}

	/**
	 * Creates a task queue that's started, paused, resumed, and stopped automatically based on the state of this activity
	 * - Use this method to create an {@link AsyncTaskQueue} instance to run background tasks only while the activity is active, e.g. when the user is viewing a particular screen of the application.
	 * @param config An {@link AsyncTaskQueue.Options} object or configuration function (optional)
	 * @returns A new {@link AsyncTaskQueue} instance
	 * @error This method throws an error if the activity has been unlinked.
	 */
	protected createActiveTaskQueue(
		config?:
			| Partial<AsyncTaskQueue.Options>
			| ((options: AsyncTaskQueue.Options) => void),
	) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// create queue with given options, pause if activity is not active
		let queue = AppContext.getInstance().scheduler.createQueue(
			Symbol("ActiveTaskQueue"),
			false,
			config,
		);
		if (!this._active) queue.pause();

		// listen for active/inactive events to pause/resume queue
		this.listen({
			handler(_, event) {
				if (event.name === "Active") queue.resume();
				else if (event.name === "Inactive") queue.pause();
			},
			unlinked() {
				queue.stop();
			},
		});
		return queue;
	}

	/**
	 * Creates an active state object, an object that's updated asynchronously while the activity is active
	 * - The state object is updated using the provided update function, which is called with the current values of the observed objects or bindings.
	 * - Nested state objects are automatically unlinked when the property referencing them is overwritten.
	 * - Additional objects or bindings can be observed, updating the same state object, using the `watch` method on the resulting state object.
	 * @param observe An array of objects, or strings to create bindings to observe
	 * @param update A function that's called with the current values of the observed objects or bindings, and should return updated state object property values
	 * @returns The resulting active state object
	 */
	protected createActiveState<T extends Record<string, any>>(
		observe: (string | Binding | ObservableObject)[],
		update: (...args: any[]) => T | Promise<T>,
	): Activity.ActiveStateObject & Partial<T> {
		let result = new Activity.ActiveStateObject(
			this,
			this.createActiveTaskQueue(),
		);
		return this.attach(result.watch(observe, update));
	}

	/** @internal Activation state */
	private _active = false;

	/** @internal Abort controller for current activation */
	private _abortController = new _AbortController();

	/** @internal Render placement options, modified using setRenderMode */
	private _renderOptions: RenderContext.PlacementOptions = { mode: "page" };

	/** @internal True if the view should be rendered within a dialog */
	private _renderDialog?: boolean;

	/** @internal Original class that's been updated using hot reload (set on prototype) */
	declare private _OrigClass?: typeof Activity;

	/** @internal Set of instances, if hot reload has been enabled for this activity (set on prototype) */
	declare private _hotInstances?: Set<Activity>;

	/** @internal Set to true if a listener was added to remove this instance from the hot-reloaded list */
	private _isHot?: boolean;
}

export namespace Activity {
	/**
	 * An active state object, the result of {@link Activity.createActiveState()}
	 * @docgen {hideconstructor}
	 */
	export class ActiveStateObject extends ObservableObject {
		/** Create a new active state object for the specified activity */
		constructor(
			private _activity: Activity,
			private _queue: AsyncTaskQueue,
		) {
			super();
		}

		/** Observe additional objects or bindings, updating the same state object */
		watch<T extends Record<string, any>>(
			observe: (string | Binding | ObservableObject)[],
			update: (...args: any[]) => T | Promise<T>,
		): this & Partial<T> {
			// start observing given objects or bindings, async
			let values: any[] = [];
			let scheduled = false;
			const schedule = () => {
				scheduled = true;
				this._queue.add(async () => {
					if (this.isUnlinked()) return;
					scheduled = false;
					this._update(await update(...values));
				});
			};
			this._queue.add(() =>
				observe.forEach((o, i) =>
					this.observe(
						typeof o === "string" ? new Binding(o) : (o as any),
						(value) => {
							values[i] = value;
							if (!scheduled) schedule();
						},
					),
				),
			);
			return this as any;
		}

		/** Update this object using the given data */
		private _update(data: any) {
			let added = false;
			for (let key in data) {
				let old = (this as any)[key];
				if (old !== data[key]) {
					if (!(key in this)) added = true;
					(this as any)[key] = data[key];
					if (old?.watch?.activity === this._activity) {
						// unlink overwritten state object
						old.unlink();
					}
				}
			}
			if (added) this.emitChange();
		}
	}
}
