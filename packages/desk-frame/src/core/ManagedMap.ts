import { ManagedObject } from "./ManagedObject.js";
import {
	addTrap,
	attachObject,
	$_origin,
	$_get,
	unlinkObject,
} from "./object_util.js";
import { ManagedChangeEvent, ManagedEvent } from "./ManagedEvent.js";
import { err, ERROR, invalidArgErr } from "../errors.js";
import { Observer } from "./Observer.js";

/** Symbol property that's used to store map */
const $_map = Symbol("map");

/**
 * A data structure that contains a key-value map of managed objects
 *
 * @description
 * Similar to managed lists (see {@link ManagedList}), the ManagedMap data structure allows objects that inherit from {@link ManagedObject} to be grouped together in a way that's more restrictive than a plain object or even a `Map` object. A managed map is useful in the following cases:
 *
 * - The map should only contain instances of a certain type, or at least only ManagedObject instances.
 * - The map shouldn't contain any undefined values.
 * - The map should be observable: actions can be taken when items are added, removed, or reordered.
 * - Events from (attached) map items should be 'propagated' on the map, to avoid having to add event listeners for all items — see {@link ManagedEvent}.
 * - Objects in the map should be able to bind to the object containing the (attached) map — see {@link Binding}.
 *
 * Managed maps are used in many places throughout the framework, such as to contain named services (see {@link ServiceContext}). Managed maps can also be used by application code to efficiently represent key-value data models.
 *
 * **Attaching items to a map** — By default, objects aren't attached to the map, so they could be attached to other objects themselves and still be part of a managed map. However, you can enable auto-attaching of objects in a map using the {@link ManagedMap.autoAttach()} method — **or** by attaching the map itself to another object. This ensures that objects in a map are only attached to the map itself, and are unlinked when they're removed from the map (and removed from the map when they're no longer attached to it, e.g. when moved to another auto-attaching map or list).
 *
 * Maps may contain the same object twice, for different keys, _unless_ auto-attach is enabled, since objects can't be attached to the same map twice.
 *
 * **Events** — Since ManagedMap itself inherits from ManagedObject, a map can emit events, too. When any objects are added, moved, or removed, a {@link ManagedMap.ChangeEvent} is emitted. In addition, for auto-attaching maps (see {@link ManagedMap.autoAttach()}) any events that are emitted by an object are re-emitted on the map itself. The {@link ManagedEvent.source} property can be used to find the object that originally emitted the event.
 *
 * **Nested lists and maps** — Managed maps can contain (and even attach to) other managed maps and lists (see {@link ManagedList}), which allows for building nested or recursive data structures that fully support bindings and events.
 *
 * @example
 * // Create a map, add and remove objects
 * let map = new ManagedMap();
 * let a = ManagedRecord.create({ foo: "a" });
 * map.set("a", a);
 * let b = ManagedRecord.create({ foo: "b" });
 * map.set("b", b);
 * map.count // => 2
 *
 * map.unset("a");
 * map.remove(b);
 * list.count // => 0
 *
 * // Maps can be iterated using for...of, too
 * for (let [key, value] of map) {
 *   // ...do something for each key-value pair
 * }
 */
export class ManagedMap<
	K extends any = string,
	T extends ManagedObject = ManagedObject
