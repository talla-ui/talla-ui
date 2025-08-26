import { app, NavigationContext } from "@talla-ui/core";
import { StringConvertible } from "@talla-ui/util";
import { WebContextOptions } from "./WebContextOptions.js";

/** Global flag for global (window) event listener, see constructor */
let _eventListenerAdded = false;

/**
 * A class that manages the application navigation path using DOM methods
 * - This class is created automatically by {@link useWebContext()}. You shouldn't need to interact with it directly.
 * @see {@link useWebContext()}
 * @docgen {hideconstructor}
 */
export class WebNavigationContext extends NavigationContext {
	constructor(options: WebContextOptions) {
		super();
		let useHistoryAPI = !!options.useHistoryAPI;
		this._useHashPath = !useHistoryAPI;
		this._basePath = options.basePath.replace(/^\//, "");

		// insert initial history entries if needed
		let path = this._getPath();
		let initial = path.split("/");
		let insert: string[] = [];
		let base = this.getPathHref("")!;
		if (options.insertHistory === "root" && initial[0]) {
			insert.push(base);
		}
		if (options.insertHistory && initial[1]) {
			insert.push(base + initial[0]);
		}
		if (insert.length) {
			insert.push(base + path.replace(/\/$/, ""));
		}
		insert.forEach((href, i) =>
			i ? history.pushState({}, "", href) : history.replaceState({}, "", href),
		);

		// set event listener for back/forward navigation
		if (!_eventListenerAdded) {
			window.addEventListener(useHistoryAPI ? "popstate" : "hashchange", () => {
				if (!this.isUnlinked()) this.update();
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
	getPathHref(target?: StringConvertible): string | undefined {
		if (target == null) return;
		let path = (String(target) + "/")
			.replace(/^\/+|\/+$/g, "")
			.replace(/\/\/+/g, "/");
		return (this._useHashPath ? "#" : "") + this._basePath + "/" + path;
	}

	/**
	 * Navigates to the specified path
	 * @param target The navigation target
	 * @param mode The intended mode of navigation, see {@link NavigationContext.NavigationMode}
	 */
	override async navigateAsync(
		target: StringConvertible,
		mode?: NavigationContext.NavigationMode,
	): Promise<void> {
		if (mode && mode.back) {
			// go back, then continue
			window.history.back();
			if (target) {
				// after going back, navigate to given path
				await new Promise((r) => setTimeout(r, 1));
				return this.navigateAsync(target, { ...mode, back: false });
			}
			return;
		}

		// navigate to target path (if any, and not the current path)
		let href = this.getPathHref(target);
		let windowPath = this._useHashPath
			? window.location.hash
			: window.location.pathname;
		if (!href || href === windowPath) return;
		let replaceMode = mode?.replace === true;
		if (mode) {
			let currentPath = this._getPath();
			if (mode.replace === "prefix") {
				let prefix = String(mode.prefix || "");
				replaceMode = prefix.endsWith("/")
					? currentPath.startsWith(prefix)
					: currentPath.startsWith(prefix + "/") || currentPath === prefix;
			}
		}
		if (replaceMode) {
			// replace path if requested
			window.history.replaceState({}, document.title, href);
		} else {
			// push path on history stack
			window.history.pushState({}, document.title, href);
		}
		this.update();
	}

	/**
	 * Updates the navigation path from the current window location
	 * - This method is called automatically. It shouldn't be necessary to call this method manually in an application.
	 */
	update() {
		try {
			this.set(this._getPath());
		} catch (err) {
			app.log.error(err);
		}
	}

	private _getPath(): string {
		let windowPath = this._useHashPath
			? window.location.hash
			: window.location.pathname;
		let target = String(windowPath || "").replace(/^[#\/]+/, "");
		if (this._basePath) {
			if (target.startsWith(this._basePath)) {
				target = target.slice(this._basePath.length).replace(/^[#\/]+/, "");
			} else {
				target = "";
			}
		}
		return target.replace(/\/$/, "");
	}

	private _useHashPath: boolean;
}
