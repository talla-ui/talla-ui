import { StringConvertible } from "@talla-ui/util";
import { invalidArgErr, safeCall } from "../errors.js";
import { ObservableList, ObservableObject } from "../object/index.js";
import { Activity } from "./Activity.js";
import { AppContext } from "./AppContext.js";

/**
 * An abstract class that encapsulates the current location within the application navigation stack, part of the global application context
 * - An instance of this class is available as {@link AppContext.navigation app.navigation}, set by the platform-specific renderer package.
 * - This object contains the current location, represented as a path string. The path is matched against the {@link Activity.navigationPath} property of all activities in {@link AppContext.activities app.activities}.
 * - If a match is found, the activity is activated, and the `Match` event is emitted. If no match is found, the `NotFound` event is emitted.
 * - When a new path is set, a `Set` change event is emitted.
 * @docgen {hideconstructor}
 */
export abstract class NavigationContext extends ObservableObject {
	/** Creates a new instance; do not use directly */
	constructor() {
		super();

		// listen to AppContext.activities for new activities
		let activities = AppContext.getInstance().activities;
		this._activities = activities.listen({
			init: (_, stop) => {
				this.listen({ unlinked: stop });
			},
			handler: (_, e) => {
				let matched = this._matched;
				if (e.data.added) {
					AppContext.getInstance().schedule(() => {
						if (matched === this._matched) this._matchActivities();
					});
				}
			},
		});
	}

	/** The current navigation path, read-only */
	get path() {
		return this._path;
	}

	/** The path that was last matched to an activity, if any */
	get matchedPath() {
		return this._matchedPath;
	}

	/**
	 * Navigates to the specified path
	 * @summary When implemented by a platform-specific (or test) implementation, this method sets the navigation path to the provided target. Different navigation _modes_ allow for the path to be added to the history stack, to replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link AppContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param target The target path, if any
	 * @param mode The navigation mode, an object of type {@link NavigationContext.NavigationMode}
	 */
	abstract navigateAsync(
		target?: StringConvertible,
		mode?: NavigationContext.NavigationMode,
	): Promise<void>;

	/**
	 * Sets the current navigation path, and activates any matching activities from {@link AppContext.activities app.activities}
	 * - This method doesn't affect the navigation history or platform-specific navigation. To navigate to a new path, use {@link navigateAsync()} instead.
	 * @error This method throws an error if the path is invalid (i.e. starts or ends with a dot or a slash).
	 */
	set(path: string) {
		path = String(path || "");
		if (/^[\/.]|[\/.]$/.test(path)) throw invalidArgErr("path");

		// set internal value and emit change first
		this._path = path;
		this.emitChange("Set");

		// find matching activity from all root activities
		let matched = this._matchActivities();
		this.emit(matched ? "Match" : "NotFound");
		return this;
	}

	/** Resets the current path silently without activating or deactivating any activities */
	clear() {
		this._path = "";
		return this;
	}

	/** Finds matching activities from the list, returns true if any were found */
	private _matchActivities() {
		if (!this._activities || this.isUnlinked()) return false;
		let matched = false;
		for (let activity of this._activities) {
			if (typeof activity.navigationPath !== "string") continue;
			if (safeCall(this._handleActivity, this, activity as any)) matched = true;
		}
		if (matched) this._matched++;
		return matched;
	}

	/** Activate/deactivate single activity based on navigation path */
	private _handleActivity(activity: Activity & { navigationPath: string }) {
		if (activity.isUnlinked() || this.isUnlinked()) return false;

		// check if the path matches, and run method to check
		let activityPath = activity.navigationPath;
		let pathMatch =
			activityPath === "" ||
			this._path === activityPath ||
			this._path.startsWith(activityPath + "/");
		let matchResult =
			pathMatch &&
			activity.matchNavigationPath(
				this._path.slice(activityPath.length).replace(/^\/+/, ""),
			);
		let matchActivity: Activity | undefined;
		if (matchResult) {
			if (matchResult instanceof Activity) {
				matchActivity = matchResult;
				if (matchActivity.isUnlinked() || matchActivity === activity) {
					throw RangeError();
				}
			}
			this._matchedPath = this._path;
			activity.emit("PathMatch", { path: this._path });
		}

		// check if activity is already active or activating
		let isUp =
			(activity.isActive() || activity.isActivating()) &&
			!activity.isDeactivating();

		// deactivate activity immediately if no match
		if (!matchResult) {
			if (isUp) safeCall(activity.deactivateAsync, activity);
			return false;
		}

		// activate asynchronously
		safeCall(async () => {
			await Promise.resolve();
			if (activity.isUnlinked() || this.isUnlinked()) return;
			if (!isUp) await activity.activateAsync();
			if (!activity.isActive()) return;

			// attach and activate sub activity as well, if any
			if (matchActivity && !matchActivity.isUnlinked()) {
				await activity.attachActivityAsync(matchActivity, true);
			}
		});
		return true;
	}

	private _path = "";
	private _matched = 0;
	private _matchedPath?: string;
	private _activities?: ObservableList<Activity>;
}

export namespace NavigationContext {
	/**
	 * Type definition for an object supported by {@link AppContext.navigate app.navigate()} and {@link NavigationContext.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 * - Set the `replace` property to `"prefix"` to replace the current path _only_ if the current path matches the provided prefix. If the prefix ends with a slash, it matches if the current path starts with the prefix. If the prefix does not end with a slash, it matches both if the current path is equal to the prefix, and if the current path is a sub path of the prefix (i.e. `"foo"` matches both `"foo"` and `"foo/bar"`, but `"foo/"` matches only `"foo/bar"`, not `"foo"` itself). This can be used to implement a list-detail navigation pattern, or a tabbed navigation pattern.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean | "prefix";
		prefix?: string;
	};
}
