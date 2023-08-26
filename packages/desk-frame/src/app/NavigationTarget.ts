import { ManagedObject, StringConvertible } from "../core/index.js";
import { Activity } from "./Activity.js";

/**
 * An object that represents a target path and title
 *
 * @description
 * An instance of NavigationTarget can be used to communicate a path that the application can navigate to, along with title text. These are typically created from activity instances, and can be used with {@link UIButton.navigateTo} or directly with {@link GlobalContext.navigate app.navigate}.
 * @see {@link Activity.path}
 * @see {@link Activity.getNavigationTarget}
 * @see {@link UIButton.navigateTo}
 * @see {@link GlobalContext.navigate}
 */
export class NavigationTarget {
	/**
	 * Creates a new NavigationTarget instance using an activity, or path and title
	 * - If an activity is provided, the path of the containing activity may be used to generate the final path. Refer to {@link Activity.path} for details.
	 */
	constructor(path: StringConvertible | Activity, title?: StringConvertible) {
		if (path instanceof ManagedObject) {
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
		let result: string;
		if (!this._activity) {
			// use path string
			result = this._path!;
		} else {
			// use path from activity/ies
			result = String(this._activity.path || "");
			let activity: Activity | undefined = this._activity;
			while (activity && result[0] === "." && result[1] === "/") {
				// replace `./` prefix with parent path, if needed
				activity = Activity.whence(activity);
				if (activity && typeof activity.path === "string") {
					result = activity.path.replace(/\/$/, "") + result.slice(1);
				}
			}
		}

		// replace :captures and *rest, if set
		if (this._capture) {
			result = result.replace(
				/(^|\/)\:([^\/]+)/g,
				(s, prefix, id) => prefix + (this._capture![id] || "")
			);
		}
		if (this._rest) {
			result = result.replace(/(^|\/)\*.*/, (s, prefix) => prefix + this._rest);
		}
		return result;
	}

	/**
	 * Modifies the navigation target path to include the provided values
	 * @param set An object that contains property values for all captures to be filled in
	 * @param rest The value of the 'rest' capture of the original path, if any
	 */
	setCapture(set?: { [captureId: string]: string }, rest?: string) {
		if (set) {
			this._capture = Object.assign(this._capture || Object.create(null), set);
		}
		if (rest) this._rest = rest;
		return this;
	}

	private _path?: string;
	private _activity?: Activity;
	private _capture?: any;
	private _rest?: string;
}
