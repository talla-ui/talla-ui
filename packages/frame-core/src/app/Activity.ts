import {
	bound,
	ConfigOptions,
	ManagedEvent,
	ManagedObject,
	Observer,
	StringConvertible,
} from "../base/index.js";
import { err, ERROR, errorHandler } from "../errors.js";
import type { UIFormContext } from "../ui/index.js";
import type { ActivationPath } from "./ActivationPath.js";
import { app } from "./GlobalContext.js";
import { NavigationTarget } from "./NavigationTarget.js";
import { AsyncTaskQueue } from "./Scheduler.js";
import type { Service } from "./Service.js";
import type { View, ViewClass } from "./View.js";

/** Global list of activity instances for (old) activity class, for HMR */
const _hotInstances = new WeakMap<typeof Activity, Set<Activity>>();

/** Reused binding for global activation path reference */
const _boundActivationPath = bound("activationPath");

/** Reused binding for global theme reference */
const _boundTheme = bound("theme");

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of a Desk application. It represents a potential 'place' in the application, which can be activated and deactivated when the user navigates around.
 *
 * This class provides infrastructure for path-based routing, based on the application's location, such as the browser URL. However, activities can also be activated and deactivated manually, or activated immediately when added using {@link GlobalContext.addActivity app.addActivity()}.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur.
 *
 * This class also provides a {@link view} property, which can be set to a view object. Usually, this property is set in the {@link Activity.ready()} method. Afterwards, if the activity corresponds to a full page or dialog, this method should call {@link app} methods to show the view. The view is automatically unlinked when the activity is deactivated, and the property is set to undefined.
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   path = "foo";
 *   protected ready() {
 *     this.view = new body(); // imported from a view file
 *     app.showPage(this.view);
 *   }
 * }
 *
 * app.addActivity(new MyActivity());
 * app.navigate("/foo");
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
	 * @note For automatic activation based on {@link Activity.path} to work, the activity must be (indirectly) attached to {@link GlobalContext.activities}. Use the {@link GlobalContext.addActivity()} method to add newly created activities to the global application context.
	 */
	constructor() {
		super();
		_boundActivationPath.bindTo(this, "activationPath");
		_boundTheme.bindTo(this, () =>
			// re-render view when theme changes, async
			Promise.resolve().then(() => this.isActive() && this.ready()),
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

		// create observer to match path and activate/deactivate
		new Activity._ActivityObserver().observe(this);
	}

	/**
	 * A user-facing name of this activity, if any
	 * - This property may be set to any object that includes a `toString()` method, notably {@link LazyString} — the result of a call to {@link strf()}. This way, the activity title is localized automatically using {@link GlobalContext.i18n}.
	 * - The title string of an active activity may be displayed as the current window or document title.
	 */
	title?: StringConvertible;

	/**
	 * A (bound) reference to the current activation path
	 * - This property is bound automatically, so that it reflects the path from the global application context when the activity is added using {@link GlobalContext.addActivity()}. Afterwards, changes to the path are observed, and the activity will be activated and deactivated based on the {@link Activity.path} property.
	 */
	readonly activationPath?: ActivationPath;

	/**
	 * The path associated with this activity
	 * - If this property is set to a string, the activity will be activated automatically when the specified path matches the current location, and deactivated when it doesn't.
	 * - The activity must be added to the global application context using {@link GlobalContext.addActivity()}, or attached to an existing activity, for the path to be matched.
	 * - To match the root path (`/`), set this property to an empty string; to match _all_ paths, set this property to `/`. Refer to {@link ActivationPath.match()} for details.
	 * - Use `./` at the start of the path to make it a 'sub path': the path of the closest containing (attached) activity that also defines a path will be prepended when navigating to this activity, and when checking the activity path.
	 * - Include capture placeholders such as `:foo` or `*foo` to match path segments. The matched values for captures are available on the {@link Activity.pathMatch} object.
	 */
	path?: string = undefined;

	/**
	 * An object that contains data related to the matched path, if any
	 * @see {@link Activity.path}
	 */
	protected pathMatch?: ActivationPath.Match = undefined;

	/**
	 * The view to be rendered, if any
	 * - The view is rendered automatically when this property is set. However, there's no need to set this property manually: a view instance is created automatically when the activity becomes active.
	 */
	declare view?: View;

	/** Default form context used with input elements, if any */
	formContext?: UIFormContext = undefined;

	/**
	 * Returns a {@link NavigationTarget} instance that refers to this activity
	 * - The {@link Activity.path} for this activity as well as any containing (attached) activities are used to determine the target path.
	 * @param capture An object containing string values for all named captures in {@link Activity.path}, if any
	 * @param rest The string value for the final 'rest' capture in {@link Activity.path}
	 */
	getNavigationTarget(
		capture?: { [captureId: string]: string },
		rest?: string,
	) {
		return new NavigationTarget(this).setCapture(capture, rest);
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
	 * @error This method throws an error if the activity has been unlinked.
	 */
	async deactivateAsync() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// remove view first, if any
		this.view = undefined;

		// set inactive asynchronously and run beforeInactiveAsync
		await this._activation.waitAndSetAsync(
			false,
			() => {
				if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
				return this.beforeInactiveAsync();
			},
			() => {
				this.emitChange("Inactive");
				return this.afterInactiveAsync();
			},
		);
	}

	/**
	 * Activates or deactivates the activity based on a change to {@link Activity.pathMatch}, can be overridden
	 * - This method is called automatically after updating the {@link Activity.pathMatch} property. It can be overridden to implement additional checks before automatic activation or deactivation.
	 * @param match Data related to the matched path, if any
	 * @returns A promise that's resolved when the activity is activated or deactivated, if necessary
	 */
	protected async handlePathMatchAsync(match?: ActivationPath.Match) {
		if (this.isUnlinked()) return;
		let isUp =
			(this._activation.active || this._activation.activating) &&
			!this._activation.deactivating;
		if (!match && isUp) return this.deactivateAsync();
		if (match && !isUp) return this.activateAsync();
		if (match && isUp) this.ready();
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
	 * Handles the `Navigate` event
	 * - This method is called automatically when a view object emits the `Navigate` event. Such events are emitted from views that include a `getNavigationTarget` method, such as {@link UIButton}.
	 * - This method calls {@link handleNavigateAsync} in turn, which may be overridden.
	 */
	protected onNavigate(
		e: ManagedEvent<
			ManagedObject & { getNavigationTarget?: () => NavigationTarget }
		>,
	) {
		if (
			this.activationPath &&
			typeof e.source.getNavigationTarget === "function"
		) {
			return this.handleNavigateAsync(e.source.getNavigationTarget());
		}
	}

	/**
	 * Handles navigation to a provided navigation target
	 * - This method is called automatically by {@link onNavigate} when a view object emits the `Navigate` event. It may be overridden to handle navigation differently, e.g. for master-detail view activities.
	 */
	protected async handleNavigateAsync(target: NavigationTarget) {
		if (this.activationPath) {
			await this.activationPath.navigateAsync(String(target));
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

	/** @internal Observer class for activities, to watch for path matches */
	private static _ActivityObserver = class extends Observer<Activity> {
		override observe(activity: Activity) {
			return super.observe(activity).observePropertyAsync("activationPath");
		}
		async onActivationPathChange() {
			let activity = this.observed;
			if (
				activity &&
				typeof activity.path === "string" &&
				!activity.isUnlinked()
			) {
				let activationPath = activity.activationPath;
				try {
					// set pathMatch and call handler
					let match = activationPath?.match(activity.path, activity);
					if (activity.pathMatch !== match) {
						activity.pathMatch = match;
						await activity.handlePathMatchAsync(match);
					}
				} catch (err) {
					// path change might be cancelled for good reasons,
					// don't leak unhandled error unnecessarily
					if (
						!activity.isUnlinked() &&
						activity.activationPath === activationPath
					) {
						throw err;
					}
				}
			}
		}
	};
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
				after().catch(errorHandler);
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
