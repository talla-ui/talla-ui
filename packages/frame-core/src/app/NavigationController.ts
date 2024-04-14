import { ManagedObject } from "../base/index.js";
import { invalidArgErr } from "../errors.js";
import type { NavigationTarget } from "./NavigationTarget.js";

/**
 * An object that encapsulates the current location within the application navigation stack, part of the global application context
 * - This object contains the current location, represented as page ID and detail strings. In a URL-like path, the page ID is the first segment, and the detail is the remainder of the path.
 * - When overridden by a platform-specific (or test) implementation, this object also provides a way to navigate to a new location.
 * @hideconstructor
 */
export class NavigationController extends ManagedObject {
	/** The current page location, read-only */
	get pageId() {
		return this._pageId;
	}

	/** The current location detail */
	get detail() {
		return this._detail;
	}

	/**
	 * Sets the current location
	 * - This method doesn't affect the navigation history or platform-specific navigation. To navigate to a new location, use {@link navigateAsync()} instead.
	 * @error This method throws an error if the page ID is invalid (i.e. contains slashes `/` or `\`, or starts with a dot `.`).
	 */
	set(pageId: string, detail = "") {
		pageId = String(pageId || "");
		if (/^\.|[\/\\]/.test(pageId)) throw invalidArgErr("pageId");
		this._pageId = pageId;
		this._detail = String(detail) || "";
		this.emitChange("Set");
		return this;
	}

	/** Resets the current location without navigating */
	clear() {
		return this.set("");
	}

	/**
	 * Navigates to the specified location
	 * @summary When implemented by a platform-specific (or test) implementation, this method sets the application location to the provided target. Different navigation _modes_ allow for the path to be added to the history stack, to replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link GlobalContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param target The target location, if any
	 * @param mode The navigation mode, an object of type {@link NavigationController.NavigationMode}
	 */
	async navigateAsync(
		target?: NavigationTarget,
		mode?: NavigationController.NavigationMode,
	) {
		// nothing here
	}

	private _pageId = "";
	private _detail = "";
}

export namespace NavigationController {
	/**
	 * Type definition for an object supported by {@link GlobalContext.navigate app.navigate()} and {@link NavigationController.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean;
	};
}
