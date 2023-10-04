import { ManagedList } from "../base/ManagedList.js";
import { ManagedObject } from "../base/ManagedObject.js";
import { Observer } from "../base/Observer.js";
import { ManagedChangeEvent } from "../index.js";
import { Service } from "./Service.js";

/**
 * A container of named services, part of the global application context
 *
 * @description
 * This class is a container for named services, which should be accessible by the rest of the application. Services can be set, unset, and replaced using the service context, and a {@link ServiceObserver} can be used to access the currently registered service with a particular ID.
 *
 * - Use the {@link add()} method to add or update a service by ID. The service must be an instance of {@link Service} with a valid `id` property. The service is automatically attached to the ServiceContext instance.
 * - Unlink a service to remove it again.
 * - Use the {@link ServiceContext.observeService observeService()} method to attach or create a {@link ServiceObserver} object.
 *
 * @hideconstructor
 */
export class ServiceContext extends ManagedObject {
	/** Returns a single service instance by ID, if registered */
	get(id: string): Service | undefined {
		return this._map?.get(id);
	}

	/** Returns an array of all currently registered services */
	getAll() {
		return this._list.toArray();
	}

	/**
	 * Adds the specified service
	 * - If a service with the same ID is currently registered, it will be unlinked and replaced with the new service
	 */
	add(service: Service) {
		// Note: we want this operation to be atomic so we use replace()
		let id = service.id;
		this._list.replace([
			...this._list.toArray().filter((s) => s.id !== id),
			service,
		]);
		return this;
	}

	/** Removes all services that are currently registered */
	clear() {
		this._list.clear();
		return this;
	}

	/** @internal Used for duck typing by Service */
	isServiceContext() {
		return true;
	}

	/**
	 * Attaches an observer to a particular service by ID
	 * @param id The ID of the service to be observed
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
	observeService<TService extends Service>(
		id: string,
		observer:
			| ServiceObserver<TService>
			| ManagedObject.AttachObserverFunction<TService> = new ServiceObserver(),
	) {
		if (typeof observer === "function") {
			observer = ServiceObserver.fromChangeHandler<
				ServiceObserver<TService>,
				TService
			>(observer, ServiceObserver);
		}
		return observer.observeService(this, id);
	}

	// keep track of services in a list, and forward events
	private _map?: Map<string, Service>;
	private _list = this.attach(new ManagedList<Service>(), (_list, e) => {
		if (e instanceof ManagedChangeEvent) {
			this._map = new Map(this._list.map((s) => [s.id, s]));
			this.emitChange();
		}
	});
}

/**
 * An {@link Observer} class that automatically observes services as they're set or changed
 * - Instances are returned by the {@link ServiceContext.observeService()} method. This class may be extended to observe individual properties or handle events on a service if needed.
 * - Creating multiple observers for the same service may cause a memory leak. If you're creating new observers as part of your application (e.g. in a data model) be sure to use the {@link Observer.stop stop()} method when the observer is no longer needed.
 */
export class ServiceObserver<
	TService extends Service,
> extends Observer<TService> {
	/** The current service, updated automatically when services are added, updated, or removed */
	get service() {
		return this.observed;
	}

	/**
	 * @internal Start observing a service
	 * - This method is called automatically by {@link ServiceContext.observeService()}.
	 */
	observeService(context: ServiceContext, id: string) {
		this._serviceContextObserver?.stop();
		this._serviceContextObserver = new ServiceContextObserver(id, this).observe(
			context,
		);
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
	TService extends Service,
> extends Observer<ServiceContext> {
	constructor(
		public id: string,
		public observer: ServiceObserver<TService>,
	) {
		super();
	}
	override observe(observed: ServiceContext) {
		super.observe(observed);
		let service = observed.get(this.id);
		if (service) this.observer.observe(service as TService);
		return this;
	}
	protected override handleEvent(event: ManagedList.ChangeEvent<Service>) {
		// TODO: use event to not always have to check this way?
		let newService = this.observed!.get(this.id);
		if (newService && newService !== this.observer.observed) {
			this.observer.observe(newService as TService);
		}
	}
}
