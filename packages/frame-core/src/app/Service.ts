import { Binding, ManagedObject } from "../base/index.js";
import { ServiceContext } from "./ServiceContext.js";

/**
 * An abstract class that represents a named service
 *
 * @description
 * Services are instances of the `Service` class that are made available to the rest of your application _by ID_, using {@link ServiceContext}. Services can be _observed_, to watch for changes and listen for events.
 *
 * To add a service, extend this class, create an instance, assign an ID, and add it to the service context using {@link GlobalContext.addService app.addService()}. When another service is added with the same ID, the existing service is replaced and unlinked.
 *
 * @see {@link ServiceContext}
 */
export abstract class Service extends ManagedObject {
	constructor() {
		super();
		Binding.limitTo(this);
	}

	/** Returns true if this service is currently registered */
	isServiceRegistered() {
		// use duck typing to find out if parent map is a ServiceContext
		let parent = ServiceContext.whence(this);
		return !!(
			!this.isUnlinked() &&
			parent &&
			!parent.isUnlinked() &&
			typeof (parent as ServiceContext).isServiceContext === "function"
		);
	}

	/** The unique ID for this service (instance) */
	abstract id: string;
}
