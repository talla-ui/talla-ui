import type { GlobalContext } from "./GlobalContext.js";
import { ManagedList, ManagedObject } from "../base/index.js";
import { ActivationPath } from "./ActivationPath.js";
import { Activity } from "./Activity.js";

/**
 * A class that contains root activities and the application activation path, part of the global application context
 * @hideconstructor
 */
export class ActivationContext extends ManagedObject {
	/** Creates a new instance of this class; do not use */
	constructor() {
		super();
		this.observeAttach("activationPath");
	}

	/**
	 * Removes all activities and resets the activation path
	 * - This method is called automatically by {@link GlobalContext.clear()}.
	 */
	clear() {
		this.root;
		this.root.clear();
		this.activationPath.clear();
		return this;
	}

	/**
	 * The current set of application root activities
	 * - These activities are normally added using {@link GlobalContext.addActivity app.addActivity()}.
	 */
	readonly root = this.attach(new ManagedList().restrict(Activity));

	/**
	 * The current activation path instance
	 * - This property defaults to a plain {@link ActivationPath} instance but will be overridden by a platform-specific context package.
	 */
	activationPath = new ActivationPath();
}
