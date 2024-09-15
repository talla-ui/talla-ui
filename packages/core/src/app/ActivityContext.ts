import { ManagedList, ManagedObject } from "../base/index.js";
import { Activity } from "./Activity.js";

/**
 * A class that contains all root activities, part of the global application context
 * - An instance of this class is available as {@link AppContext.activities app.activities}. However, to add an activity to the context, you can use the {@link AppContext.addActivity} method instead.
 * - The activity context instance emits a change event when an activity is added. This event is used by the navigation context to assess whether the activity needs to be activated immediately.
 * @see {@link NavigationContext}
 * @see {@link AppContext.addActivity}
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
		this.emitChange("ActivityAdded", { activity });
		return this;
	}

	/**
	 * Removes and unlinks all root activities
	 * - This method is called automatically by {@link AppContext.clear()}.
	 */
	clear() {
		this._list.clear();
		return this;
	}

	// keep track of activities in an attached list
	private _list = this.attach(new ManagedList().restrict(Activity));
}
