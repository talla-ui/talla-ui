import { ManagedObject } from "../base/index.js";
import type { NavigationTarget } from "./NavigationTarget.js";

/**
 * An object that encapsulates the current location within the application navigation stack, part of the global application context
 * - This object contains the current location path, as well as the first segment (page ID) and the remainder (detail) of the path.
 * - When overridden by a platform-specific implementation, this object also provides a way to navigate to a new location.
 * @hideconstructor
 */
export class NavigationPath extends ManagedObject {
	/**
	 * The current location, as a string
	 * - The location is represented in URL format without leading or trailing slashes (e.g. `foo` or `foo/bar/123`).
	 * - If no path is set, an empty string is returned.
	 */
	get path() {
		return this._path;
	}
	set path(path) {
		path = String(path || "").replace(/^\/+|\/+\s*$/g, "");
		if (this._path !== path) {
			let idx = path.indexOf("/");
			if (idx < 0) idx = path.length;
			this._path = path;
			this._page = path.slice(0, idx);
			this._detail = path.slice(idx + 1);
			this.emitChange();
		}
	}

	/**
	 * The first segment of the current path
	 * - This property is updated automatically when the {@link path} property changes.
	 * - If the path is empty, this property is set to the empty string.
	 */
	get pageId() {
		return this._page;
	}

	/**
	 * The remainder of the current path, after the first segment
	 * - This property is updated automatically when the {@link path} property changes.
	 * - If the path is empty or contains only one segment, this property is set to the empty string.
	 */
	get detail() {
		return this._detail;
	}

	/** Resets the navigation path to an empty string */
	clear() {
		this.path = "";
		return this;
	}

	/**
	 * Navigates to the specified (relative) path
	 * @summary This method sets the application location to the provided target path, which in turn updates the {@link path} property asynchronously. Different navigation _modes_ allow for the path to be added to the history stack, replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link GlobalContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param path The target location path, in URL format, or `:back` to go back in navigation history
	 * @param mode The navigation mode, an object of type {@link NavigationPath.NavigationMode}
	 */
	async navigateAsync(
		path: string | NavigationTarget,
		mode?: NavigationPath.NavigationMode,
	) {
		// nothing here
	}

	private _path = "";
	private _page = "";
	private _detail = "";
}

export namespace NavigationPath {
	/**
	 * Type definition for an object supported by {@link GlobalContext.navigate app.navigate()} and {@link NavigationPath.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean;
	};
}
