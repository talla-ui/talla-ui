import { NavigationContext, NavigationTarget, app } from "@talla-ui/core";
import { type WebContextOptions } from "./WebContext.js";

/** Global flag for global (window) event listener, see constructor */
let _eventListenerAdded = false;

/**
 * A class that manages the application navigation path using the DOM history API
 * - This class is used automatically when {@link WebContextOptions.useHistoryAPI} is set to true.
 * @see {@link useWebContext()}
 * @docgen {hideconstructor}
 */
export class WebHistoryNavigationContext extends NavigationContext {
	constructor(options: WebContextOptions) {
		super();
		this._basePath = options.basePath.replace(/^\//, "");

		// insert initial history entries if needed
		let initial = this._getPath();
		let insert: string[] = [];
		let base = this._basePath + "/";
		if (options.insertHistory === "root" && initial[0]) {
			insert.push(base);
		}
		if (options.insertHistory && initial[1]) {
			insert.push(base + initial[0]);
		}
		if (insert.length) {
			insert.push(base + initial.join("/"));
		}
		insert.forEach((href, i) =>
			i ? history.pushState({}, "", href) : history.replaceState({}, "", href),
		);

		// set event listener for back/forward navigation
		if (!_eventListenerAdded) {
			window.addEventListener("popstate", () => {
				let self = app.navigation;
				if (self instanceof WebHistoryNavigationContext) {
					self.update();
				}
			});
			_eventListenerAdded = true;
		}
		this.update();
	}

	private readonly _basePath: string;

	/**
	 * Converts the specified path into a valid `href` value
	 * - This method is also used by the `UIButton` renderer to set the `href` attribute for buttons that are rendered as anchor elements.
	 */
	getPathHref(target?: NavigationTarget): string | undefined {
		if (!target || typeof target.pageId !== "string") return;
		let path = (target.pageId + "/" + target.detail)
			.replace(/^\/+|\/+$/g, "")
			.replace(/\/+/g, "/");
		return this._basePath + "/" + path;
	}

	/**
	 * Navigates to the specified path
	 * @param target The navigation target
	 * @param mode The intended mode of navigation, see {@link NavigationContext.NavigationMode}
	 */
	override async navigateAsync(
		target: NavigationTarget,
		mode?: NavigationContext.NavigationMode,
	): Promise<void> {
		if (mode && mode.back) {
			// go back, then continue
			window.history.back();
			if (target && target.pageId != null) {
				// after going back, navigate to given path
				await new Promise((r) => setTimeout(r, 1));
				return this.navigateAsync(target, { ...mode, back: false });
			}
		} else {
			let href = this.getPathHref(target);
			if (href) {
				if (mode && mode.replace) {
					// replace path if requested
					window.history.replaceState({}, document.title, href);
					this.update();
				} else {
					// push path on history stack
					window.history.pushState({}, document.title, href);
					this.update();
				}
			}
		}
	}

	/**
	 * Updates the navigation path from the current window location
	 * - This method is called automatically. It shouldn't be necessary to call this method manually in an application.
	 */
	update() {
		this.set(...this._getPath());
	}

	private _getPath(): [string, string] {
		let target = String(window.location.pathname || "").replace(/^\//, "");
		if (target.startsWith(this._basePath)) {
			target = target.slice(this._basePath.length).replace(/^\//, "");
		}
		let parts = target.replace(/\/$/, "").split("/");
		return [parts[0] || "", parts.slice(1).join("/")];
	}
}
