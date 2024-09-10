import { NavigationContext, NavigationTarget } from "talla";
import { TestContextOptions } from "./TestContext.js";

/**
 * A class that encapsulates the current navigation location, simulating browser-like behavior
 * @docgen {hideconstructor}
 */
export class TestNavigationContext extends NavigationContext {
	/** Creates a new navigation controller instance, used by `useTestContext()` */
	constructor(options: TestContextOptions) {
		super();
		this._delay = options.navigationDelay;
		this.userNavigation(options.navigationPageId, options.navigationDetail);
	}

	/**
	 * Navigates to the provided target
	 * - The path is set only after a delay (see {@link TestContextOptions.navigationDelay}), simulating asynchronous browser behavior.
	 * @param target The navigation target
	 * @param mode An optional navigation mode (an object that matches {@link NavigationContext.NavigationMode})
	 * @error This method throws an error if the navigation target is invalid
	 */
	override async navigateAsync(
		target: NavigationTarget,
		mode?: NavigationContext.NavigationMode,
	) {
		// go back first, if needed
		if (mode && mode.back) {
			if (this._delay) await this._simulateDelay();
			this.userBack();
		}

		// stop here if path is empty
		let { pageId, detail } = target || {};
		if (pageId == null) return;

		// update history after a delay, then finally set path
		if (this._delay) await this._simulateDelay();
		if (pageId.indexOf("/") >= 0)
			throw Error("Invalid navigation target: page ID contains slash");
		if (detail && !pageId)
			throw Error("Invalid navigation target: detail set without pageId");
		if (detail && detail.startsWith("/"))
			throw Error("Invalid navigation target: detail contains leading slash");
		if (detail && detail.endsWith("/"))
			throw Error("Invalid navigation target: detail contains trailing slash");
		if (mode && mode.replace && this._history.length) {
			this._history[this._history.length - 1] = { pageId, detail };
		} else {
			this._history.push({ pageId, detail });
		}
		this.set(pageId, detail);
	}

	/**
	 * Sets the provided location immediately, simulating external navigation
	 * - The provided target is added to the location history for the application context, and is not checked for correctness.
	 * - To simulate programmatic navigation behavior, use the {@link navigateAsync()} method instead.
	 */
	userNavigation(pageId: string, detail = "") {
		if (!this._firstLocation) this._firstLocation = { pageId, detail };
		this._history.push({ pageId, detail });
		this.set(pageId, detail);
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
		this.set(target.pageId, target.detail);
	}

	/**
	 * Clears navigation history and restores the initial location
	 * @note To re-initialize the application before a test, use the {@link useTestContext()} function.
	 */
	override clear() {
		super.clear();
		this._history = [];
		if (this._firstLocation) {
			this.userNavigation(
				this._firstLocation.pageId,
				this._firstLocation.detail,
			);
		}
		return this;
	}

	/**
	 * Returns a list of all locations currently in navigation history
	 * - Locations are returned as strings (e.g. `pageId` or `pageId/detail`), in the order they were navigated to, oldest first.
	 */
	getHistory() {
		return this._history.map(
			(h) => h.pageId + (h.detail ? "/" + h.detail : ""),
		);
	}

	private async _simulateDelay() {
		await new Promise((r) => setTimeout(r, this._delay));
	}

	private _delay: number;
	private _history: Array<{ pageId: string; detail: string }> = [];
	private _firstLocation?: { pageId: string; detail: string };
}
