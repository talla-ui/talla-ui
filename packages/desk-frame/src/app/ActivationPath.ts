import { ManagedObject } from "../core/index.js";
import { Activity } from "./Activity.js";

/**
 * An object that encapsulates a string representing the current application location, part of the global application context
 */
export class ActivationPath extends ManagedObject {
	/**
	 * The current location
	 * - The location is stored in URL format without leading or trailing slashes (e.g. `foo/bar/123`).
	 * - If no path is set, it defaults to the empty string.
	 * - Any changes to this property automatically result in a change event on the {@link ActivationPath} instance, causing activities to activate or deactivate if needed.
	 */
	get path() {
		return this._path;
	}
	set path(path) {
		path = String(path || "").replace(/^\/+|\/+\s*$/g, "");
		if (this._path !== path) {
			this._path = path;
			this._split = path ? path.split("/") : [];
			this.emitChange();
		}
	}

	/** Resets the activation path to an empty string */
	clear() {
		this.path = "";
		return this;
	}

	/**
	 * Navigates to the specified (relative) path
	 * @summary This method sets the application location to the provided target path, which in turn updates the {@link ActivationPath.path} property asynchronously. Different navigation _modes_ allow for the path to be added to the history stack, replace the current path if possible, or to navigate back before adding or replacing the path.
	 * @note This method is used by {@link GlobalContext.navigate()}, which is available as `app.navigate()` for convenience.
	 * @param path The target location path, in URL format, or `:back` to go back in navigation history
	 * @param mode The navigation mode, an object of type {@link ActivationPath.NavigationMode}
	 */
	async navigateAsync(path: string, mode?: ActivationPath.NavigationMode) {
		// nothing here
	}

	/**
	 * Checks if the current location matches the specified activity path
	 * @summary This method returns undefined if the specified path doesn't match, or an object with additional information if it does.
	 * - If the path includes a trailing slash (e.g. `foo/bar/`), it matches both the exact location as well as any paths that start with the provided path (e.g. `foo/bar/123).
	 * - If an activity argument is provided, the prefix `./` is replaced with the path of the closest origin (attached) activity that has a {@link Activity.path path} string property, recursively.
	 *
	 * The provided path may include 'captures':
	 * - `:foo` matches a single path segment
	 * - `*foo` matches the full remainder (but not an empty string)
	 * @param path The activity path to match, including captures (e.g. `foo/bar/:id`)
	 * @param activity An activity that's used to search for containing paths if needed
	 * @returns A match object containing the full path and captures (typed as {@link ActivationPath.Match}), if the path was matched
	 */
	match(path: string, activity?: Activity): ActivationPath.Match | undefined {
		path = String(path || "");

		// recursively replace `./` prefix with parent path, if needed
		while (activity && path[0] === "." && path[1] === "/") {
			activity = Activity.whence(activity) as any;
			if (activity instanceof Activity && typeof activity.path === "string") {
				path = activity.path.replace(/\/+\s*$/, "") + path.slice(1);
			}
		}

		// remove leading and trailing slashes
		let partial = false;
		while (path.slice(-1) === "/") {
			path = path.slice(0, -1);
			partial = true;
		}
		if (path[0] === "/") {
			path = path.slice(1);
		}

		// now go through all path segments, stop as soon as match fails
		let segments = path ? path.split("/") : [];
		let split = this._split;
		let result: any = { path: this._path };
		for (let i = 0; i < split.length; i++) {
			if (i >= segments.length) {
				// if current path is longer, match only if partial
				return partial ? result : undefined;
			}
			let segment = segments[i]!;
			if (segment[0] === "*") {
				// capture complete remainder and return
				if (segments.length > i + 1) return undefined;
				result[segment.slice(1)] = split.slice(i).join("/");
				return result;
			}
			if (segment[0] === ":" && split[i]) {
				// capture this segment and continue
				result[segment.slice(1)] = split[i]!;
			} else if (segments[i] !== split[i]) {
				// no match
				return undefined;
			}
		}

		// matched only if path was same length
		if (segments.length === split.length) return result;
	}

	private _path = "";
	private _split: string[] = [];
}

export namespace ActivationPath {
	/**
	 * Type definition for matched path information, including the full path and capture strings
	 * @description Objects of this type are returned by {@link ActivationPath.match()}, and stored by {@link Activity} as the {@link Activity.pathMatch pathMatch} property. If a patch matched the current location, the `Match` result includes both the full path that was matched (i.e. `path`) as well as the values of all captures (e.g. `:foo` or `*foo` as a property `foo` on this object).
	 */
	export type Match = Readonly<{
		/** The full path that was matched */
		path: string;
		[captureId: string]: string;
	}>;

	/**
	 * Type definition for an object supported by {@link GlobalContext.navigate app.navigate()} and {@link ActivationPath.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean;
	};
}
