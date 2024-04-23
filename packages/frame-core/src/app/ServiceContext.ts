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
	 * @internal Attaches a handler to a particular service by ID, until the specified parent object is unlinked
	 * @param parent The parent object to watch (for unlinking)
	 * @param id The ID of the service to be observed
	 * @param handler A function that's called when the service changes (registered or unlinked), or when the current service emits an event
	 */
	_$observe<TService extends Service>(
		parent: ManagedObject,
		id: string,
		handler: (service?: TService, event?: ManagedEvent) => void,
	) {
		// keep track of current service and listen for events
		let service: TService | undefined;
		let serviceStop: (() => void) | undefined;
		const listChanged = () => {
			let newService = this._map?.get(id) as TService | undefined;
			if (newService !== service) {
				serviceStop?.();
				service = newService;

				// listen for events on new service
				service?.listen({
					init(_, stop) {
						serviceStop = stop;
					},
					handler,
				});

				// invoke handler with new service
				handler(service);
			}
		};

		// watch the parent object and the service list
		let listStop: () => void;
		parent.listen({
			unlinked() {
				listStop();
				serviceStop?.();
			},
		});
		this._list.listen({
			init(_, stop) {
				listStop = stop;
			},
			handler(list, event) {
				if (event.source === list) listChanged();
			},
		});
	}

	// keep track of services in a list, and forward events
	private _map?: Map<string, Service>;
	private _list = this.attach(new ManagedList<Service>(), (e) => {
		// if list changed, update map too
		if (e.source === this._list) {
			this._map = new Map(this._list.map((s) => [s.id, s]));
		}
	});
}
