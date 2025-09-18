import { StringConvertible } from "@talla-ui/util";
import { invalidArgErr, safeCall } from "../errors.js";
import { ObservableObject } from "../object/index.js";
import { AppContext } from "./AppContext.js";

/**
 * An abstract class that encapsulates the current location within the application navigation stack, part of the global application context
 * - An instance of this class is available as {@link AppContext.navigation app.navigation}, set by the platform-specific renderer package.
 * - This object contains the current location, represented as a path string.
 * - The path is matched against the activities contained by the root activity router, i.e. {@link AppContext.activities app.activities}. If a match is found, the activity is activated, and a `Match` event is emitted. If no match is found after a path change, the `NotFound` event is emitted. Both events contain a `path` property as part of the event data.
 * - When a new path is set, a `Set` change event is emitted.
 * @docgen {hideconstructor}
 */
export abstract class NavigationContext extends ObservableObject {
	/** Creates a new instance; do not use directly */
	constructor() {
		super();

		// wait for activities to be added in this tick, then update
		AppContext.getInstance().schedule(() => this._matchActivityAsync());
	}

	/** The current navigation path, read-only */
	get path() {
		return this._path;
	}

	/** The path that was last matched by the activity router, if any */
	matchedPath?: string;

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

		// find matching activity from all root activities, async
		safeCall(this._matchActivityAsync, this);
		return this;
	}

	/** Resets the current path silently without activating or deactivating any activities */
	clear() {
		this._path = "";
		return this;
	}

	/** Finds a matching root activity to activate, emits an event */
	private async _matchActivityAsync() {
		if (this.isUnlinked()) return;
		let path = this._path;
		if (path === this._last && !this._notFound) return;
		this._last = path;
		this._notFound = false;

		// use the root activity router to activate
		let router = AppContext.getInstance().activities;
		let matched = router.matchNavigationPath(path);

		// if moved on, don't bother to emit
		if (this._path !== path) return;
		if (matched) {
			this.matchedPath = path;
			this.emit("Match", { path });
		} else {
			this._notFound = true;
			this.emit("NotFound", { path });
		}
	}

	private _path = "";
	private _last?: string;
	private _notFound?: boolean;
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
