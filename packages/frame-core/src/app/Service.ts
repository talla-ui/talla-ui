import { ManagedEvent, ManagedObject } from "../base/index.js";
import { app } from "./GlobalContext.js";
import { ServiceContext } from "./ServiceContext.js";

/**
 * An abstract class that represents a named service
 *
 * @description
 * Services are instances of the `Service` class that are made available to the rest of your application _by ID_, using {@link ServiceContext} (available through {@link GlobalContext.services app.services}). Typically, services are observed from activities or other services, and provide shared functionality or data.
 *
 * To add a service, extend the Service class, create an instance, assign an ID, and add it to the service context using {@link GlobalContext.addService app.addService()}. When another service is added with the same ID, the existing service is replaced and unlinked.
 *
 * @see {@link ServiceContext}
 */
export abstract class Service extends ManagedObject {
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
	abstract readonly id: string;

	/**
	 * Observes another service by ID, until the current service is unlinked
	 * @param id The ID of the service to be observed
	 * @param handler A function that's called when the service changes (registered or unlinked), or when the current service emits an event
	 */
	protected observeService<TService extends Service>(
		id: string,
		handler: (service?: TService, event?: ManagedEvent) => void,
	) {
		return app.services._$observe(this, id, handler);
	}
}
