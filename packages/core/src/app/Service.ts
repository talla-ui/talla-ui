import { ManagedObject } from "../base/index.js";
import { ServiceContext } from "./ServiceContext.js";

/**
 * An abstract class that represents a named service
 *
 * @description
 * Services are instances of the `Service` class that are made available to the rest of your application _by ID_, using {@link ServiceContext} (available through {@link AppContext.services app.services}). Typically, services are observed from activities or other services, and provide shared functionality or data.
 *
 * To add a service, extend the Service class, create an instance, assign an ID, and add it to the service context using {@link AppContext.addService app.addService()}. When another service is added with the same ID, the existing service is replaced and unlinked.
 *
 * @see {@link ServiceContext}
 * @docgen {hideconstructor}
 */
export abstract class Service extends ManagedObject {
	/** Returns true if this service is currently registered */
	isServiceRegistered() {
		// use duck typing to find out if parent map is a ServiceContext
		let parent = ServiceContext.whence(this);
		return !!parent && !this.isUnlinked();
	}

	/** The unique ID for this service (instance) */
	abstract readonly id: string;
}
