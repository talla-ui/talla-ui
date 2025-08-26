import { NavigationContext } from "@talla-ui/core";
import { StringConvertible } from "@talla-ui/util";
import { TestContextOptions } from "./TestContextOptions.js";

/**
 * A class that encapsulates the current navigation location, simulating browser-like behavior
 * @docgen {hideconstructor}
 */
export class TestNavigationContext extends NavigationContext {
	/** Creates a new navigation controller instance, used by `useTestContext()` */
	constructor(options: TestContextOptions) {
		super();
		this._delay = options.navigationDelay;
		this.userNavigation(options.navigationPath);
	}

	/** Flag for duck typing */
	readonly isTestNavigationContext = true as const;

	/**
	 * Navigates to the provided target
	 * - The path is set only after a delay (see {@link TestContextOptions.navigationDelay}), simulating asynchronous browser behavior.
	 * @param target The navigation target
	 * @param mode An optional navigation mode (an object that matches {@link NavigationContext.NavigationMode})
	 * @error This method throws an error if the navigation target is invalid
	 */
	override async navigateAsync(
		target: StringConvertible,
		mode?: NavigationContext.NavigationMode,
	) {
		// go back first, if needed
		if (mode && mode.back) {
			if (this._delay) await this._simulateDelay();
			this.userBack();
		}

		// stop here if path is empty
		if (target == null) return;

		// check if path is valid
		let path = String(target).replace(/^\/+|\/+$/g, "");
		if (path.startsWith(".")) throw Error("Invalid navigation target: " + path);

		// check if path is current path
		let currentPath = this._history[this._history.length - 1];
		if (currentPath && currentPath.path === path) return;

		// update history after a delay, then finally set path
		if (this._delay) await this._simulateDelay();
		let replaceMode = mode?.replace === true;
		if (mode && this._history.length) {
			let currentPath = this._history[this._history.length - 1]!;
			if (mode.replace === "prefix") {
				let prefix = String(mode.prefix || "");
				replaceMode = prefix.endsWith("/")
					? currentPath.path.startsWith(prefix)
					: currentPath.path.startsWith(prefix + "/") ||
						currentPath.path === prefix;
			}
		}
		if (replaceMode) {
			this._history[this._history.length - 1] = { path };
		} else {
			this._history.push({ path });
		}
		this.set(path);
	}

	/**
	 * Sets the provided location immediately, simulating external navigation
	 * - The provided target is added to the location history for the application context, and is not checked for correctness.
	 * - To simulate programmatic navigation behavior, use the {@link navigateAsync()} method instead.
	 */
	userNavigation(path: string) {
		if (!this._firstLocation) this._firstLocation = { path };
		this._history.push({ path });
		this.set(path);
	}

	/**
	 * Removes the last path in navigation history immediately, simulating external 'back' navigation
	 * - To simulate programmatic navigation behavior, use the {@link navigateAsync()} method instead.
	 */
	userBack() {
		if (this._history.length <= 1)
			throw Error("Application exit: history stack would be empty");
		this._history.pop();
		let target = this._history[this._history.length - 1]!;
		this.set(target.path);
	}

	/**
	 * Clears navigation history and restores the initial location
	 * @note To re-initialize the application before a test, use the {@link useTestContext()} function.
	 */
	override clear() {
		super.clear();
		this._history = [];
		if (this._firstLocation) {
			this.userNavigation(this._firstLocation.path);
		}
		return this;
	}

	/**
	 * Returns a list of all locations currently in navigation history
	 * - Locations are returned as strings (e.g. `pageId` or `pageId/detail`), in the order they were navigated to, oldest first.
	 */
	getHistory() {
		return this._history.map((h) => h.path);
	}

	private async _simulateDelay() {
		await new Promise((r) => setTimeout(r, this._delay));
	}

	private _delay: number;
	private _history: Array<{ path: string }> = [];
	private _firstLocation?: { path: string };
}
