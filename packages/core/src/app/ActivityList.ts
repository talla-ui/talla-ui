import { ObservedList, ObservedObject } from "../object/index.js";
import { Activity } from "./Activity.js";

/**
 * A class that contains a list of activities
 * - An instance of this class is available as {@link AppContext.activities app.activities}. To add an activity to the app, you can also use the {@link AppContext.addActivity} method.
 * - The activity list object emits a change event when an activity is added or removed. Event names are either `Change`, `Add`, or `Remove`, with activities referenced by `added` or `removed` event data properties if possible.
 * - All events from activities in the list are re-emitted from the activity list itself.
 * - This class provides an iterator symbol method, making each instance iterable using a `for` loop.
 * @see {@link NavigationContext}
 * @see {@link AppContext.addActivity}
 * @docgen {hideconstructor}
 */
export class ActivityList extends ObservedObject {
	/**
	 * A reference to the _last_ activity in the list that was activated
	 * - This reference is set when an activity in the list emits an `Active` change event, either from the list or from a nested activity list.
	 * - This reference is **not** updated when the activity is deactivated or unlinked.
	 */
	activated?: Activity = undefined;

	/** The number of activities or activity lists that have been added to this list */
	get count() {
		return this._list.count;
	}

	/** Returns an array of all (nested) activities in this list */
	getActivities() {
		let result: Activity[] = [];
		for (let activity of this._list) {
			if (activity instanceof ActivityList) {
				result.push(...activity.getActivities());
			} else {
				result.push(activity);
			}
		}
		return result;
	}

	/** Returns the first activity in the list that is an instance of the specified class */
	getInstance<T extends Activity>(
		type: new (...args: any[]) => T,
	): T | undefined {
		return this._list.find((activity) => activity instanceof type) as
			| T
			| undefined;
	}

	/** Iterator symbol, allows for iterating over activities */
	[Symbol.iterator](): IterableIterator<Activity> {
		return this.getActivities()[Symbol.iterator]();
	}

	/** Adds (and attaches) the specified activities or activity lists */
	add(...activities: (Activity | ActivityList)[]) {
		for (let activity of activities) {
			this._list.add(activity);
			if (activity instanceof Activity) {
				this.emitChange("Add", { added: activity });
			}
		}
		return this;
	}

	/**
	 * Removes the specified activities
	 * - Note that activities are also automatically removed when unlinked.
	 */
	remove(...activities: Activity[]) {
		for (let activity of activities) {
			if (this._list.includes(activity)) {
				this._list.remove(activity);
				this.emitChange("Remove", { removed: activity });
			}
		}
		return this;
	}

	/**
	 * Removes and unlinks all activities from the list
	 * - This method is called automatically by {@link AppContext.clear()}.
	 */
	clear() {
		this._list.clear();
		this.emitChange();
		return this;
	}

	// keep track of activities in an attached list
	private _list = this.attach(
		new ObservedList<Activity | ActivityList>(),
		(e) => {
			// if Active event, update own `activated` property
			if (
				e.name === "Active" &&
				e.data.change === e.source &&
				this.getActivities().includes(e.source as any)
			) {
				this.activated = e.source as Activity;
			}

			// re-emit all events *except* changes from the list itself
			if (e.source !== this._list) this.emit(e);
		},
	);
}
