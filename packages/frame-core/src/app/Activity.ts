import {
	bound,
	ConfigOptions,
	ManagedEvent,
	ManagedObject,
	Observer,
	StringConvertible,
} from "../base/index.js";
import { err, ERROR, errorHandler, safeCall } from "../errors.js";
import type { UIFormContext } from "../ui/index.js";
import type { NavigationController } from "./NavigationController.js";
import { app } from "./GlobalContext.js";
import { NavigationTarget } from "./NavigationTarget.js";
import { AsyncTaskQueue } from "./Scheduler.js";
import type { Service } from "./Service.js";
import type { View, ViewClass } from "./View.js";

/** Global list of activity instances for (old) activity class, for HMR */
const _hotInstances = new WeakMap<typeof Activity, Set<Activity>>();

/** Reused binding for global theme reference */
const _boundTheme = bound("theme");

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of a Desk application. It represents a potential 'place' in the application, which can be activated and deactivated when the user navigates around.
 *
 * This class provides infrastructure for path-based routing, based on the application's navigation path (such as the browser's current URL). However, activities can also be activated and deactivated manually, or activated immediately when added using {@link GlobalContext.addActivity app.addActivity()}.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur.
 *
 * This class also provides a {@link Activity.view view} property, which can be set to a view object. Usually, this property is set in the {@link Activity.ready()} method. Afterwards, if the activity corresponds to a full page or dialog, this method should call {@link app} methods to show the view. The view is automatically unlinked when the activity is deactivated, and the property is set to undefined.
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   navigationPageId = "foo";
 *   protected ready() {
 *     this.view = new body(); // imported from a view file
 *     app.showPage(this.view);
 *   }
 * }
 *
 * app.addActivity(new MyActivity());
 * app.navigate("foo");
 */
