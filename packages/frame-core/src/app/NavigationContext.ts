import { ManagedObject } from "../base/index.js";
import { invalidArgErr, safeCall } from "../errors.js";
import { Activity } from "./Activity.js";
import type { NavigationTarget } from "./NavigationTarget.js";

/**
 * An object that encapsulates the current location within the application navigation stack, part of the global application context
 * - An instance of this class is available as {@link GlobalContext.navigation app.navigation}.
 * - This object contains the current location, represented as page ID and detail strings. In a URL-like path, the page ID is the first segment, and the detail is the remainder of the path.
 * - When overridden by a platform-specific (or test) implementation, this object also provides a way to navigate to a new location.
 * @hideconstructor
 */
export class NavigationContext extends ManagedObject {
	/** The current page location, read-only */
	get pageId() {
		return this._pageId;
	}

	/** The current location detail, read-only */
	get detail() {
		return this._detail;
	}

	/** The page ID that was last matched to an activity, if any */
	get matchedPageId() {
		return this._matchedPageId;
	}

	/** Adds an activity that gets activated when its `navigationPageId` matches the current page */
	addPage(activity: Activity) {
		this._pages.add(activity);
		this._checkPage(activity);
		return this;
	}

	/**
	 * Sets the current location, and activates any matching page activities
	 * - This method doesn't affect the navigation history or platform-specific navigation. To navigate to a new location, use {@link navigateAsync()} instead.
	 * @error This method throws an error if the page ID is invalid (i.e. contains slashes `/` or `\`, or starts with a dot `.`).
	 */
	set(pageId: string, detail = "") {
		pageId = String(pageId || "");
		if (/^\.|[\/\\]/.test(pageId)) throw invalidArgErr("pageId");
		detail = String(detail || "");
		this._pageId = pageId;
		this._detail = detail;
		this.emitChange("Set");
		this._checkPages();
		return this;
	}

	/** Resets the current location without navigating, and removes all page activity references */
	clear() {
		this._pages.clear();
		return this.set("");
	}

	/**
	 * Navigates to the specified location
	 * @summary When implemented by a platform-specific (or test) implementation, this method sets the application location to the provided target. Different navigation _modes_ allow for the path to be added to the history stack, to replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link GlobalContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param target The target location, if any
	 * @param mode The navigation mode, an object of type {@link NavigationContext.NavigationMode}
	 */
	async navigateAsync(
		target?: NavigationTarget,
		mode?: NavigationContext.NavigationMode,
	) {
		// nothing here
	}

	/** Activate and deactivate activities based on the current page ID, asynchronously */
	private _checkPages() {
		let matched = false;
		for (let activity of this._pages) {
			if (typeof activity.navigationPageId !== "string") continue;
			if (this._checkPage(activity)) matched = true;
		}
		this.emit(matched ? "PageMatch" : "PageNotFound");
	}

	/** Activate/deactivate single activity based on navigation location */
	private _checkPage(activity: Activity) {
		let pageId = this._pageId;
		let match = pageId === activity.navigationPageId;
		if (match) this._matchedPageId = pageId;
		let isUp =
			(activity.isActive() || activity.isActivating()) &&
			!activity.isDeactivating();

		// deactivate activity immediately if no match
		if (!match) {
			if (isUp) safeCall(activity.deactivateAsync, activity);
			return false;
		}

		// activate and handle detail, asynchronously (!)
		let detail = this._detail;
		safeCall(async () => {
			await Promise.resolve();
			try {
				if (
					activity.isUnlinked() ||
					pageId !== this._pageId ||
					detail !== this._detail
				)
					return;
				if (!isUp) await activity.activateAsync();
				if (activity.isActive()) {
					await activity.handleNavigationDetailAsync(detail, this);
				}
			} catch (err) {
				throw err;
			}
		});
		return true;
	}

	private _pageId = "";
	private _detail = "";
	private _matchedPageId?: string;

	// keep track of activities in an attached list
	private _pages = new Set<Activity>();
}

export namespace NavigationContext {
	/**
	 * Type definition for an object supported by {@link GlobalContext.navigate app.navigate()} and {@link NavigationContext.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean;
	};
}
