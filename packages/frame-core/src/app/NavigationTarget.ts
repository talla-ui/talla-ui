import type { LazyString, StringConvertible } from "../base/index.js";
import { invalidArgErr } from "../errors.js";
import { Activity } from "./Activity.js";

/**
 * An object that represents a target navigation location and title
 * @description
 * A NavigationTarget object can be used to communicate a location that the application can navigate to, along with title text. Objects are typically created from activity instances or URL-like paths, and can be used with {@link UIButton.navigateTo} or directly with {@link GlobalContext.navigate app.navigate}.
 * @see {@link Activity.getNavigationTarget}
 * @see {@link UIButton.navigateTo}
 * @see {@link GlobalContext.navigate}
 */
export class NavigationTarget {
	/**
	 * Creates a new navigation target object
	 * - This constructor can be used to create a new navigation target, from a variety of input types.
	 * - If the target is a string or {@link LazyString} object, it's parsed as a URL-like path (e.g. `page` or `page/detail`).
	 * - If the target is an object with a `getNavigationTarget` method, the method is called to get the target.
	 * - Otherwise, the target is assumed to be an object with (optional) `pageId`, `detail`, and `title` properties. Further parameters can be provided to override these properties.
	 * @param target The navigation target as a string or object
	 * @param detail Additional detail for the navigation target
	 * @param title The title of the navigation target, overriding the title provided if the target is an object
	 * @error This constructor throws an error if the target is a string and starts with a dot (relative paths are not allowed).
	 */
	constructor(
		target?:
			| string
			| LazyString
			| { getNavigationTarget(): NavigationTarget }
			| Partial<Pick<NavigationTarget, "pageId" | "detail" | "title">>,
		detail?: string,
		title?: StringConvertible,
	) {
		if (typeof target === "string" || target instanceof String) {
			let [pageId, ...detailParts] = String(target)
				.replace(/^\/+|\/+$/, "")
				.split("/");
			if (pageId![0] === ".") throw invalidArgErr("target");
			this.pageId = pageId;
			this.detail = detailParts.join("/");
		} else if (target) {
			if ("getNavigationTarget" in target) {
				target = target.getNavigationTarget();
			}
			this.pageId = target.pageId;
			this.detail = target.detail || "";
			this.title = target.title;
		}
		if (detail) this.detail = detail;
		if (title !== undefined) this.title = title;
	}

	/** The target page ID */
	readonly pageId?: string;

	/**
	 * The target navigation detail
	 * - In an URL-like representation, the `detail` string is the remainder of the path after the page ID
	 */
	readonly detail: string = "";

	/** The title of the navigation target */
	readonly title?: StringConvertible;
}
