import { ManagedList, ManagedObject, bound } from "../base/index.js";
import { errorHandler } from "../errors.js";
import { Activity } from "./Activity.js";
import { type GlobalContext } from "./GlobalContext.js";
import { NavigationPath } from "./NavigationPath.js";

/** Reused binding for navigation path reference on activities */
const _boundNavigationPath = bound.string("navigationPath.path");

/**
 * A class that contains root activities and the navigation path, part of the global application context
 * @hideconstructor
 */
export class ActivityContext extends ManagedObject {
	/** Creates a new instance of this class; do not use directly */
	constructor() {
		super();
		this.autoAttach("navigationPath");
	}

	/**
	 * The current navigation path instance
	 * - This property defaults to a plain {@link NavigationPath} instance but will be overridden by a platform-specific context package.
	 */
	navigationPath = new NavigationPath();

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
		let paths: any[] = [];
		_boundNavigationPath.bindTo(activity, (path) =>
			Promise.resolve()
				.then(() => this._handleNavigationPathChangeAsync(activity, path))
				.catch(errorHandler),
		);
		this._list.add(activity);
		paths.push(this.navigationPath.path);
		this._handleNavigationPathChangeAsync(
			activity,
			this.navigationPath.path,
		).catch(errorHandler);
		return this;
	}

	/**
	 * Removes all activities and resets the navigation path
	 * - This method is called automatically by {@link GlobalContext.clear()}.
	 */
	clear() {
		this._list.clear();
		this.navigationPath.clear();
		return this;
	}

	private async _handleNavigationPathChangeAsync(
		activity: Activity,
		path?: string,
	) {
		if (
			activity.isUnlinked() ||
			activity.navigationPageId === undefined ||
			this.navigationPath.path !== path
		)
			return;

		// activate/deactivate activity based on navigation path
		let { pageId, detail } = this.navigationPath;
		let match = pageId === activity.navigationPageId;
		let isUp =
			(activity.isActive() || activity.isActivating()) &&
			!activity.isDeactivating();
		if (!match && isUp) await activity.deactivateAsync();
		else if (match && !isUp) await activity.activateAsync();

		// if activity is (still) active, handle navigation detail
		if (activity.isActive()) {
			await activity.handleNavigationDetailAsync(detail, this.navigationPath);
		}
	}

	// keep track of activities in an attached list
	private _list = this.attach(new ManagedList().restrict(Activity));
}
