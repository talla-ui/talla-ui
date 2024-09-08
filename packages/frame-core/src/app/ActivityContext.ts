import { ManagedList, ManagedObject } from "../base/index.js";
import { Activity } from "./Activity.js";

/**
 * A class that contains all root activities, part of the global application context
 * - An instance of this class is available as {@link GlobalContext.activities app.activities}.
 * - To add an activity to the context, use the {@link GlobalContext.addActivity} method. This method also coordinates the activation and deactivation of activities based on the current navigation location.
 * @docgen {hideconstructor}
 */
export class ActivityContext extends ManagedObject {
	/** Returns an array of all activities that are currently active _or_ activating */
	getActive() {
		return this._list.filter((a) => a.isActive() || a.isActivating());
	}

	/** Returns an array of all current activities */
	getAll() {
		return this._list.toArray();
	}

	/** Adds (and attaches) the specified root activity */
	add(activity: Activity) {
		this._list.add(activity);
		return this;
	}

	/**
	 * Removes and unlinks all root activities
	 * - This method is called automatically by {@link GlobalContext.clear()}.
	 */
	clear() {
		this._list.clear();
		return this;
	}

	// keep track of activities in an attached list
	private _list = this.attach(new ManagedList().restrict(Activity));
}