export class Activity extends ManagedObject {
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
				for (let activity of instances) activity.ready();
			}
		}
	}

	/**
	 * Creates a new activity instance
	 * @note For automatic activation based on {@link Activity.navigationPageId} to work, the activity must be added to the {@link ActivityContext} using the {@link GlobalContext.addActivity app.addActivity()} method.
	 */
	constructor() {
		super();
		_boundTheme.bindTo(this, () =>
			// re-render view when theme changes, async
			Promise.resolve()
				.then(() => this.isActive() && this.ready())
				.catch(errorHandler),
		);

		// auto-attach view and delegate events
		class ViewObserver extends Observer<View> {
			constructor(public activity: Activity) {
				super();
			}
			protected override handleEvent(event: ManagedEvent<any>) {
				if (this.activity.isActive()) {
					this.activity.delegateViewEvent(event);
				}
			}
		}
		this.autoAttach("view", new ViewObserver(this));
	}

	/**
	 * A user-facing name of this activity, if any
	 * - This property may be set to any object that includes a `toString()` method, notably {@link LazyString} — the result of a call to {@link strf()}. This way, the activity title is localized automatically using {@link GlobalContext.i18n}.
	 * - The title string of an active activity may be displayed as the current window or document title.
	 */
	title?: StringConvertible;

	/**
	 * The page ID associated with this activity, to match the (first part of the) navigation path
	 * - If this property is set to a string, the activity will be activated automatically when the first part of the current path matches this value, and deactivated when it doesn't.
	 * - The activity must be added to the activity context using {@link GlobalContext.addActivity app.addActivity()}, or attached to an existing activity, for the navigation path to be matched.
	 * - To match the root path (`/`), set this property to an empty string
	 */
	navigationPageId?: string = undefined;

	/**
	 * The current view, if any (attached automatically)
	 * - This property should be set to a view object in the {@link Activity.ready} method, and displayed using the available {@link app} methods.
	 * - The view is automatically unlinked when the activity is deactivated or unlinked.
	 * - Events emitted by the view are automatically delegated to the activity, see {@link delegateViewEvent()}.
	 */
	declare view?: View;

	/** Default form context used with input elements, if any */
	formContext?: UIFormContext = undefined;

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
	 * A method that's called immediately before unlinking this activity.
	 * - If overridden, the base implementation must be called as well to ensure that all resources are released, if any.
	 */
	protected override beforeUnlink() {
		this._hotInstances?.delete(this);
	}

	/**
	 * Activates the activity asynchronously
	 * - If the activity is currently transitioning between active and inactive states, the transition will be allowed to finish before the activity is activated.
	 * - After activation, the activity's {@link ready()} method is called automatically.
	 * @error This method throws an error if the activity has been unlinked.
	 */
	async activateAsync() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// set active asynchronously and run beforeActiveAsync
		await this._activation.waitAndSetAsync(
			true,
			() => {
				if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
				return this.beforeActiveAsync();
			},
			async () => {
				if (this.isUnlinked()) return;
				this.emitChange("Active");
				this._hotInstances?.add(this);
				await this.afterActiveAsync();
				this.ready();
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
				this.view = undefined;
				return this.beforeInactiveAsync();
			},
			() => {
				this.emitChange("Inactive");
				return this.afterInactiveAsync();
			},
		);
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
	 * @param navigationController The current navigation controller instance
	 */
	async handleNavigationDetailAsync(
		detail: string,
		navigationController: NavigationController,
	): Promise<void> {
		// nothing here, to be overridden
	}

	/**
	 * Delegates events from the current view
	 * - This method is called automatically when an event is emitted by the current view object.
	 * - The base implementation calls activity methods starting with `on`, e.g. `onClick` for a `Click` event. The event is passed as a single argument, and the return value should either be `true`, undefined, or a promise (which is awaited just to be able to handle any errors).
	 * - This method may be overridden to handle events in any other way, e.g. to propagate them by emitting the same event on the activity object itself.
	 * @param event The event to be delegated (from the view)
	 * @returns True if an event handler was found, and it returned true; false otherwise.
	 */
	protected delegateViewEvent(event: ManagedEvent) {
		// find own handler method
		let method = (this as any)["on" + event.name];
		if (typeof method === "function") {
			let result = method.call(this, event);

			// return true or promise result, otherwise false below
			if (result === true) return true;
			if (result && result.then && result.catch) {
				return (result as Promise<unknown>).catch(errorHandler);
			}
		}
		return false;
	}

	/**
	 * Handles navigation to a provided navigation target or path, from the current activity
	 * - This method is called automatically by {@link onNavigate} when a view object emits the `Navigate` event while this activity is active.
	 * - The default implementation directly calls {@link NavigationController.navigateAsync()}. Override this method to handle navigation differently, e.g. to _replace_ the current path for detail view activities.
	 */
	protected async navigateAsync(target: NavigationTarget) {
		await app.activities.navigationController.navigateAsync(target);
	}

	/**
	 * Handles a `Navigate` event emitted by the current view
	 * - This method is called when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - If the navigation target only includes a `detail` property, the `pageId` is set to the current activity's {@link navigationPageId}.
	 * - This method calls {@link navigateAsync()} in turn, which may be overridden.
	 */
	protected onNavigate(
		e: ManagedEvent<
			ManagedObject & { getNavigationTarget?: () => NavigationTarget }
		>,
	) {
		if (typeof e.source.getNavigationTarget === "function") {
			let target = new NavigationTarget({
				pageId: this.navigationPageId,
				...e.source.getNavigationTarget(),
			});
			return this.navigateAsync(target);
		}
	}

	/**
	 * Searches the view hierarchy for view objects of the provided type
	 * @summary This method looks for matching view objects in the current view structure — including the activity's view itself. If a component is an instance of the provided class, it's added to the list. Components _within_ matching components aren't searched for further matches.
	 * @param type A view class
	 * @returns An array with instances of the provided view class; may be empty but never undefined.
	 */
	findViewContent<T extends View>(type: ViewClass<T>): T[] {
		return this.view
			? this.view instanceof type
				? [this.view]
				: this.view.findViewContent(type)
			: [];
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

		// observe activity to pause/resume/stop automatically
		class ActivityQueueObserver extends Observer<Activity> {
			onActive() {
				queue.resume();
			}
			onInactive() {
				queue.pause();
			}
			override stop(): void {
				queue.stop();
			}
		}
		new ActivityQueueObserver().observe(this);

		return queue;
	}

	/**
	 * Observes a particular service by ID, until the activity is unlinked
	 * @param id The ID of the service to be observed
	 * @param observer An {@link Observer} class or instance, or a function that's called whenever a change event is emitted by the service (with service and event arguments, respectively), and when the current service is unlinked (without any arguments)
	 * @returns The observer instance, which references the observed service using the {@link Observer.observed observed} property
	 */
	protected observeService<TService extends Service>(
		id: string,
		observer:
			| Observer<TService>
			| ManagedObject.AttachObserverFunction<TService> = new Observer(),
	) {
		return app.services._$observe(id, observer, this);
	}

	/** A method that's called on an active activity, to be overridden to create and render the view if needed */
	protected ready() {}

	/** A method that's called and awaited before the activity is activated, to be overridden if needed */
	protected async beforeActiveAsync() {}

	/** A method that's called and awaited after the activity is activated, to be overridden if needed */
	protected async afterActiveAsync() {}

	/** A method that's called and awaited before the activity is deactivated, to be overridden if needed */
	protected async beforeInactiveAsync() {}

	/** A method that's called and awaited after the activity is deactivated, to be overridden if needed */
	protected async afterInactiveAsync() {}

	/** Activation queue for this activity */
	private readonly _activation = new ActivationQueue();

	/** Original class that's been updated using hot reload (set on prototype) */
	private declare _OrigClass?: typeof Activity;

	/** Set of instances, if hot reload has been enabled for this activity (set on prototype) */
	private declare _hotInstances?: Set<Activity>;
}

/** Helper class that contains activation state, and runs callbacks on activation/deactivation asynchronously */
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
