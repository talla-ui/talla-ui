import { ManagedList, ManagedObject } from "../base/index.js";
import { safeCall } from "../errors.js";
import { Activity } from "./Activity.js";
import { NavigationController } from "./NavigationController.js";

/**
 * A class that contains root activities and the navigation controller, part of the global application context
 * @hideconstructor
 */
export class ActivityContext extends ManagedObject {
	/** Creates a new instance of this class; do not use directly */
	constructor() {
		super();
		this.autoAttach("navigationController", () => this._update());
	}

	/**
	 * The current navigation controller
	 * - This property defaults to a plain {@link NavigationController} instance but will be overridden by a platform-specific context package.
	 */
	navigationController = new NavigationController();

	/** Returns an array of all activities that are currently active */
	getActive() {
		return this._list.filter((a) => a.isActive());
	}

	/** Returns an array of all current activities */
	getAll() {
		return this._list.toArray();
	}

	/**
	 * Adds the specified activity
	 */
	add(activity: Activity) {
		this._list.add(activity);
		this._checkActivity(activity);
		return this;
	}

	/**
	 * Removes all activities and resets the navigation controller
	 * - This method is called automatically by {@link GlobalContext.clear()}.
	 */
	clear() {
		this._list.clear();
		this.navigationController.clear();
		return this;
	}

	/** Activate and deactivate activities based on the current page ID, asynchronously */
	private _update() {
		for (let activity of this._list) {
			if (!activity.navigationPageId) continue;
			this._checkActivity(activity);
		}
	}

	/** Activate/deactivate single activity based on navigation location */
	private _checkActivity(activity: Activity) {
		let { pageId, detail } = this.navigationController;
		let match = pageId === activity.navigationPageId;
		let isUp =
			(activity.isActive() || activity.isActivating()) &&
			!activity.isDeactivating();
		if (!match && isUp) {
			// deactivate activity immediately, no match
			safeCall(activity.deactivateAsync, activity);
		} else if (match) {
			// activate and handle detail, asynchronously (!)
			safeCall(async () => {
				await Promise.resolve();
				try {
					if (
						activity.isUnlinked() ||
						pageId !== this.navigationController.pageId ||
						detail !== this.navigationController.detail
					)
						return;
					if (!isUp) await activity.activateAsync();
					if (activity.isActive()) {
						await activity.handleNavigationDetailAsync(
							detail,
							this.navigationController,
						);
					}
				} catch (err) {
					throw err;
				}
			});
		}
	}

	// keep track of activities in an attached list
	private _list = this.attach(new ManagedList().restrict(Activity));
}
