import { safeCall } from "../errors.js";
import { ObservableList, ObservableObject } from "../object/index.js";
import { Activity } from "./Activity.js";
import { AppContext } from "./AppContext.js";
import type { AsyncTaskQueue } from "./Scheduler.js";

/**
 * A class that facilitates activating and deactivating a set of activities
 *
 * An activity router can be used to switch between active {@link Activity} instances, or add multiple active activities. The application context contains a root activity router as {@link AppContext.activities app.activities}, but you can also use nested routers to any activity to support 'sub activities' — either for sub path routing, list-detail views, or modal dialog activities.
 *
 * If an activity is added to the root activity router, its {@link Activity.matchNavigationPath()} method is used to determine if the activity should be activated in response to navigation path changes. The default implementation of that method checks for exact path matches against {@link Activity.navigationPath}.
 *
 * For nested routers, attach an activity router to an existing activity. Activities that are added to a nested router are automatically deactivated when the containing activity is deactivated. If the activity is unlinked, both the router and all of the activities added to it are also unlinked.
 *
 * @example
 * // Add an activity to the root activity router, and activate it
 * app.addActivity(myActivity, true)
 * // ... same as:
 * app.activities.add(myActivity, true)
 *
 * // Use a nested activity router to display a model dialog
 * class MyActivity extends Activity {
 *   // ...
 *   private _dialogRouter = this.attach(new ActivityRouter());
 *   protected onShowDialog() {
 *     let myDialog = new MyDialogActivity();
 *     myDialog.setRenderMode("dialog"); // ... or do this in constructor
 *     this._dialogRouter.replace(myDialog, true);
 *     for await (let event of myDialog.listenAsync()) {
 *       // ... handle events here; make sure to unlink dialog when done
 *     }
 *   }
 * }
 *
 * // Use a nested activity router for a list-detail view with path routing
 * class MyListActivity extends Activity {
 *   // ...
 *
 *   // In a view, bind to "detail.active.view" (else show empty state)
 *   detail = this.attach(new ActivityRouter());
 *
 *   navigationPath = "list";
 *   matchNavigationPath(path: string) {
 *     if (path === this.navigationPath) return true;
 *     if (path.startsWith(this.navigationPath + "/")) {
 *       return () => {
 *         // ...called when list activity is active
 *         let id = path.slice(this.navigationPath.length + 1);
 *         this.detail.replace(new MyDetailActivity(id), true);
 *       }
 *     }
 *   }
 * }
 */
export class ActivityRouter extends ObservableObject {
	/** Create a new activity router */
	constructor() {
		super();

		// attach the list of activities, and watch for updates
		this._list = this.attach(
			new ObservableList<Activity>().restrict(Activity).attachItems(true),
			(e) => {
				if (e.name === "Active" && this._list.includes(e.source as Activity)) {
					// set active, if an activity in the list was activated
					this.active = e.source as Activity;
					this.emitChange();
					return;
				}

				// unset active if the activity is no longer active, or in the list
				let active = this.active;
				if ((active && !this._list.includes(active)) || !active?.isActive()) {
					this.active = undefined;
					this.emitChange();
					return;
				}

				// emit a change event if the list itself changed (e.g. activity added)
				if (e.source === this._list) this.emitChange();
			},
		);
	}

	/** The activity that was activated last */
	active?: Activity;

	/** Returns an array of all activities added to this router */
	toArray() {
		return this._list.toArray();
	}

	/**
	 * Adds an activity to this router
	 * - This method adds the activity to the list of activities that are considered by {@link matchNavigationPath()}.
	 * - If the router is attached to another activity, the activity that is added will be automatically deactivated after the containing activity is deactivated, and unlinked when the containing activity is unlinked.
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	add(activity: Activity, activate?: boolean) {
		let parent = Activity.whence(this);
		if (parent) {
			// deactivate at same time as parent
			parent.listen({
				init(_, stop) {
					activity.listen({ unlinked: stop });
				},
				handler(_, e) {
					if (e.name === "Inactive") {
						safeCall(activity.deactivateAsync, activity);
					}
				},
			});
		}

		this._list.add(activity);
		if (activate) safeCall(activity.activateAsync, activity);
		return this;
	}

	/**
	 * Replaces all activities contained by this router with the specified activity
	 * - Any activities that had previously been added to the router are immediately unlinked (synchronously), before adding the specified activity.
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	replace(activity: Activity, activate?: boolean) {
		this._list.clear();
		this.add(activity, activate);
	}

	/** Removes all activities and stops all pending asynchronous activations and deactivations */
	clear() {
		this._list.clear();
		this._queue?.stop();
		this._queue = undefined;
	}

	/**
	 * Checks for activation of all contained activities using the provided path, and activates the first activity that matches
	 * - This method calls {@link Activity.matchNavigationPath()} on all contained activities, and activates (asynchronously) the first activity that returns a value that equals to true.
	 * - All other activities are deactivated (also asynchronously) _before_ activating the matching activity; unless no activity had matched before. This enables 'path routing' only after the first successful match.
	 * - If the matching {@link Activity.matchNavigationPath()} method returned a function, the function will be invoked asynchronously after the activity has been activated.
	 * @param path The path to pass to all contained activities
	 * @returns The activity that will be activated, if any
	 */
	matchNavigationPath(path: string) {
		let list = this._list.toArray();
		if (!list.length) return;

		// prepare functions to activate and deactivate asynchronously
		let toActivate: Activity | undefined;
		async function deactivateOthersAsync(t: AsyncTaskQueue.Task) {
			for (let other of list) {
				if (other !== toActivate) {
					if (t.cancelled) return;
					if (other.isActive() || other.isActivating()) {
						await other.deactivateAsync();
					}
				}
			}
		}
		async function activateAsync() {
			if (
				!toActivate?.isUnlinked() &&
				!toActivate!.isActive() &&
				!toActivate!.isActivating()
			) {
				await toActivate!.activateAsync();
			}
		}

		// go through the list and find a matching activity
		for (let activity of list) {
			let activate = activity.matchNavigationPath(path);
			if (activate) {
				toActivate = activity;
				let q = this._getQueue();
				q.stop();
				q.add(deactivateOthersAsync);
				q.add(activateAsync);
				if (typeof activate === "function") q.add(activate);
				return activity;
			}
		}

		// if nothing matched, deactivate all if activated once before
		this._queue?.add(deactivateOthersAsync);
	}

	/** Retrieves or initializes the activation queue */
	private _getQueue() {
		if (!this._queue) {
			this._queue = AppContext.getInstance().scheduler.createQueue(
				Symbol("route"),
			);
		}
		return this._queue;
	}

	private _queue?: AsyncTaskQueue;
	private _list: ObservableList<Activity>;
}
