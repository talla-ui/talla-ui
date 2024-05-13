import { ManagedList, ManagedObject } from "../base/index.js";
import { safeCall } from "../errors.js";
import { Activity } from "./Activity.js";
import { NavigationController } from "./NavigationController.js";

/**
 * A class that contains root activities and the navigation controller, part of the global application context
 * - An instance of this class is available as {@link GlobalContext.activities app.activities}.
 * - This class is responsible for matching the page ID from the navigation controller to the activities that have been added to the context.
 * - The active context emits a `PageMatch` event when the page ID has changed and an activity was matched, and a `PageNotFound` event when no activity matches the current page ID. Note that the {@link matchedPageId} property is updated immediately, but activities may be activated asynchronously.
 * @hideconstructor
 */
export class ActivityContext extends ManagedObject {
	/** Creates a new instance of this class; do not use directly */
	constructor() {
		super();
		let controller = new NavigationController();
		Object.defineProperty(this, "navigationController", {
			configurable: true,
			enumerable: true,
			get: () => controller,
			set: (value) => {
				if (controller === value) return;
				if (controller) controller.unlink();
				controller = this.attach(value, () => this._update());
				this._update();
			},
		});
	}

	/**
	 * The current navigation controller
	 * - This property defaults to a plain {@link NavigationController} instance but will be overridden by a platform-specific context package.
	 */
	declare navigationController: NavigationController;

	/**
	 * The last page ID that was matched to an activity, if any
	 * - This property is updated immediately when a matching activity has been added, or when the page ID changes. Note that activities may be activated asynchronously. Use the {@link getActive()} method to get the current list of active and activating activities.
	 */
	matchedPageId?: string = undefined;

	/** Returns an array of all activities that are currently active _or_ activating */
	getActive() {
		return this._list.filter((a) => a.isActive() || a.isActivating());
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
		let { pageId, detail } = this.navigationController;
		this._checkActivity(activity, pageId, detail);
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
		let { pageId, detail } = this.navigationController;
		for (let activity of this._list) {
			if (typeof activity.navigationPageId !== "string") continue;
			this._checkActivity(activity, pageId, detail);
		}
		this.emit(this.matchedPageId === pageId ? "PageMatch" : "PageNotFound");
	}

	/** Activate/deactivate single activity based on navigation location */
	private _checkActivity(activity: Activity, pageId: string, detail: string) {
		let match = pageId === activity.navigationPageId;
		if (match) this.matchedPageId = pageId;
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