> extends ManagedObject {
	/** Creates a new, empty managed map */
	constructor() {
		super();

		// automatically attach objects once map itself is attached
		addTrap(
			this,
			$_origin,
			(t, p, v) => {
				if (v && this._attach === undefined) this.autoAttach(true);
			},
			() => {
				// ... and clear the map when unlinked
				this.clear();
			}
		);
	}

	/** The number of keys in the map */
	get count() {
		return this[$_map].size;
	}

	/** @internal Property getter for non-observable property bindings */
	[$_get](propertyName: string) {
		if (propertyName === "count") return this.count;
		if (propertyName.startsWith("#"))
			return this.get(propertyName.slice(1) as any);
	}

	/**
	 * Iterator symbol, enables managed maps to work with 'for...of' statements
	 * @example
	 * // Iterate over a ManagedMap instance
	 * for (let [key, value] of map) {
	 *   // ...do something for every key-value pair
	 * }
	 */
	[Symbol.iterator]() {
		return this[$_map][Symbol.iterator]();
	}

	/**
	 * Adds the provided object to the map, with the specified key
	 * @param key The key to set or update
	 * @param target The object to add to the map
	 * @error This method throws an error if the object can't be added to the map.
	 */
	set(key: K, target: T) {
		if (this.isUnlinked()) throw err(ERROR.Object_Unlinked);
		if (!target || target.isUnlinked()) throw invalidArgErr("target");
		if (!(target instanceof (this._restriction || ManagedObject)))
			throw err(ERROR.List_Restriction);

		// check for duplicates if attaching object
		if (this._attach && target[$_origin] === this) {
			if (this[$_map].get(key) !== target) throw err(ERROR.List_Duplicate);
		}

		// set map reference, save old one
		let old = this[$_map].get(key);
		if (old === target) return this;
		this._add(key, target);

		// emit event for removing object, and unlink if needed
		// (event handler could move object to other origin so we check)
		if (old) {
			this.emitChange("ManagedObjectRemoved", {
				key,
				object: old,
			});
			if (this._attach && old[$_origin] === this) unlinkObject(old);
		}

		// emit event for adding objects
		this.emitChange("ManagedObjectAdded", { key, object: target });
		return this;
	}

	/**
	 * Clears the specified key in the map, removing the associated object (if any)
	 * - If the key isn't included in the map, this method simply does nothing.
	 */
	unset(key: K) {
		if (this.isUnlinked()) return this;
		let old = this[$_map].get(key);
		if (old) {
			this[$_map].delete(key);
			if (this._attach && old[$_origin] === this) {
				unlinkObject(old);
			}
			this.emitChange("ManagedObjectRemoved", {
				key,
				object: old,
			});
		}
		return this;
	}

	/**
	 * Removes the specified object from the map
	 * - If the object is included with multiple keys, all of the keys are unset
	 * - If the object isn't included in the list, this method simply does nothing.
	 * @param target The object to remove
	 */
	remove(target: T) {
		if (this.isUnlinked()) return this;
		let data: { key: K; object: T }[] = [];
		for (let [key, object] of this[$_map]) {
			if (object === target) {
				data.push({ key, object });
				this[$_map].delete(key);
				if (this._attach && object[$_origin] === this) {
					unlinkObject(object);
				}
			}
		}

		// emit all ManagedObjectRemovedEvent(s)
		if (data.length) {
			for (let d of data) this.emitChange("ManagedObjectRemoved", d);
		}
		return this;
	}

	/** Removes all keys and objects from the map */
	clear() {
		if (this[$_map].size) {
			// clear internal map, and unlink all objects if needed
			let objects = this._attach ? [...this[$_map].values()] : undefined;
			this[$_map].clear();
			if (objects) {
				for (let object of objects) {
					if (object[$_origin] === this) unlinkObject(object);
				}
			}

			// update count and emit single event
			this.emitChange("ManagedMapChange");
		}
		return this;
	}

	/** Returns the object that's referenced by the specified key */
	get(key: K) {
		return this[$_map].get(key);
	}

	/** Returns true if any object is included in the map with the specified key */
	has(key: K) {
		return this[$_map].has(key);
	}

	/** Returns true if this map contains the specified object */
	includes(target: T) {
		for (let object of this[$_map].values()) {
			if (object === target) return true;
		}
		return false;
	}

	/**
	 * Returns an iterable list of all objects in the map
	 * @note The result of this method isn't an array, but can be iterated using for...of. Alternatively, turn the result into an array using `[...map.objects()]`.
	 */
	objects() {
		return this[$_map].values();
	}

	/**
	 * Returns an iterable list of all keys in the map
	 * @note The result of this method isn't an array, but can be iterated using for...of. Alternatively, turn the result into an array using `[...map.keys()]`.
	 */
	keys() {
		return this[$_map].keys();
	}

	/** Returns an object representation of this map, with properties for all key-object pairs */
	toObject() {
		let result = Object.create(null);
		for (let [key, object] of this[$_map]) {
			result[key] = object;
		}
		return result;
	}

	/** Returns an object representation of this map, with properties for all key-object pairs */
	toJSON() {
		return this.toObject();
	}

	/**
	 * Restricts the type of objects that can be added to this map
	 * @summary This method can be used to limit the type of objects that can be added to the map: all new objects should inherit from the specified class, otherwise they can't be added.
	 * @param ManagedObjectClass The class that all objects in this map should inherit from
	 * @returns The map itself, typed using the specified class.
	 * @error This method throws an error if the map currently already contains any objects that don't inherit from the specified class.
	 */
	restrict<R extends T>(ManagedObjectClass: {
		new (...args: any[]): R;
	}): ManagedMap<K, R> {
		if (this[$_map].size) {
			// check existing objects
			for (let object of this[$_map].values()) {
				if (!(object instanceof ManagedObjectClass))
					throw err(ERROR.List_Restriction);
			}
		}
		this._restriction = ManagedObjectClass;
		return this as any;
	}

	/**
	 * Enable (or disable) attaching of new objects to the map itself
	 * @summary This method can be used to make the map contain all of its (current and new) objects by attaching them. After enabling auto-attachment, adding an object to the map automatically attaches it; removing an object from the map automatically unlinks it (since it's no longer attached); attaching an object to another object (or map or list) automatically removes it from the map (since it can no longer be attached) — but the object won't be unlinked.
	 *
	 * When enabled, if the map currently contains any objects, they're immediately attached. Note that the feature can't be disabled once it has been enabled and there are any objects in the map.
	 *
	 * When enabled, events emitted on any object in the map are automatically re-emitted on the map itself (propagating the event) — unless the `noEventPropagation` argument is set to true.
	 *
	 * @note Objects in a map that's itself attached to another object are also automatically attached. On a map that's itself attached, you may use this method to _disable_ this feature before adding any objects.
	 *
	 * @param set True if all new objects should be attached to the map
	 * @param noEventPropagation True if events should _not_ be re-emitted on the map itself
	 *
	 * @error This method throws an error if the feature can't be enabled or disabled.
	 */
	autoAttach(set: boolean, noPropagation?: boolean) {
		// set property to false ONLY if no attached objects
		if (!set && this._attach && this[$_map].size)
			throw err(ERROR.List_AttachState);

		if (set) {
			// don't allow enabling more than once
			if (this._attach) throw invalidArgErr("set");

			// check for duplicates first: not allowed if attached
			let seen = new Map<T, boolean>();
			for (let object of this[$_map].values()) {
				if (seen.has(object)) throw err(ERROR.List_Duplicate);
				seen.set(object, true);
			}
		}

		// set property to automatically attach new objects
		this._attach = set;
		this._noPropagation = noPropagation;

		if (set) {
			// attach existing objects
			for (let [key, object] of this[$_map]) {
				this._add(key, object);
			}
		}
		return this;
	}

	/** Internal setter that's used when objects are added, also takes care of attachment and automatic unlinking */
	private _add(key: K, target: T) {
		// add object to map
		this[$_map].set(key, target);

		if (this._attach) {
			// attach object, check for unlink/move and events
			attachObject(
				this,
				target,
				new AttachObserver(this, key, target, !this._noPropagation)
			);
		}
	}

	/** True if objects should be attached to this map when added (and no duplicates allowed) */
	private _attach?: boolean;

	/** True if attached object events should NOT be propagated */
	private _noPropagation?: boolean;

	/** Class reference, if objects are restricted using `restrict()` method */
	private _restriction: any;

	/** @internal Map containing all objects */
	private [$_map] = new Map<K, T>();
}

export namespace ManagedMap {
	/** Type definition for an event that's emitted when elements are added to, moved within, or removed from a map */
	export type ChangeEvent<
		TKey extends any = string,
		TObject extends ManagedObject = ManagedObject
	> = ManagedChangeEvent<
		ManagedMap<TKey, TObject>,
		{ key: TKey; object: TObject },
		"ManagedObjectAdded" | "ManagedObjectRemoved" | "ManagedMapChange"
	>;
}

/** @internal Observer that's used for attached objects in a map */
class AttachObserver<K> extends Observer<ManagedMap> {
	constructor(
		public map: ManagedMap<K>,
		public key: K,
		public target: ManagedObject,
		public propagate?: boolean
	) {
		super();
	}
	override stop() {
		// if observer stops, object is moved or unlinked,
		// so remove from this list if needed
		if (this.map.get(this.key) === this.target) this.map.unset(this.key);
		super.stop();
	}
	protected override handleEvent(event: ManagedEvent) {
		if (this.propagate) this.map.emit(event);
	}
}
