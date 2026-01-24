import { err, ERROR, safeCall } from "../errors.js";
import { ObservableList, ObservableObject } from "../object/index.js";
import type { Activity } from "./Activity.js";

/**
 * A class that facilitates activating and deactivating a set of activities
 *
 * An activity router can be used to switch between active {@link Activity} instances, or add multiple active activities. The application context contains a root activity router as {@link AppContext.activities app.activities}, but you can also use nested routers to any activity to support 'sub activities' — either for sub path routing, list-detail views, or modal dialog activities.
 *
 * If an activity is added to the root activity router, its {@link Activity.matchNavigationPath()} method is used to determine if the activity should be activated in response to navigation path changes. The default implementation of that method checks for exact path matches against {@link Activity.navigationPath}.
 *
 * For nested routers, use the {@link Activity.createActiveRouter} method. The resulting router only matches activities while the containing activity is active, and automatically deactivates contained activities when the containing activity is deactivated.
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
 *   private _dialogRouter = this.createActiveRouter();
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
 *   detail = this.createActiveRouter();
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
			new ObservableList<Activity>().attachItems(true),
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
	 * - This method adds the activity to the list of activities that are considered by {@link routeAsync()}.
	 * @param activity The activity to be added
	 * @param activate True if the activity should be activated immediately
	 */
	add(activity: Activity, activate?: boolean) {
		this._list.add(activity);
		if (activate) activity.activate();
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
		return this.add(activity, activate);
	}

	/** Removes all activities and cancels pending navigation */
	clear() {
		this._list.clear();
		this._navIdx++;
		this._hasMatched = false;
		return this;
	}

	/**
	 * Disables or enables path matching for this router
	 * - When disabled, calls to {@link routeAsync()} will be ignored. The router created by {@link Activity.createActiveRouter} automatically disables and enables path matching when the containing activity is deactivated or activated, using this method.
	 * @param disable True (default) to disable path matching; false to enable
	 */
	disableMatch(disable = true) {
		this._disabled = disable;
	}

	/**
	 * Routes to the matching activity for the given path
	 * - This method calls {@link Activity.matchNavigationPath()} on all contained activities. It then activates the first activity that returns a truthy value, after checking {@link Activity.canDeactivateAsync()} on currently active activities, if any.
	 * - If the matching {@link Activity.matchNavigationPath()} returned a function, this method calls it after activation
	 * @param path The path to route to
	 * @returns The activity that was activated, or undefined if no match
	 * @error This method throws an error if an activity blocks deactivation via {@link Activity.canDeactivateAsync}.
	 */
	async routeAsync(path: string): Promise<Activity | undefined> {
		let list = this._list.toArray();
		if (this._disabled || this.isUnlinked() || !list.length) return;

		// find matching activity
		let toActivate: Activity | undefined;
		let postActivate: (() => void) | undefined;
		for (let activity of list) {
			let match = activity.matchNavigationPath(path);
			if (match) {
				toActivate = activity;
				if (typeof match === "function") postActivate = match;
				break;
			}
		}

		// navigate only if activity matched, or if routing was previously active
		if (!toActivate && !this._hasMatched) return;
		if (toActivate) this._hasMatched = true;

		// deactivate others first
		let navIdx = ++this._navIdx;
		let success = await this._deactivateOthersAsync(list, toActivate, navIdx);
		if (!success) {
			throw err(ERROR.Route_Cancelled);
		}

		// activate the target, if not cancelled or stale
		if (navIdx !== this._navIdx || this.isUnlinked()) return;
		if (toActivate && !toActivate.isUnlinked() && !toActivate.isActive()) {
			toActivate.activate();
		}
		postActivate?.();

		return toActivate;
	}

	/** Deactivates all activities except the target; returns false if blocked or stale */
	private async _deactivateOthersAsync(
		list: Activity[],
		except: Activity | undefined,
		navIdx: number,
	) {
		for (let activity of list) {
			if (navIdx !== this._navIdx || this.isUnlinked()) return false;
			if (activity === except || !activity.isActive()) continue;
			let canLeave = await safeCall(activity.canDeactivateAsync, activity);
			if (navIdx !== this._navIdx || this.isUnlinked()) return false;
			if (canLeave === false) {
				this._navIdx++;
				return false;
			}
			activity.deactivate();
		}
		return true;
	}

	private _disabled?: boolean;
	private _hasMatched?: boolean;
	private _navIdx = 0;
	private _list: ObservableList<Activity>;
}
