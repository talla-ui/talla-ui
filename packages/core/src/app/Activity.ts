import type { ConfigOptions, StringConvertible } from "@talla-ui/util";
import { ERROR, err, safeCall } from "../errors.js";
import { Binding, ObservableEvent, ObservableObject } from "../object/index.js";
import { $_origin } from "../object/object_util.js";
import { AppContext } from "./AppContext.js";
import { FormContext } from "./FormContext.js";
import type { NavigationContext } from "./NavigationContext.js";
import type { RenderContext } from "./RenderContext.js";
import { AsyncTaskQueue } from "./Scheduler.js";
import { View } from "./View.js";
import type { ViewBuilder } from "./ViewBuilder.js";

/** Global list of activity instances for (old) activity class, for HMR */
const _hotInstances = new WeakMap<typeof Activity, Set<Activity>>();

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of an application. It represents a potential 'place' in the application, which can be activated and deactivated when the user navigates around.
 *
 * This class provides infrastructure for path-based routing, based on the application's navigation path (such as the browser's current URL). However, activities can also be activated and deactivated manually.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur. Several methods can be overridden to add custom behavior when the activity is activated or deactivated – i.e. {@link beforeActiveAsync}, {@link afterActiveAsync}, {@link beforeInactiveAsync}, and {@link afterInactiveAsync}.
 *
 * The {@link viewBuilder()} method must be overridden to return a view builder, which is used to create the view object when the activity becomes active. This method is called only once for each activity, as well as when the activity is reloaded using Hot Module Replacement (HMR).
 *
 * As soon as the activity is activated and a view is created, the view is rendered. The view is unlinked when the activity is deactivated, and the {@link view} property is set to undefined. To change rendering options or disable automatic rendering, use the {@link setRenderMode()} method.
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   protected viewBuilder() {
 *     return view; // imported from a view file
 *   }
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
		if (Old) {
			// check if need to recurse for previous versions
			if (Object.prototype.hasOwnProperty.call(Old.prototype, "_OrigClass")) {
				this._$hotReload(Old.prototype._OrigClass, Updated);
			}

			// update prototype with new properties (methods)
			let desc = Object.getOwnPropertyDescriptors(Updated.prototype) as any;
			for (let p in desc) Object.defineProperty(Old.prototype, p, desc[p]);

			// keep a reference to the old class to be able to recurse next time
			Updated.prototype._OrigClass = Old;
		}
		_hotInstances.set(Updated, (Updated.prototype._hotInstances = new Set()));
		if (Old && Updated.prototype instanceof Activity) {
			let instances = _hotInstances.get(Old);
			if (instances) {
				for (let activity of instances) activity._showView(true);
			}
		}
	}

	/**
	 * Creates a new activity instance
	 * @note Activities must be added to the application using {@link AppContext.addActivity app.addActivity()} before they can be activated.
	 * @see {@link AppContext.addActivity}
	 */
	constructor() {
		super();
		// ...nothing else here
	}

	/**
	 * The path associated with this activity, to match the navigation path
	 * - This property is used by the {@link NavigationContext} class, but only if the activity has been added to the list of root activities using {@link AppContext.addActivity app.addActivity()}.
	 * - If the path is set to a string, the application navigation path will be matched against this value. If the specified path matches the start of the current navigation path, the {@link matchNavigationPath()} method is called to check if the activity should be activated or deactivated. This method may be overridden. By default, the activity is activated if the path matches exactly.
	 * - Do not include a leading or trailing slash in the path. To match the root path (`/`), set this property to an empty string.
	 */
	navigationPath?: string = undefined;

	/**
	 * A user-facing name of this activity, if any
	 * - The title string of an active activity may be displayed as the current window or document title.
	 * - This property may be set to any object that includes a `toString()` method, notably {@link DeferredString} — the result of a call to {@link fmt()}. This way, the activity title is localized automatically.
	 */
	title?: StringConvertible;

	/**
	 * The current view, if any (attached automatically)
	 * - This property is set automatically when active, using the view builder returned by the {@link Activity.viewBuilder()} method. By default, the view is rendered as a scrollable page. This can be changed using the {@link setRenderMode()} method.
	 * - The view is automatically unlinked when the activity is deactivated or unlinked.
	 * - Events emitted by the view are automatically delegated to the activity, see {@link delegate()}.
	 */
	view?: View = undefined;

	/**
	 * Default form context used with input elements, if any
	 * - This property defaults to undefined, and needs to be initialized (e.g. in the constructor) to an instance of {@link FormContext} for input elements to be bound automatically.
	 */
	form?: FormContext = undefined;

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
		return !this.isUnlinked() && this._activation.active;
	}

	/** Returns true if this activity is inactive but currently activating */
	isActivating() {
		return this._activation.activating;
	}

	/** Returns true if this activity is active but currently inactivating */
	isDeactivating() {
		return this._activation.deactivating;
	}

	/**
	 * Activates the activity asynchronously
	 * - If the activity is currently transitioning between active and inactive states, the transition will be allowed to finish before the activity is activated.
	 * - After activation, the activity's view is (re-) created automatically, and displayed if needed.
	 * @error This method throws an error if the activity has been unlinked.
	 */
	async activateAsync() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// set active asynchronously and run beforeActiveAsync
		await this._activation.waitAndSetAsync(
			true,
			() => {
				if (!AppContext.whence(this)) throw err(ERROR.Activity_NotAttached);
				if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
				return this.beforeActiveAsync();
			},
			async () => {
				if (this.isUnlinked()) return;
				if (this._hotInstances && !this._isHot) {
					this._isHot = true;
					this._hotInstances.add(this);
					this.listen({
						unlinked: () => {
							this._hotInstances!.delete(this);
						},
					});
				}
				AppContext.getInstance().schedule(async () => {
					// render view async to allow any processing to catch up
					this._showView();
				});
				this.emitChange("Active");
				await this.afterActiveAsync();
			},
		);
		return this;
	}

	/**
	 * Deactivates the activity asynchronously
	 * - If the activity is currently transitioning between active and inactive states, the transition will be allowed to finish before the activity is deactivated.
	 * - Before deactivation, the activity's {@link Activity.view view} property is set to undefined, unlinking the current view object, if any.
	 * @error This method throws an error if the activity has been unlinked.
	 */
	async deactivateAsync() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// set inactive asynchronously and run beforeInactiveAsync
		await this._activation.waitAndSetAsync(
			false,
			() => {
				if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
				if (this.view) {
					this.view.unlink();
					this.view = undefined;
				}
				return this.beforeInactiveAsync();
			},
			() => {
				this.emitChange("Inactive");
				return this.afterInactiveAsync();
			},
		);
		return this;
	}

	/** A method that's called and awaited before the activity is activated, to be overridden if needed */
	protected async beforeActiveAsync() {}

	/** A method that's called and awaited after the activity is activated, to be overridden if needed */
	protected async afterActiveAsync() {}

	/** A method that's called and awaited before the activity is deactivated, to be overridden if needed */
	protected async beforeInactiveAsync() {}

	/** A method that's called and awaited after the activity is deactivated, to be overridden if needed */
	protected async afterInactiveAsync() {}

	/**
	 * Returns a view builder for the activity's view, to be overridden
	 * - The base implementation of this method in the Activity class does nothing. This method must be overridden to return a view builder, which is used to create the view object when the activity becomes active.
	 * - This method is called only once for each activity, as well as when the activity is reloaded using Hot Module Replacement (HMR).
	 */
	protected viewBuilder(): ViewBuilder | undefined | void {
		// nothing here
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
		if (!this.isActive()) return;
		let view = this.view;

		// create view and attach it
		if (!view || force) {
			let builder =
				(!force && this._viewBuilder) || this.viewBuilder() || undefined;
			let newView = builder?.create();
			if (!newView) return;
			if (!(newView instanceof View)) throw err(ERROR.View_Invalid);
			this._viewBuilder = builder;
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
	 * Checks if the provided path (remainder) should activate this activity
	 * - This method is called automatically by {@link NavigationContext} to check if the activity should be activated, if the activity's {@link navigationPath} already matches the first part of the current navigation path. The argument is the remainder of the path after the activity's navigation path, without any leading or training slash.
	 * - If this method returns false, the activity is (or stays) deactivated. If the result is true, the activity is (or stays) activated, and emits a 'PathMatch' event.
	 * - If the method returns a different activity instance, that activity is attached, and activated _as well_. The new activity must not be attached yet, and must not be unlinked. It will be unlinked automatically when this activity is deactivated or unlinked itself, or when the next 'PathMatch' event is emitted.
	 * - The default implementation only returns true if the remainder is empty, i.e. if the navigation path matches exactly.
	 * - Override this method to allow the activity to be activated for sub paths, e.g. if the {@link navigationPath} is `foo`, then the activity may return true, or a sub activity instance to activate this activity.
	 * @param remainder The remainder of the path to check (after the activity's navigation path)
	 * @returns True if the path should activate this activity, false if not; or a different (sub) activity instance to activate _as well_ as this activity.
	 */
	matchNavigationPath(remainder: string): void | boolean | Activity {
		// by default, only activate on exact match
		return !remainder;
	}

	/**
	 * Attaches and activates another activity, as a sub activity
	 * @summary This method attaches the provided activity and activates it. The provided activity is automatically unlinked when this activity is deactivated or unlinked itself, to prevent it from outlasting the current activity.
	 * @param activity The activity to attach and activate
	 * @param unlinkOnPathMatch If true, the activity will also be unlinked when the {@link matchNavigationPath()} method returns true, or a different activity instance (i.e. showing a different sub activity).
	 * @returns A promise that resolves to the provided activity after activation
	 * @error This method throws an error if either activity has been unlinked.
	 *
	 * @example
	 * class MyActivity extends Activity {
	 *   protected async onSomeEvent() {
	 *     // show another activity by attaching and activating it (e.g. a dialog)
	 *     let other = await this.attachActivityAsync(new OtherActivity());
	 *
	 *     // now listen for some event, for example:
	 *     for await (let e of other.listenAsync()) {
	 *       if (e.name === "Confirmed") {
	 *         // ...
	 *       }
	 *     }
	 *     // (here, the other activity is unlinked)
	 *   }
	 */
	async attachActivityAsync<TActivity extends Activity>(
		activity: TActivity,
		unlinkOnPathMatch?: boolean,
	) {
		if (this.isUnlinked() || !activity || activity.isUnlinked()) {
			throw err(ERROR.Object_Unlinked);
		}

		// attach the activity, then listen for deactivation to unlink
		this.attach(activity);
		this.listen({
			init(_, stop) {
				activity.listen({ unlinked: stop });
			},
			handler(_, event) {
				if (
					event.name === "Inactive" ||
					(unlinkOnPathMatch && event.name === "PathMatch")
				) {
					activity.unlink();
				}
			},
		});

		// activate the activity and return it
		return activity.activateAsync();
	}

	/**
	 * Handles navigation to a provided path, from the current activity
	 * - This method is called automatically by {@link onNavigate} when a view object emits the `Navigate` event while this activity is active.
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
	 * Creates a task queue that's started, paused, resumed, and stopped automatically based on the state of this activity
	 * - Use this method to create an {@link AsyncTaskQueue} instance to run background tasks only while the activity is active, e.g. when the user is viewing a particular screen of the application.
	 * @param config An {@link AsyncTaskQueue.Options} object or configuration function (optional)
	 * @returns A new {@link AsyncTaskQueue} instance
	 * @error This method throws an error if the activity has been unlinked.
	 */
	protected createActiveTaskQueue(
		config?: ConfigOptions.Arg<AsyncTaskQueue.Options>,
	) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// create queue with given options, pause if activity is not active
		let queue = new AsyncTaskQueue(
			Symbol("ActiveTaskQueue"),
			AsyncTaskQueue.Options.init(config),
		);
		if (!this._activation.active) queue.pause();

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
	 * @param observe An array of objects or bindings to observe
	 * @param update A function that's called with the current values of the observed objects or bindings, and should return updated state object property values
	 * @returns The resulting active state object
	 */
	protected createActiveState<T extends Record<string, any>>(
		observe: (ObservableObject | Binding)[],
		update: (...args: any[]) => T | Promise<T>,
	): Activity.ActiveStateObject & Partial<T> {
		const activity = this;
		const queue = this.createActiveTaskQueue();
		const object = new ObservableObject() as any;
		(object.watch = watch as any).activity = this;
		function watch(
			observe: (ObservableObject | Binding)[],
			update: (...args: any[]) => any,
		) {
			// start observing given objects or bindings, async
			let scheduled = false;
			let values: any[] = [];
			queue.add(async () =>
				observe.forEach((o, i) =>
					object.observe(o as any, (value: any) => {
						values[i] = value;

						// run update async and add properties to object
						if (scheduled) return;
						scheduled = true;
						queue.add(async () => {
							if (object.isUnlinked()) return;
							scheduled = false;
							let data = await update(...values);
							let added = false;
							for (let key in data) {
								let old = object[key];
								if (old !== data[key]) {
									if (!(key in object)) added = true;
									object[key] = data[key];
									if (old?.watch?.activity === activity) {
										// unlink overwritten state object
										old.unlink();
									}
								}
							}
							if (added) object.emitChange();
						});
					}),
				),
			);
			return object as any;
		}
		return this.attach(watch(observe, update));
	}

	/** @internal Render placement options, modified using setRenderMode */
	private _renderOptions: RenderContext.PlacementOptions = { mode: "page" };

	/** @internal True if the view should be rendered within a dialog */
	private _renderDialog?: boolean;

	/** @internal Activation queue for this activity */
	private readonly _activation = new ActivationQueue();

	/** @internal View builder, if already set */
	declare private _viewBuilder?: ViewBuilder;

	/** @internal Original class that's been updated using hot reload (set on prototype) */
	declare private _OrigClass?: typeof Activity;

	/** @internal Set of instances, if hot reload has been enabled for this activity (set on prototype) */
	declare private _hotInstances?: Set<Activity>;

	/** @internal Set to true if a listener was added to remove this instance from the hot-reloaded list */
	private _isHot?: boolean;
}

export namespace Activity {
	/** An active state object, the result of {@link Activity.createActiveState()} */
	export interface ActiveStateObject extends ObservableObject {
		/** Observe additional objects or bindings, updating the same state object */
		watch<T extends Record<string, any>>(
			observe: (ObservableObject | Binding)[],
			update: (...args: any[]) => T | Promise<T>,
		): this & Partial<T>;
	}
}

/** @internal Helper class that contains activation state, and runs callbacks on activation/deactivation asynchronously */
class ActivationQueue {
	/** Current state */
	active = false;

	/** True if currently activating asynchronously */
	get activating() {
		return this._set === true;
	}

	/** True if currently deactivating asynchronously */
	get deactivating() {
		return this._set === false;
	}

	/** Sets given activation state asynchronously, and runs given callbacks before and after transitioning; rejects with an error if the transition was cancelled OR if the _before_ callback failed */
	async waitAndSetAsync(
		set: boolean,
		before: () => Promise<void>,
		after: () => Promise<void>,
	) {
		// if latest transition does/did the same, then return same promise
		if (this._set === set) return this._result;

		// prepare error to include better (sync) stack trace
		let cancelErr = err(ERROR.Activity_Cancelled);

		// prepare promise, wait for ongoing transition if any
		let prev = this._wait;
		let result = (async () => {
			await prev;
			if (this.active !== set) {
				// cancel if latest call has opposite effect
				if (this._set !== set) throw cancelErr;

				// invoke callbacks and set activation state
				await before();
				this.active = set;
				safeCall(after);
			}
		})();

		// keep track of this (last) transition
		this._set = set;
		this._result = result;
		this._wait = result
			.catch(() => {})
			.then(() => {
				if (this._result === result) {
					this._result = undefined;
					this._set = undefined;
				}
			});
		return result;
	}

	private _set?: boolean;
	private _result?: Promise<void>;
	private _wait?: Promise<void>;
}
