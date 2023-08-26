import {
	bound,
	ManagedObject,
	Observer,
	StringConvertible,
} from "../core/index.js";
import { NavigationTarget } from "./NavigationTarget.js";
import { ActivationPath } from "./ActivationPath.js";
import { err, ERROR } from "../errors.js";
import { AsyncTaskQueue } from "./Scheduler.js";

const _boundActivationPath = bound("activationPath");

/**
 * A class that represents a part of the application that can be activated when the user navigates to it
 *
 * @description
 * The activity is one of the main architectural components of a Desk application. It represents a potential 'place' in the application, which can be activated and deactivated when the user navigates around.
 *
 * This class provides infrastructure for path-based routing, based on the application's location, such as the browser URL. However, activities can also be activated and deactivated manually.
 *
 * Activities emit `Active` and `Inactive` change events when state transitions occur.
 *
 * @note The base Activity class does **not** render a view. Use the {@link ViewActivity} class instead for an activity that renders an accompanying view.
 *
 * @see {@link ViewActivity}
 *
 * @example
 * // Create an activity and activate it:
 * class MyActivity extends Activity {
 *   constructor() {
 *     super();
 *     this.path = "foo";
 *   }
 *   override protected async afterActiveAsync() {
 *     console.log("MyActivity is now active");
 *   }
 * }
 *
 * app.addActivity(new MyActivity());
 * app.navigate("/foo");
 */
export class Activity extends ManagedObject {
	/** @internal Update prototype for given class with newer prototype */
	static _$hotReload(
		Old: undefined | typeof Activity,
		Updated: typeof Activity
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
	}

	/**
	 * Creates a new activity instance
	 * @note For automatic activation based on {@link Activity.path} to work, the activity must be (indirectly) attached to {@link GlobalContext.activities}. Use the {@link GlobalContext.addActivity()} method to add newly created activities to the global application context.
	 */
	constructor() {
		super();
		_boundActivationPath.bindTo(this, "activationPath");

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
	 * Returns a {@link NavigationTarget} instance that refers to this activity
	 * - The {@link Activity.path} for this activity as well as any containing (attached) activities are used to determine the target path.
	 * @param capture An object containing string values for all named captures in {@link Activity.path}, if any
	 * @param rest The string value for the final 'rest' capture in {@link Activity.path}
	 */
	getNavigationTarget(
		capture?: { [captureId: string]: string },
		rest?: string
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
			() => {
				this.emitChange("Active");
				return this.afterActiveAsync();
			}
		);
	}

	/**
	 * Deactivates the activity asynchronously
	 * - If the activity is currently transitioning between active and inactive states, the transition will be allowed to finish before the activity is deactivated.
	 * @error This method throws an error if the activity has been unlinked.
	 */
	async deactivateAsync() {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// set inactive asynchronously and run beforeInctiveAsync
		await this._activation.waitAndSetAsync(
			false,
			() => {
				if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
				return this.beforeInactiveAsync();
			},
			() => {
				this.emitChange("Inactive");
				return this.afterInactiveAsync();
			}
		);
	}

	/**
	 * Activates or deactivates the activity based on a change to {@link Activity.pathMatch}, can be overridden
	 * - This method is called automatically when the {@link Activity.pathMatch} property is changed. It can be overridden to implement additional checks before automatic activation or deactivation.
	 * @param match Data related to the matched path, if any
	 * @returns A promise that's resolved when the activity is activated or deactivated, if necessary
	 */
	protected async handlePathMatchAsync(match?: ActivationPath.Match) {
		if (this.isUnlinked()) return;
		let isUp =
			(this._activation.active || this._activation.activating) &&
			!this._activation.deactivating;
		if (match && !isUp) return this.activateAsync();
		if (!match && isUp) return this.deactivateAsync();
	}

	/**
	 * Creates a task queue that's started, paused, resumed, and stopped automatically based on the state of this activity
	 * - Use this method to create an {@link AsyncTaskQueue} instance to run background tasks only while the activity is active, e.g. when the user is viewing a particular screen of the application.
	 * @param configure A configuration function to set {@link AsyncTaskQueue.Options} if needed
	 * @returns A new {@link AsyncTaskQueue} instance
	 * @error This method throws an error if the activity has been unlinked.
	 */
	protected createActiveTaskQueue(
		configure?: (options: AsyncTaskQueue.Options) => void
	) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);

		// create queue with given options, pause if activity is not active
		let options = new AsyncTaskQueue.Options();
		configure && configure(options);
		let queue = new AsyncTaskQueue(Symbol("ActiveTaskQueue"), options);
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

	/** Original class that's been updated using `@reload` method */
	private declare _OrigClass?: typeof Activity;

	/** Observer class for activities, to watch for path matches */
	private static _ActivityObserver = class extends Observer<Activity> {
		override observe(activity: Activity) {
			return super
				.observe(activity)
				.observeProperty("path", "activationPath")
				.observePropertyAsync("pathMatch" as any);
		}
		onActivationPathChange() {
			this.onPathChange();
		}
		onPathChange() {
			let activity = this.observed;
			if (
				activity &&
				activity.activationPath &&
				typeof activity.path === "string" &&
				!activity.isUnlinked()
			) {
				activity.pathMatch = activity.activationPath.match(
					activity.path,
					activity
				);
			}
		}
		async onPathMatchChange(match?: ActivationPath.Match) {
			if (
				this.observed &&
				!this.observed.isUnlinked() &&
				this.observed.pathMatch === match
			) {
				let activationPath = this.observed.activationPath;
				try {
					// call back into activity method to handle (de)activation
					await this.observed.handlePathMatchAsync(match);
				} catch (err) {
					// path change might be cancelled for good reasons,
					// don't leak unhandled error unnecessarily
					if (
						!this.observed.isUnlinked() &&
						activationPath &&
						this.observed.activationPath === activationPath
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
		after: () => void
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
				after();
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
