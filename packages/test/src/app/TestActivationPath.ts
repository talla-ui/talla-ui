import { ActivationPath } from "desk-frame";
import { TestContextOptions } from "./TestContext.js";

/** Helper function to make an absolute path from multiple relative or absolute paths */
function absolute(...paths: string[]) {
	let result: string[] = [];
	for (let path of paths) {
		path = String(path).trim();
		if (path.startsWith("/")) result.length = 0;
		let split = path.split("/");
		for (let s of split) {
			if (!s || s === ".") continue;
			if (s === "..") result.pop();
			else result.push(s);
		}
	}
	return result.join("/");
}

/** A class that encapsulates an activation path, simulating browser-like behavior */
export class TestActivationPath extends ActivationPath {
	/**
	 * Creates a new activation path context instance, used by `useTestContext()`
	 * @hideconstructor
	 */
	constructor(options: TestContextOptions) {
		super();
		this._delay = options.pathDelay;
		this.userNavigation(options.path);
	}

	/**
	 * Navigates to the given path
	 * - The provided path should be in relative URL format, **or** `:back` to go back.
	 * - The path is set only after a delay (see {@link TestContextOptions.pathDelay}), simulating asynchronous browser behavior.
	 * @param path The (relative) path to set
	 * @param mode An optional navigation mode (an object that matches {@link ActivationPath.NavigationMode})
	 */
	override async navigateAsync(
		path: string,
		mode?: ActivationPath.NavigationMode
	) {
		// go back first, if needed
		if (mode && mode.back) {
			if (this._delay) await this._simulateDelay();
			this.userBack();
		}

		// stop here if path is empty
		if (!path) return;

		// go back again if path is `:back`
		if (path === ":back") {
			if (this._delay) await this._simulateDelay();
			this.userBack();
			return;
		}

		// add relative path to current path, to make absolute path
		path = absolute(this.path, path);

		// update history after a delay, then finally set path
		if (this._delay) await this._simulateDelay();
		if (mode && mode.replace && this._history.length) {
			this._history[this._history.length - 1] = path;
		} else {
			this._history.push(path);
		}
		this.path = path;
	}

	/**
	 * Sets given (absolute) path immediately, simulating external navigation
	 * - The provided path is added to the location history for the application context
	 * - To simulate programmatic navigation behavior, use the {@link navigateAsync()} method instead.
	 */
	userNavigation(path: string) {
		if (this._firstPath === undefined) this._firstPath = path;
		this._history.push(path);
		this.path = path;
	}

	/**
	 * Removes the last path in navigation history immediately, simulating external 'back' navigation
	 * - To simulate programmatic navigation behavior, use the {@link navigateAsync()} method instead.
	 */
	userBack() {
		if (this._history.length <= 1)
			throw Error("Application exit: history stack would be empty");
		this._history.pop();
		this.path = this._history[this._history.length - 1]!;
	}

	/**
	 * Clears navigation history and restores the initial path
	 * @note To re-initialize the application before a test, use the {@link useTestContext()} function.
	 */
	override clear() {
		super.clear();
		this._history = [];
		if (this._firstPath !== undefined) {
			this._history.push(this._firstPath);
			this.path = this._firstPath;
		}
		return this;
	}

	/** Returns a list of all paths currently in navigation history */
	getHistory() {
		return this._history.slice();
	}

	/** Helper method to simulate delay in updating path */
	private async _simulateDelay() {
		await new Promise((r) => setTimeout(r, this._delay));
	}

	private _delay: number;
	private _history: string[] = [];
	private _firstPath?: string;
}
