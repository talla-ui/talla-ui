import { ManagedEvent, ManagedObject } from "../base/index.js";
import { invalidArgErr, safeCall } from "../errors.js";
import { Activity } from "./Activity.js";
import { ActivityList } from "./ActivityList.js";
import type { NavigationTarget } from "./NavigationTarget.js";

/**
 * An object that encapsulates the current location within the application navigation stack, part of the global application context
 * - An instance of this class is available as {@link AppContext.navigation app.navigation}.
 * - This object contains the current location, represented as page ID and detail strings. In a URL-like path, the page ID is the first segment, and the detail is the remainder of the path.
 * - When overridden by a platform-specific (or test) implementation, this object also provides a way to navigate to a new location.
 * @docgen {hideconstructor}
 */
export class NavigationContext extends ManagedObject {
	/** Creates a new instance; do not use directly */
	constructor(activities: ActivityList) {
		super();
		this._activities = activities;

		// listen for new activities on the activity list until unlinked
		activities.listen({
			init: (_: unknown, stop: () => void) => {
				this.listen({ unlinked: stop });
			},
			handler: (_: unknown, event: ManagedEvent) => {
				if (
					event.data.added instanceof Activity &&
					typeof event.data.added.navigationPageId === "string"
				) {
					this._checkPage(event.data.added);
				}
			},
		});
	}

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

	/**
	 * Navigates to the specified location
	 * @summary When implemented by a platform-specific (or test) implementation, this method sets the application location to the provided target. Different navigation _modes_ allow for the path to be added to the history stack, to replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link AppContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param target The target location, if any
	 * @param mode The navigation mode, an object of type {@link NavigationContext.NavigationMode}
	 */
	async navigateAsync(
		target?: NavigationTarget,
		mode?: NavigationContext.NavigationMode,
	) {
		// nothing here
	}

	/**
	 * Sets the current location, and activates any matching page activities from {@link AppContext.activities app.activities}
	 * - This method doesn't affect the navigation history or platform-specific navigation. To navigate to a new location, use {@link navigateAsync()} instead.
	 * @error This method throws an error if the page ID is invalid (i.e. contains slashes `/` or `\`, or starts with a dot `.`).
	 */
	set(pageId: string, detail = "") {
		pageId = String(pageId || "");
		detail = String(detail || "");
		if (/^\.|[\/\\]/.test(pageId)) throw invalidArgErr("pageId");

		// set internal values and emit change first
		this._pageId = pageId;
		this._detail = detail;
		this.emitChange("Set");

		// find matching page from all root activities
		let matched = false;
		for (let activity of this._activities) {
			if (typeof activity.navigationPageId !== "string") continue;
			if (this._checkPage(activity)) matched = true;
		}
		this.emit(matched ? "PageMatch" : "PageNotFound");
		return this;
	}

	/** Resets the current location silently without activating or deactivating any activities */
	clear() {
		this._pageId = "";
		this._detail = "";
		return this;
	}

	/** Activate/deactivate single activity based on navigation location */
	private _checkPage(activity: Activity) {
		if (activity.isUnlinked() || this.isUnlinked()) return false;
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
					this.isUnlinked() ||
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
	private _activities: ActivityList;
}

export namespace NavigationContext {
	/**
	 * Type definition for an object supported by {@link AppContext.navigate app.navigate()} and {@link NavigationContext.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean;
	};
}
