import type { ConfigOptions, StringConvertible } from "@talla-ui/util";
import { Binding, ObservedEvent, ObservedObject } from "../object/index.js";
import { ERROR, err, errorHandler, safeCall } from "../errors.js";
import type { UITheme } from "../ui/index.js";
import { $_app_bind_label } from "./app_binding.js";
import type { AppContext } from "./AppContext.js";
import { FormContext } from "./FormContext.js";
import type { NavigationContext } from "./NavigationContext.js";
import { NavigationTarget } from "./NavigationTarget.js";
import type { RenderContext } from "./RenderContext.js";
import { AsyncTaskQueue } from "./Scheduler.js";
import { View } from "./View.js";

/** Label property used to filter bindings using $activity */
const $_bind_label = Symbol("activity");

/** Binding source for the app object itself */
export const $app = Binding.createFactory($_app_bind_label);

/** Global list of activity instances for (old) activity class, for HMR */
const _hotInstances = new WeakMap<typeof Activity, Set<Activity>>();

/** Reused binding for the navigation context */
const _navCtxBinding = $app("navigation");

/** Reused binding for the global renderer instance, also listens for change events */
const _rendererBinding = $app("renderer.*");

/** Reused binding for the global theme instance */
const _themeBinding = $app("theme");

/** An object that can be used to create bindings for properties of the nearest activity */
export const $activity = Binding.createFactory<
	(string & {}) | "formContext" | `formContext.${string}` | "title"
>($_bind_label);

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of an application. It represents a potential 'place' in the application, which can be activated and deactivated when the user navigates around.
 *
 * This class provides infrastructure for path-based routing, based on the application's navigation path (such as the browser's current URL). However, activities can also be activated and deactivated manually.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur. Several methods can be overridden to add custom behavior when the activity is activated or deactivated – i.e. {@link beforeActiveAsync}, {@link afterActiveAsync}, {@link beforeInactiveAsync}, and {@link afterInactiveAsync}. In addition, the {@link createView()} method must be overridden to create a view object and set the {@link view} property when the activity becomes active.
 *
 * As soon as the activity is activated and a view is created, the view is rendered. The view is unlinked when the activity is deactivated, and the {@link view} property is set to undefined. To change rendering options or disable automatic rendering, use the {@link setRenderMode()} method.
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   protected createView() {
 *     return view.create(); // imported from a view file
 *   }
 * }
 *
 * app.addActivity(new MyActivity(), true);
 */
