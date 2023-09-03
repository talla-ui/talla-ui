import { ActivationPath, app } from "desk-frame";
import { type WebContextOptions } from "../WebContext";

/** Global flag for global (window) event listener, see constructor */
let _eventListenerAdded = false;

/**
 * A class that manages the application activation path using the DOM location 'hash' value
 * - This class is used automatically when {@link WebContextOptions.useHistoryAPI} is set to false.
 * @see {@link useWebContext()}
 * @hideconstructor
 */
export class WebHashActivationPath extends ActivationPath {
	constructor(options: WebContextOptions) {
		super();
		this._basePath = options.basePath.replace(/^[#\/]+/, "");
		if (!_eventListenerAdded) {
			window.addEventListener("hashchange", () => {
				let self = app.activities.activationPath;
				if (self instanceof WebHashActivationPath) {
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
	 * - This method is used by the `UIButton` renderer to set the `href` attribute for buttons that are rendered as anchor elements.
	 */
	getPathHref(path?: string) {
		let target = "";
		if (!path || path[0] === ":") return "";
		if (path[0] === "#") path = path.slice(1);
		if (path[0] === "/") {
			target = path;
		} else {
			let current = this.path;
			if (current.slice(-1) !== "/") current += "/";
			target = "/" + current + path;
		}
		target = target.replace(/\/+/g, "/");
		let i = 0;
		while (/\/\.\.?\//.test(target)) {
			if (i++ > 100) break;
			target = target
				.replace(/\/\.\//g, "/")
				.replace(/\/[^\/]+\/\.\.\//g, "/")
				.replace(/^\/?\.\.\//, "/");
		}
		return "#" + this._basePath + "/" + target.replace(/^\/+/, "");
	}

	/**
	 * Navigates to the specified path
	 * @param path The path to navigate to; should be formatted as a URL, or set to `:back` to invoke `history.back()`
	 * @param mode The intended mode of navigation, see {@link ActivationPath.NavigationMode}
	 */
	override async navigateAsync(
		path: string,
		mode?: ActivationPath.NavigationMode,
	): Promise<void> {
		path = String(path);
		if (mode && mode.back) {
			// go back, then continue
			window.history.back();
			if (path) {
				// after going back, navigate to given path
				await new Promise((r) => setTimeout(r, 1));
				return this.navigateAsync(path, { ...mode, back: false });
			}
		} else if (path) {
			if (path === ":back") {
				// go back once
				window.history.back();
			} else if (
				mode &&
				mode.replace &&
				typeof window.history.replaceState === "function"
			) {
				// replace path if possible
				window.history.replaceState({}, document.title, this.getPathHref(path));
				this.update(); // above doesn't trigger hash change
			} else {
				// just navigate to given path (as hash)
				window.location.hash = this.getPathHref(path);
			}
		}
	}

	/**
	 * Updates the activation path from the current location hash value
	 * - This method is called automatically. It shouldn't be necessary to call this method manually in an application.
	 */
	update() {
		let path = String(window.location.hash || "").replace(/^[#\/]+/, "");
		if (path.startsWith(this._basePath)) {
			path = path.slice(this._basePath.length).replace(/^[#\/]+/, "");
		}
		this.path = path;
	}
}
