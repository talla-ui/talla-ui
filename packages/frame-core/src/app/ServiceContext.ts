import { ManagedList } from "../base/ManagedList.js";
import { ManagedObject } from "../base/ManagedObject.js";
import { Observer } from "../base/Observer.js";
import { Service } from "./Service.js";

/**
 * A container of named services, part of the global application context
 *
 * @description
 * This class is a container for named services, which should be accessible by the rest of the application. Services can be set, unset, and replaced using the service context, and a {@link ServiceObserver} can be used to access the currently registered service with a particular ID.
 *
 * - Use the {@link add()} method to add or update a service by ID. The service must be an instance of {@link Service} with a valid `id` property. The service is automatically attached to the ServiceContext instance.
 * - Use the {@link get()} method to retrieve a service by ID, if one is currently registered.
 * - Unlink a service to remove (unregister) it.
 * - Use the {@link Activity.observeService()} or {@link Service.observeService()} methods to observe a particular service by ID and handle change events.
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
	 * @internal Attaches an observer to a particular service by ID, until the specified parent object is unlinked
	 * @param id The ID of the service to be observed
	 * @param observer An observer instance or change event callback
	 * @param parent The parent object to observe (for unlinking)
	 * @returns The observer instance
	 */
	_$observe<TService extends Service>(
		id: string,
		observer:
			| Observer<TService>
			| ManagedObject.AttachObserverFunction<TService> = new Observer(),
		parent: ManagedObject,
	) {
		if (typeof observer === "function") {
			observer = Observer.fromChangeHandler<Observer<TService>, TService>(
				observer,
				Observer,
			);
		}
		new ServiceContextObserver(id, observer, parent).observe(this);
		return observer;
	}

	// keep track of services in a list, and forward events
	private _map?: Map<string, Service>;
	private _list = this.attach(new ManagedList<Service>(), () => {
		this._map = new Map(this._list.map((s) => [s.id, s]));
		this.emitChange();
	});
}

/** Context observer used by a ServiceObserver */
class ServiceContextObserver<
	TService extends Service,
> extends Observer<ServiceContext> {
	constructor(
		public id: string,
		public observer: Observer<TService>,
		parent: ManagedObject,
	) {
		super();
		new ServiceContextObserver.ParentObserver(this).observe(parent);
	}
	override observe(observed: ServiceContext) {
		super.observe(observed);
		let service = observed.get(this.id);
		if (service) this.observer.observe(service as TService);
		return this;
	}
	override stop() {
		super.stop();
		this.observer.stop();
	}
	protected override handleEvent() {
		let newService = this.observed!.get(this.id);
		if (newService && newService !== this.observer.observed) {
			this.observer.observe(newService as TService);
		}
	}

	/** Observer to stop a context observer when parent object (e.g. activity) is unlinked */
	static ParentObserver = class extends Observer<ManagedObject> {
		constructor(public contextObserver: ServiceContextObserver<Service>) {
			super();
		}
		override stop() {
			super.stop();
			this.contextObserver.stop();
		}
	};
}
