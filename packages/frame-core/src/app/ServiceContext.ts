import { ManagedEvent } from "../base/ManagedEvent.js";
import { ManagedList } from "../base/ManagedList.js";
import { ManagedObject } from "../base/ManagedObject.js";
import { invalidArgErr } from "../errors.js";
import { Service } from "./Service.js";

/**
 * A container of named services, part of the global application context
 *
 * @description
 * This class is a container for named services, which should be accessible by the rest of the application. Services can be set, unset, and replaced using the global service context.
 *
 * - Use the {@link add()} method to add or update a service by ID. The service must be an instance of {@link Service} with a valid `id` property. The service is automatically attached to the ServiceContext instance. An alias of this method is available as {@link GlobalContext.addService app.addService()}.
 * - Use the {@link get()} method to retrieve a service by ID, if one is currently registered.
 * - Unlink a service to remove (unregister) it.
 * - Use the {@link observe()} method to observe a particular service by ID and handle events.
 *
 * @hideconstructor
 */
export class ServiceContext extends ManagedObject {
	/** Removes all services that are currently registered */
	clear() {
		this._list.clear();
		return this;
	}

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
		if (!(service instanceof Service)) throw invalidArgErr("service");
		let id = service.id;
		let oldService = this._map?.get(id);
		if (oldService === service) return this;
		if (oldService) {
			this._list.replaceObject(oldService, service);
		} else {
			this._list.add(service);
		}
		return this;
	}

	/**
	 * Observes a single service by ID
	 * @summary This method can be used to observe a particular service for changes and events. The provided handler function is called for every (new) service object, as well as for every event emitted by the service.
	 * @note This method adds a listener to the service context and/or current service. To avoid memory leaks, you can unlink the returned observer object when it's no longer needed. Alternatively, you can attach the object to a parent object (e.g. an {@link Activity}), which will automatically unlink it when the parent is unlinked.
	 * @param id The ID of the service to observe
	 * @param handler A function that's called whenever the service changes or emits an event, or immediately if a service was already registered
	 * @returns An observer object that includes a reference to the current service; when the object is unlinked, the observer stops listening
	 *
	 * @example
	 * class MyActivity extends Activity {
	 *   foo = this.attach(
	 *     app.services.observe<MyService>("Test.MyService", (service, event) => {
	 *       // handle service changes or events
	 *       // (also called if service was already registered)
	 *     })
	 *   );
	 *
	 *   // ... elsewhere
	 *   doSomething() {
	 *     let fooService = this.foo.service;
	 *     // use fooService if it's available...
	 *   }
	 * }
	 */
	observe<TService extends Service>(
		id: string,
		handler?: (service?: TService, event?: ManagedEvent) => void,
	) {
		return new ServiceContext.Observer<TService>(this, id, handler);
	}

	// keep track of services in a list, and forward events
	private _map?: Map<string, Service>;
	private _list = this.attach(new ManagedList<Service>(), (e) => {
		// if list changed, update map too
		if (e.source === this._list) {
			this._map = new Map(this._list.map((s) => [s.id, s]));
			this.emitChange();
		}
	});
}

export namespace ServiceContext {
	/**
	 * An observer for a single service, by ID
	 * - This class is used to observe a single service by ID. An instance is created by {@link ServiceContext.observe()}.
	 * - The observer includes a reference to the current service, which is updated automatically. Additionally, the observer is associated with a handler function that's called whenever the service changes or emits an event.
	 * @see {@link ServiceContext.observe}
	 */
	export class Observer<TService extends Service> extends ManagedObject {
		/**
		 * Creates a new service observer, do not use directly
		 * - Use {@link ServiceContext.observe()} to create a new observer
		 * @see {@link ServiceContext.observe}
		 */
		constructor(
			context: ServiceContext,
			id: string,
			handler?: (service?: TService, event?: ManagedEvent) => void,
		) {
			super();

			// keep track of current service and listen for events
			let serviceStop: (() => void) | undefined;
			const contextChange = () => {
				let newService = context.get(id) as TService | undefined;
				if (newService !== this.service) {
					serviceStop?.();
					this.service = newService;

					// listen for events on new service
					newService?.listen({
						init(_, stop) {
							serviceStop = stop;
						},
						handler,
					});

					// invoke handler with new service
					handler?.(newService);
				}
			};

			// watch the service context for changes
			let ctxStop: () => void;
			context.listen({
				init(_, stop) {
					ctxStop = stop;
				},
				handler(list, event) {
					if (event.source === list) contextChange();
				},
			});

			// watch the observer itself to stop when unlinked
			this.listen({
				unlinked: () => {
					ctxStop();
					serviceStop?.();
					this.service = undefined;
				},
			});

			// initialize in case service is already registered
			contextChange();
		}

		/**
		 * The currently observed service
		 * - This property is updated automatically when the service is added, removed, or replaced
		 */
		service?: TService = undefined;
	}
}
