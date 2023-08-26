import { ManagedMap } from "../core/ManagedMap.js";
import { ManagedObject } from "../core/ManagedObject.js";
import { Observer } from "../core/Observer.js";

/**
 * A key-value map of named services, part of the global application context
 *
 * @description
 * This class is a container for named services, which should be accessible by the rest of the application. Services can be set, unset, and replaced using the service context, and a {@link ServiceObserver} can be used to access the currently registered service with a particular name.
 *
 * - Use the {@link ManagedMap.set set()} method to add or update a service by name. The service must be a managed object, which is automatically attached to the ServiceContext instance.
 * - Unlink a service, or use the {@link ManagedMap.unset unset()} method to remove a service.
 * - Use the {@link ServiceContext.observeService observeService()} method to attach or create a {@link ServiceObserver} object.
 *
 * @hideconstructor
 */
export class ServiceContext extends ManagedMap<string, ManagedObject> {
	/**
	 * Attaches an observer to a particular named service
	 * @param name The name of the service to be observed
	 * @param observer An instance of {@link ServiceObserver}, if any; otherwise a plain {@link ServiceObserver} instance will be created, which exposes the current service as {@link ServiceObserver.service service}
	 *
	 * @example
	 * // Use a service somewhere in your application:
	 * const cart = app.services.observeService("MyApp.Cart");
	 *
	 * function addToCart(product) {
	 *   if (!cart.service) throw CartNotFoundError();
	 *   cart.service.add(product);
	 * }
	 */
	observeService<TService extends ManagedObject>(
		name: string,
		observer:
			| ServiceObserver<TService>
			| ManagedObject.AttachObserverFunction<TService> = new ServiceObserver()
	) {
		if (typeof observer === "function") {
			observer = ServiceObserver.fromChangeHandler<
				ServiceObserver<TService>,
				TService
			>(observer);
		}
		return observer.observeService(this, name);
	}
}

/**
 * An {@link Observer} class that automatically observes services as they're set or changed
 * - Instances are returned by the {@link ServiceContext.observeService()} method. This class may be extended to observe individual properties or handle events on a service if needed.
 * - Creating multiple observers for the same service may cause a memory leak. If you're creating new observers as part of your application (e.g. in a data model) be sure to use the {@link Observer.stop stop()} method when the observer is no longer needed.
 */
export class ServiceObserver<
	TService extends ManagedObject
> extends Observer<TService> {
	/** The current service, updated automatically when services are added, updated, or removed */
	get service() {
		return this.observed;
	}

	/**
	 * Start observing a service
	 * - This method is called automatically by {@link ServiceContext.observeService()}.
	 */
	observeService(context: ServiceContext, name: string) {
		this._serviceContextObserver?.stop();
		this._serviceContextObserver = new ServiceContextObserver(
			name,
			this
		).observe(context);
		return this;
	}

	/** Stops observing the service context _and_ current service */
	override stop() {
		// stop observing service and context
		this._serviceContextObserver?.stop();
		super.stop();
	}

	protected override handleUnlink() {
		super.stop(); // stop observing, but not context
	}

	/** @internal Service context (map) observer instance */
	private _serviceContextObserver?: ServiceContextObserver<TService>;
}

/** @internal Context observer used by a ServiceObserver */
class ServiceContextObserver<
	TService extends ManagedObject
> extends Observer<ServiceContext> {
	constructor(public name: string, public observer: ServiceObserver<TService>) {
		super();
	}
	override observe(observed: ServiceContext) {
		super.observe(observed);
		if (observed.has(this.name)) {
			this.observer.observe(observed.get(this.name) as TService);
		}
		return this;
	}
	protected override handleEvent(event: ManagedMap.ChangeEvent<string>) {
		if (!event.data || !("key" in event.data) || event.data.key === this.name) {
			let newService = this.observed!.get(this.name);
			if (newService && newService !== this.observer.observed) {
				this.observer.observe(newService as TService);
			}
		}
	}
}
