import { ManagedList } from "../base/ManagedList.js";
import { ManagedObject } from "../base/ManagedObject.js";
import { $_get } from "../base/object_util.js";
import { invalidArgErr } from "../errors.js";
import { Service } from "./Service.js";

/**
 * A container of service instances, part of the global application context
 *
 * @description
 * This class is a container for services, each with a unique ID, which should be accessible by the rest of the application. Services can be set, unset, and replaced using the global service context.
 *
 * - Use the {@link add()} method to add or update a service by ID. The service must be an instance of {@link Service} with a valid `id` property. The service is automatically attached to the ServiceContext instance. An alias of this method is available as {@link AppContext.addService app.addService()}.
 * - Use the {@link get()} method to retrieve a service by ID, if one is currently registered.
 * - Unlink a service to remove (unregister) it.
 * - Whenever services are added, removed, or replaced, this object emits a change event.
 *
 * @docgen {hideconstructor}
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

	/** @internal Property getter for bindings */
	override [$_get](propertyName: string) {
		return this.get(propertyName);
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
