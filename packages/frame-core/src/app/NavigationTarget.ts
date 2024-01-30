import type { StringConvertible } from "../base/index.js";
import { Activity } from "./Activity.js";

/**
 * An object that represents a target navigation path and title
 *
 * @description
 * An instance of NavigationTarget can be used to communicate a path that the application can navigate to, along with title text. These are typically created from activity instances, and can be used with {@link UIButton.navigateTo} or directly with {@link GlobalContext.navigate app.navigate}.
 * @see {@link Activity.navigationPageId}
 * @see {@link Activity.getNavigationTarget}
 * @see {@link UIButton.navigateTo}
 * @see {@link GlobalContext.navigate}
 */
export class NavigationTarget {
	/**
	 * Creates a new NavigationTarget instance using an activity, or path and title
	 * - If an activity is provided, its {@link Activity.navigationPageId navigationPageId} is used as the path, and its {@link Activity.title} is used as the title.
	 */
	constructor(path: StringConvertible | Activity, title?: StringConvertible) {
		if (path instanceof Activity) {
			this._activity = path;
			this.title = title ?? path.title;
		} else {
			this._path = String(path);
			this.title = title;
		}
	}

	/** The title of the navigation target */
	title?: StringConvertible;

	/** Returns a path string for the navigation target */
	toString() {
		let path = this._activity ? this._activity.navigationPageId : this._path;
		return (path || "") + (this._detail ? "/" + this._detail : "");
	}

	/**
	 * Adds parameters to the navigation target path
	 * @returns The object itself
	 */
	append(...params: StringConvertible[]) {
		this._detail = [this._detail, ...params]
			.join("/")
			.replace(/^\/+|\/+\s*$/g, "");
		return this;
	}

	private _path?: string;
	private _activity?: Activity;
	private _detail?: string;
}
