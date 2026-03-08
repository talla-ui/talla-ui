import { StringConvertible } from "@talla-ui/util";
import { invalidArgErr } from "../errors.js";
import { ObservableObject } from "../object/index.js";
import { AppContext } from "./AppContext.js";

/**
 * An abstract class that encapsulates the current location within the application navigation stack, part of the global application context
 * - An instance of this class is available as {@link AppContext.navigation app.navigation}, set by the platform-specific renderer package.
 * - This object contains the current location, represented as a path string.
 * - When a new path is set, a `Set` change event is emitted.
 * @docgen {hideconstructor}
 */
export abstract class NavigationContext extends ObservableObject {
	/** The current navigation path, read-only */
	get path() {
		return this._path;
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
	 * Sets the current navigation path
	 * - This method doesn't affect the navigation history or platform-specific navigation. To navigate to a new path, use {@link navigateAsync()} instead.
	 * @error This method throws an error if the path is invalid (i.e. starts or ends with a dot or a slash).
	 */
	set(path: string) {
		path = String(path || "");
		if (/^[\/.]|[\/.]$/.test(path)) throw invalidArgErr("path");

		// set internal value and emit change first
		this._path = path;
		this.emitChange("Set");
		return this;
	}

	/**
	 * Resolves a relative path against the current navigation path
	 * - Paths starting with `./` are resolved relative to the current path.
	 * - Paths starting with `../` navigate up one segment.
	 * - Absolute paths (not starting with `.`) are returned as-is after normalization.
	 * @param target The path to resolve
	 * @returns The resolved absolute path
	 */
	resolve(target: string): string {
		let path = String(target);
		if (path.startsWith(".")) {
			path = this._path + "/" + path + "/";
		}

		// remove redundant slashes and dots
		path = path.replace(/\/+/g, "/").replace(/^\.\/|\/\.\//g, "/");

		// resolve ../ segments iteratively (each pass resolves one level)
		let prev: string;
		do {
			prev = path;
			path = path.replace(/[^\/]*[^\/\.]\/\.\.\//g, "/").replace(/\/+/g, "/");
		} while (path !== prev);

		return path.replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
	}

	/** Resets the current path silently without activating or deactivating any activities */
	clear() {
		this._path = "";
		return this;
	}

	private _path = "";
}

export namespace NavigationContext {
	/**
	 * Type definition for an object supported by {@link AppContext.navigate app.navigate()} and {@link NavigationContext.navigateAsync()} that indicates how a new location should be applied
	 * - Set the `back` property to `true` to navigate back in history **before** navigating to the new path.
	 * - Set the `replace` property to `true` to **replace** the current path if possible; afterwards, going back in history won't result in the current navigation path, but the one before it.
	 * - Set both properties to `true` to navigate back first, and then replace the (previous) navigation path.
	 * - Set the `replace` property to `"prefix"` to replace the current path _only_ if the current path is a sub-path of the provided prefix (i.e. `"foo"` matches `"foo/bar"` and `"foo/bar/baz"`, but not `"foo"` itself or `"foobar"`). To match any non-root path (for root-level tabs or list-detail), set the prefix to an empty string. This can be used to implement a list-detail navigation pattern, or a tabbed navigation pattern.
	 */
	export type NavigationMode = {
		back?: boolean;
		replace?: boolean | "prefix";
		prefix?: string;
	};
}