export class Activity extends ObservedObject {
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
		_navCtxBinding.bindTo(this, (ctx) => {
			this._boundNavCtx = ctx;
		});
		_themeBinding.bindTo(this, (theme) => {
			this._boundTheme = theme;
		});
		_rendererBinding.bindTo(this, (renderer) => {
			this._boundRenderer = renderer;

			// on remount, asynchronously recreate view from scratch
			if (renderer && this.view) {
				return Promise.resolve()
					.then(() => this.isActive() && this._showView(true))
					.catch(errorHandler);
			}
		});
	}

	/** @internal */
	[$_bind_label] = true;

	/**
	 * The page ID associated with this activity, to match the (first part of the) navigation path
	 * - This property is used by the {@link NavigationContext} class, but only if the activity has been added to the list of root activities using {@link AppContext.addActivity app.addActivity()}.
	 * - If the page ID is set to a string, the activity will be activated automatically when the first part of the current path matches this value, and deactivated when it doesn't.
	 * - To match the root path (`/`), set this property to an empty string
	 */
	navigationPageId?: string = undefined;

	/**
	 * A user-facing name of this activity, if any
	 * - The title string of an active activity may be displayed as the current window or document title.
	 * - This property may be set to any object that includes a `toString()` method, notably {@link LazyString} — the result of a call to {@link strf()}. This way, the activity title is localized automatically using {@link AppContext.i18n}.
	 */
	title?: StringConvertible;

	/**
	 * The current view, if any (attached automatically)
	 * - This property is set automatically when active, using the result of the {@link Activity.createView()} method, and then rendered. By default, the view is rendered as a scrollable page. This can be changed using the {@link setRenderMode()} method.
	 * - The view is automatically unlinked when the activity is deactivated or unlinked.
	 * - Events emitted by the view are automatically delegated to the activity, see {@link delegate()}.
	 */
	view?: View = undefined;

	/**
	 * Default form context used with input elements, if any
	 * - This property defaults to undefined, and needs to be initialized (e.g. in the constructor) to an instance of {@link FormContext} for input elements to be bound automatically.
	 */
	formContext?: FormContext = undefined;

	/**
	 * Delegates incoming events to methods of this object, notably from the attached view
	 * - This method is called automatically when an event is emitted by the current view object (except if {@link ObservedEvent.noPropagation} was set on the event; see {@link ObservedObject.attach()} which is used to set up view event delegation).
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true` (event handled), false/undefined, or a promise (which is awaited just to be able to handle any errors).
	 * @param event The event to be delegated
	 * @returns The result of the event handler method, or undefined.
	 * @see {@link ObservedObject.attach}
	 * @see {@link ObservedObject.EventDelegate}
	 */
	delegate(event: ObservedEvent): Promise<boolean | void> | boolean | void {
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
				if (!this._boundNavCtx) throw err(ERROR.Activity_NotAttached);
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
				this.emitChange("Active");
				this._showView();
				await this.afterActiveAsync();
			},
		);
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
	 * Creates the encapsulated view object, to be overridden
	 * - The base implementation of this method in the Activity class does nothing. This method must be overridden to create (and return) the activity's view instance.
	 * - This method is called automatically when the activity is activated, or when the view needs to be recreated (e.g. for hot module replacement in development). The result is attached to the activity object, and assigned to {@link Activity.view}. If the view is unlinked, the {@link Activity.view} property is set to undefined again.
	 */
	protected createView(): View | undefined | void {
		// nothing here
	}

	/**
	 * Set rendering mode and additional options
	 * - By default, the activity view is rendered using the `page` rendering mode, as soon as the activity is activated. The mode can be changed using this method, or rendering can be disabled by specifying the `none` mode.
	 * - Use the special `dialog` mode to render the view within a dialog as defined by the current theme.
	 * - Additional options may be specified, including page/screen background color and transform animations.
	 * @param mode The selected rendering mode
	 * @param options Additional placement options, if any
	 * @see {@link RenderContext.PlacementOptions}
	 * @see {@link UITheme.modalFactory}
	 * @see {@link UITheme.ModalControllerFactory}
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
	private _showView(forceCreate?: boolean) {
		if (!this.isActive()) return;
		let view = this.view;

		// create view and attach it
		if (!view || forceCreate) {
			let newView = this.createView();
			if (!newView) return;
			if (!(newView instanceof View)) throw err(ERROR.View_Invalid);
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
		if (ObservedObject.whence(view) !== this) {
			throw err(ERROR.View_NotAttached);
		}
		if (!this._boundRenderer) throw err(ERROR.Render_Unavailable);

		// render view using theme dialog controller if needed
		let renderOptions = this._renderOptions;
		if (this._renderDialog) {
			let controller = this._boundTheme?.modalFactory?.buildDialog?.(view);
			if (!controller) throw err(ERROR.Render_NoModal);
			controller.show(renderOptions);
			return this;
		}

		// render view normally if placed
		if (renderOptions.mode !== "none") {
			this._boundRenderer.render(view, renderOptions);
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
	 * Returns a {@link NavigationTarget} instance that refers to this activity
	 * - The {@link navigationPageId} for this activity is used to determine the target page ID, and the provided detail parameter(s) are combined into the detail string.
	 * @param detail One or more values to be used as detail parts of the navigation path
	 */
	getNavigationTarget(...detail: StringConvertible[]): NavigationTarget {
		return new NavigationTarget({
			title: this.title,
			pageId: this.navigationPageId,
			detail: detail.join("/"),
		});
	}

	/**
	 * A method that's called after the user navigated to a particular sub-path of this activity, to be overridden if needed
	 * - This method is called automatically after the activity is activated (or was already active), if the current navigation path matches the activity's {@link navigationPageId}.
	 * - If the navigation path matches the activity's {@link navigationPageId} exactly, this method is called with an empty string as the `detail` argument.
	 * - This method can be used to show specific content within the activity's view, e.g. a tab or detail view, or to activate a child activity.
	 * @param detail The part of the navigation path that comes after the page ID
	 * @param navigationContext The current navigation context instance
	 */
	async handleNavigationDetailAsync(
		detail: string,
		navigationContext: NavigationContext,
	): Promise<void> {
		// nothing here, to be overridden
	}

	/**
	 * Handles navigation to a provided navigation target or path, from the current activity
	 * - This method is called automatically by {@link onNavigate} when a view object emits the `Navigate` event while this activity is active.
	 * - The default implementation directly calls {@link NavigationContext.navigateAsync()}. Override this method to handle navigation differently, e.g. to _replace_ the current path for detail view activities.
	 */
	protected async navigateAsync(target: NavigationTarget) {
		await this._boundNavCtx?.navigateAsync(target);
	}

	/**
	 * Handles a `Navigate` event emitted by the current view
	 * - This method is called when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - If the navigation target only includes a `detail` property, the `pageId` is set to the current activity's {@link navigationPageId}. If the activity doesn't have a page ID, this method returns false and the event is propagated instead.
	 * - This method calls {@link navigateAsync()} in turn, which may be overridden.
	 */
	protected onNavigate(
		e: ObservedEvent<
			ObservedObject & { getNavigationTarget?: () => NavigationTarget }
		>,
	) {
		if (typeof e.source.getNavigationTarget === "function") {
			let target = e.source.getNavigationTarget();
			let pageId = target.pageId ?? this.navigationPageId;
			if (pageId == null) return false;
			return this.navigateAsync(
				new NavigationTarget({
					...target,
					pageId: target.pageId ?? this.navigationPageId,
				}),
			);
		}
		return false;
	}

	/**
	 * Handles a `NavigateBack` event emitted by the current view
	 * - This method is called when a view object emits the `NavigateBack` event. This event can be used to go back in the navigation history, e.g. when a back button is clicked.
	 */
	protected onNavigateBack() {
		return this._boundNavCtx?.navigateAsync(undefined, { back: true });
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
	 * Listens for change events from the provided target object, until either the object or the activity is unlinked
	 * @param target The target object, to which a listener will be added
	 * @param changeHandler A function that will be called for each change event that's emitted from the target object
	 * @param unlinked A function that will be called when the target object (not the activity) is unlinked
	 * @returns The target object
	 * @see {@link ObservedObject.emitChange}
	 */
	watch<T extends ObservedObject>(
		target: T,
		changeHandler: (object: T, event: ObservedEvent) => Promise<void> | void,
		unlinked?: (object: T) => void,
	) {
		target.listen({
			handler: (t, e) => {
				if (e.data.change) return changeHandler(t, e);
			},
			init: (_, stop) => {
				this.listen({ unlinked: stop });
			},
			unlinked,
		});
		return target;
	}

	/** @internal Render placement options, modified using setRenderMode */
	private _renderOptions: RenderContext.PlacementOptions = { mode: "page" };

	/** @internal True if the view should be rendered within a dialog */
	private _renderDialog?: boolean;

	/** @internal Activation queue for this activity */
	private readonly _activation = new ActivationQueue();

	/** @internal Last (bound) navigation context instance */
	private _boundNavCtx?: NavigationContext;

	/** @internal Last (bound) renderer instance */
	private _boundRenderer?: RenderContext;

	/** @internal Last (bound) theme instance */
	private _boundTheme?: UITheme;

	/** @internal Original class that's been updated using hot reload (set on prototype) */
	declare private _OrigClass?: typeof Activity;

	/** @internal Set of instances, if hot reload has been enabled for this activity (set on prototype) */
	declare private _hotInstances?: Set<Activity>;

	/** @internal Set to true if a listener was added to remove this instance from the hot-reloaded list */
	private _isHot?: boolean;
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
