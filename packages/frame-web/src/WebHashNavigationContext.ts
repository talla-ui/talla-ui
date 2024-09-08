import {
	NavigationContext,
	NavigationTarget,
	app,
} from "@desk-framework/frame-core";
import { type WebContextOptions } from "./WebContext.js";

/** Global flag for global (window) event listener, see constructor */
let _eventListenerAdded = false;

/**
 * A class that manages the application navigation path using the DOM location 'hash' value
 * - This class is used automatically when {@link WebContextOptions.useHistoryAPI} is set to false.
 * @see {@link useWebContext()}
 * @docgen {hideconstructor}
 */
export class WebHashNavigationContext extends NavigationContext {
	/** Creates a new instance; do not use directly */
	constructor(options: WebContextOptions) {
		super();
		this._basePath = options.basePath.replace(/^[#\/]+/, "");

		// insert initial history entries if needed
		let initial = this._getPath();
		let insert: string[] = [];
		let base = "#" + this._basePath + "/";
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

		// set event listener for direct navigation
		if (!_eventListenerAdded) {
			window.addEventListener("hashchange", () => {
				let self = app.navigation;
				if (self instanceof WebHashNavigationContext) {
					self.update();
				}
			});
			_eventListenerAdded = true;
		}
		this.update();
	}

	private readonly _basePath: string;

	/**
	 * Converts the specified navigation target into a valid `href` value
	 * - This method is also used by the `UIButton` renderer to set the `href` attribute for buttons that are rendered as anchor elements.
	 */
	getPathHref(target?: NavigationTarget): string | undefined {
		if (!target || typeof target.pageId !== "string") return;
		let path = (target.pageId + "/" + target.detail)
			.replace(/^\/+|\/+$/g, "")
			.replace(/\/+/g, "/");
		return "#" + this._basePath + "/" + path;
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
			if (target?.pageId != null) {
				// after going back, navigate to given path
				await new Promise((r) => setTimeout(r, 1));
				return this.navigateAsync(target, { ...mode, back: false });
			}
		} else {
			let href = this.getPathHref(target);
			if (href) {
				if (mode?.replace) {
					// replace path if requested
					window.history.replaceState({}, document.title, href);
					this.update(); // above doesn't trigger hash change
				} else {
					// push path on history stack
					window.history.pushState({}, document.title, href);
					this.update();
				}
			}
		}
	}

	/**
	 * Updates the navigation path from the current location hash value
	 * - This method is called automatically. It shouldn't be necessary to call this method manually in an application.
	 */
	update() {
		this.set(...this._getPath());
	}

	private _getPath(): [string, string] {
		let target = String(window.location.hash || "").replace(/^[#\/]+/, "");
		if (this._basePath) {
			if (target.startsWith(this._basePath)) {
				target = target.slice(this._basePath.length).replace(/^[#\/]+/, "");
			} else {
				target = "";
			}
		}
		let parts = target.replace(/\/$/, "").split("/");
		return [parts[0] || "", parts.slice(1).join("/")];
	}
}
