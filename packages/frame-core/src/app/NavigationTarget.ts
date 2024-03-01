import type { StringConvertible } from "../base/index.js";
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
	constructor(
		target?:
			| string
			| { getNavigationTarget(): NavigationTarget }
			| Partial<Pick<NavigationTarget, "pageId" | "detail" | "title">>,
		detail?: string,
		title?: StringConvertible,
	) {
		if (typeof target === "string") {
			let [pageId, ...detailParts] = target.replace(/^\/+|\/+$/, "").split("/");
			(this.pageId = pageId), (this.detail = detailParts.join("/"));
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
