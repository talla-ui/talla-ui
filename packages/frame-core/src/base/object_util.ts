import { NullableArray, removeFromNullableArray } from "./NullableArray.js";
import { isManagedObject, ManagedObject } from "./ManagedObject.js";
import { err, ERROR, errorHandler } from "../errors.js";
import { Observer } from "./Observer.js";
import { ManagedEvent } from "./ManagedEvent.js";

// Symbols used for ManagedObject properties:

/** @internal Property that's set to true when object is unlinked */
export const $_unlinked = Symbol("unlinked");

/** @internal Property that refers to the linked origin object */
export const $_origin = Symbol("origin");

/** @internal Getter for non-observable properties (used for e.g. list count) */
export const $_get = Symbol("get");

/** @internal Filter function for bindings that pass along an origin object */
export const $_bindFilter = Symbol("bndF");

/** @internal Non-existent property, trap is invoked when an event is emitted */
export const $_traps_event = Symbol("event");

/** Map containing a list of traps for observable properties of managed objects */
const _traps = new WeakMap<ManagedObject, TrapLookup>();

/** Map containing a list of attached objects for each origin managed object */
const _attached = new WeakMap<ManagedObject, NullableArray<ManagedObject>>();

/** Map containing a list of active bindings for each managed object */
const _bindings = new WeakMap<ManagedObject, BindRef[]>();

/** Map containing automatically attached observers for each managed object (target) that's observed */
const _observers = new WeakMap<ManagedObject, Observer[]>();

/** Initial binding value, not equal to anything else */
const NO_VALUE = { none: 0 };

/** No-op function, used to retain shape of trap objects for performance */
const NOP = function () {
	/* NOP */
};

/** @internal Helper function to handle exceptions from given function */
export function guard<F extends Function>(f: F): F {
	let g = function (this: any) {
		try {
			return f.apply(this, arguments);
		} catch (err) {
			errorHandler(err);
		}
	} as any;
	g.orig = f;
	return g;
}

// -- Trap functions -------------------------------------------------

/** @internal Object that encapsulates a trap function and unlink function */
export type TrapRef = {
	/** Function that's called when value is updated */
	t: TrapFunction;
	/** Function that's called when trap is unlinked */
	u: () => void;
	/** List to which this trap has been added (for removal) */
	l: NullableArray<TrapRef>;
	/** Object to which this trap has been added (for unlinked check) */
	o: ManagedObject;
};

/** Function that's called when a trap is invoked */
type TrapFunction = (
	target: ManagedObject,
	p: string | number | symbol,
	value: any,
) => void;

/** Object that contains traps that are set for different properties */
type TrapLookup = { [p: string | number | symbol]: TrapRef[] | undefined };

/**
 * @internal
 * Add a trap to a managed object (target) for a given property
 * @param target The managed object to add the trap to
 * @param p The property to add the trap to
 * @param trap Function to call when value is set (will be guarded)
 * @param unlinked Function to call when the managed object is unlinked
 * @param init True if trap function should be invoked immediately
 * @returns Trap reference, can be used to remove trap
 */
export function addTrap(
	target: ManagedObject,
	p: string | number | symbol,
	trap?: TrapFunction,
	unlinked?: () => void,
	init?: boolean,
) {
	let list = getTrapList(target, p);
	if (!list) {
		throw err(
			ERROR.Object_NoObserve,
			typeof p === "symbol" ? p.description : p,
		);
	}
	let t = trap ? guard(trap) : NOP;
	let u = unlinked ? guard(unlinked) : NOP;
	let trapObj: TrapRef = {
		t,
		u,
		l: list,
		o: target,
	};
	list.push(trapObj);
	if (init) {
		try {
			let value = (target as any)[p];
			t(target, p, value);
		} catch {}
	}
	return trapObj;
}

/** @internal Remove given trap (if object isn't unlinked yet) */
export function removeTrap(trap?: TrapRef) {
	if (trap && !trap.o[$_unlinked]) {
		removeFromNullableArray(trap.l, trap);
	}
}

/** @internal Invoke all trap functions for a given object and property, with given value */
export function invokeTrap(
	managedObject: ManagedObject,
	p: string | number | symbol,
	value: any,
) {
	let list = _traps.get(managedObject);
	if (list && list[p]) {
		for (let t of list[p]!.slice()) {
			if (t && !managedObject[$_unlinked]) {
				t.t(managedObject, p, value);
			}
		}
	}
}

/** @internal Returns true if there are any traps for given property on given object */
export function hasTraps(
	managedObject: ManagedObject,
	p: string | number | symbol,
) {
	return !!_traps.get(managedObject)?.[p]?.length;
}

/** @internal Returns true if given property can be observed on given object */
export function canTrap(
	managedObject: ManagedObject,
	p: string | number | symbol,
) {
	return p in managedObject && !!getTrapList(managedObject, p);
}

/** Returns or creates the current list of traps for given property on given object, may initialize traps for the object altogether, and make (own) properties observable by adding a getter and setter */
function getTrapList(
	managedObject: ManagedObject,
	p: string | number | symbol,
) {
	// happy path first: find lookup and return traps list
	let lookup = _traps.get(managedObject)!;
	if (lookup && p in lookup) return lookup[p] || (lookup[p] = []);

	// otherwise, create lookup and/or add property trap
	if (!managedObject[$_unlinked]) {
		if (!lookup) {
			// set new traps object and trap origin reference if needed
			lookup = Object.create(null);
			lookup[$_traps_event] = [];
			lookup[$_origin] = [];
			setTrapDescriptor(managedObject, $_origin, {
				writable: true,
				value: managedObject[$_origin],
			});
			_traps.set(managedObject, lookup);
		}

		// find all configurable properties, and trap them
		for (let k of Object.getOwnPropertyNames(managedObject)) {
			if (k in lookup || k[0] === "_") continue;
			let desc = Object.getOwnPropertyDescriptor(managedObject, k);
			if (desc && desc.configurable) {
				lookup[k] = k === p ? [] : undefined;
				setTrapDescriptor(managedObject, k, desc);
			}
		}
		return lookup[p];
	}
}

/** Add a getter/setter for an (own) property on given managed object, to invoke its trap (only used by getTrapList above) */
function setTrapDescriptor(
	managedObject: ManagedObject,
	p: string | number | symbol,
	desc: PropertyDescriptor,
) {
	if (desc.set) {
		// override property with new setter that calls old one
		Object.defineProperty(managedObject, p, {
			...desc,
			set(v) {
				desc.set!.call(this, v);
				invokeTrap(managedObject, p, (managedObject as any)[p]);
			},
		});
	} else if (!desc.get && desc.writable) {
		// override property with getter and setter
		let value = desc.value;
		Object.defineProperty(managedObject, p, {
			enumerable: desc.enumerable,
			get() {
				return value;
			},
			set(v) {
				if (value !== v) {
					value = v;
					invokeTrap(managedObject, p, v);
				}
			},
		});
	}
}

// -- Link management functions --------------------------------------

/** @internal Unlink given managed object, detaching it and removing all traps, then recurse */
export function unlinkObject(managedObject: ManagedObject) {
	if (managedObject[$_unlinked]) return;

	// call beforeUnlink method, handle errors
	guard((managedObject as any).beforeUnlink).call(managedObject);
	managedObject[$_unlinked] = true;

	// detach from origin managed object
	let origin = managedObject[$_origin];
	if (origin && !origin[$_unlinked]) {
		detachObject(origin, managedObject);
	}

	// clear traps list
	let trapRefs = _traps.get(managedObject);
	if (trapRefs) {
		_traps.delete(managedObject);

		// call handlers on traps on own properties (strings AND symbols, e.g. origin ref)
		let unlinkHandlers: Array<() => void> = [];
		for (let p in trapRefs) {
			if (trapRefs[p]) {
				for (let t of trapRefs[p]!) if (t && t.u) unlinkHandlers.push(t.u);
			}
		}
		for (let s of Object.getOwnPropertySymbols(trapRefs)) {
			if (trapRefs[s]) {
				for (let t of trapRefs[s]!) if (t && t.u) unlinkHandlers.push(t.u);
			}
		}
		for (let u of unlinkHandlers) u();
	}

	// unlink all attached managed objects, if not unlinked yet
	let attached = _attached.get(managedObject);
	if (attached) {
		_attached.delete(managedObject);
		for (let c of attached.splice(0)) {
			if (c) unlinkObject(c);
		}
	}

	// remove bindings list reference explicitly
	_bindings.delete(managedObject);
}

/** @internal Attach given target to a managed object, and start observing it; returns target if was attached, undefined if it was already attached to same origin or circular reference found */
export function attachObject(
	origin: ManagedObject,
	target: ManagedObject,
	observer?: Observer,
): ManagedObject | undefined {
	// check for circular references
	for (let p = origin; p; p = p[$_origin]!) {
		if (p === target) return;
	}

	// detach from current origin
	if (target[$_origin]) {
		if (target[$_origin] === origin) return;
		detachObject(target[$_origin]!, target);
	}

	// set new origin property (note: this may trigger existing observer)
	target[$_origin] = origin;
	if (!_attached.has(origin)) _attached.set(origin, [target]);
	else _attached.get(origin)!.push(target);

	// link observer and remember it
	if (observer) {
		let observers = _observers.get(target);
		if (!observers) _observers.set(target, (observers = []));
		observers.push(observer);
		guard(observer.observe).call(observer, target);
	}

	// update bindings recursively
	function updateWatched(
		target: ManagedObject,
		origin: ManagedObject,
		nestingLevel: number,
	) {
		if (target[$_unlinked]) return;

		// look for bindings on new origin(s)
		let bindings = _bindings.get(target);
		if (bindings) {
			for (let bindRef of bindings) {
				if (!bindRef.t) {
					tryWatchFromOrigin(target, origin, bindRef, nestingLevel);
				}
			}
		}

		// recurse for attached managed objects, increase level
		let attached = _attached.get(target);
		if (attached) {
			for (let c of attached) c && updateWatched(c, origin, nestingLevel + 1);
		}
	}
	updateWatched(target, origin, 0);
	return target;
}

/** Detach given target from a managed object, either before moving or when unlinked (called above) */
function detachObject(origin: ManagedObject, target: ManagedObject) {
	if (target[$_origin] === origin) {
		// remove link both ways
		target[$_origin] = undefined;
		removeFromNullableArray(_attached.get(origin)!, target);

		// update bindings recursively
		function updateWatched(
			target: ManagedObject,
			origin: ManagedObject,
			nestingLevel: number,
		) {
			// clear bindings from given nesting level
			let bindings = _bindings.get(target);
			if (bindings) {
				for (let w of bindings) {
					if (w.t && w.i >= nestingLevel) {
						// remove first trap, which clears others
						if (w.t[0]) w.t[0].u();
						else w.t = undefined;
					}
				}
			}

			// recurse for attached managed objects, increase level
			let attached = _attached.get(target);
			if (attached) {
				for (let c of attached) c && updateWatched(c, origin, nestingLevel + 1);
			}
		}
		updateWatched(target, origin, 0);

		// update attached observers, if any
		if (target[$_unlinked]) {
			// observers will handle unlinking themselves
			_observers.delete(target);
		} else {
			// stop observers, if still observing
			let observers = _observers.get(target);
			if (observers) {
				_observers.delete(target);
				for (let observer of observers) {
					if (observer.observed === target) {
						guard(observer.stop).call(observer);
					}
				}
			}
		}
	}
}

/** @internal Add a trap for given property on a managed object, to attach all objects that are assigned to it, and automatically unlink and clear; also handles objects that are _already_ referenced by this property */
export function watchAttachProperty(
	managedObject: ManagedObject,
	propertyName: string | number | symbol,
	observer?: Observer,
) {
	let trap: TrapRef | undefined;
	let attached: ManagedObject | undefined = undefined;
	if (!(propertyName in managedObject)) {
		(managedObject as any)[propertyName] = undefined;
	}
	addTrap(
		managedObject,
		propertyName,
		function (target, p, value) {
			// handle new value, if changed
			if (value !== attached) {
				if (trap) removeTrap(trap);
				trap = undefined;
				let toUnlink = attached;
				attached = undefined;

				// attach new object, add event and unlink handler
				if (isManagedObject(value) && !value[$_unlinked]) {
					// attach, if not circular or already attached
					if (attachObject(managedObject, value)) {
						attached = value;

						// add a trap to handle targets being moved or unlinked
						let myTrap = (trap = addTrap(
							value,
							$_origin,
							() => {
								// check if target has been moved
								if (value[$_origin] !== managedObject) detach();
							},
							detach, // if unlinked
						));
						function detach() {
							if (myTrap === trap) trap = undefined;
							if ((managedObject as any)[propertyName] === value) {
								(managedObject as any)[propertyName] = undefined;
							}
						}

						// observe the new target on the same observer
						if (observer) guard(observer.observe).call(observer, value);
					}
				}

				// unlink old object if needed
				if (
					toUnlink &&
					toUnlink[$_origin] === managedObject &&
					!toUnlink[$_unlinked]
				) {
					// unlink previously attached managed object
					unlinkObject(toUnlink);
				}
			}
		},
		function () {
			// origin managed object itself unlinked, set property to undefined and unlink
			if (trap) removeTrap(trap);
			let toUnlink = attached;
			attached = undefined;
			if (
				toUnlink &&
				toUnlink[$_origin] === managedObject &&
				!toUnlink[$_unlinked]
			) {
				// unlink previously attached managed object
				unlinkObject(toUnlink);
			}
			(managedObject as any)[propertyName] = undefined;
		},
		true,
	);
}

// -- Binding functions ----------------------------------------------

/** @internal Object that encapsulates a watched binding path on a managed object instance */
export type BindRef = {
	/** Function that's called when value is updated */
	f: (value: any, bound: boolean) => void;
	/** Origin nesting level currently bound to, or -1 if not bound, -2 if not bound and already set to undefined */
	i: number;
	/** List of traps, if currently bound */
	t?: TrapRef[];
	/** Property path to watch */
	p: ReadonlyArray<string>;
};

/** @internal Add a watched binding path on origin(s) of given managed object */
export function watchBinding(
	managedObject: ManagedObject,
	path: ReadonlyArray<string>,
	f: (value: any, bound: boolean) => void,
) {
	if (!managedObject || !path.length) throw TypeError();
	if (managedObject[$_unlinked]) return;
	f = guard(f);
	let bindRef: BindRef = {
		f,
		i: -1,
		t: undefined,
		p: path,
	};

	// add BindRef to list of bindings for object
	if (!_bindings.has(managedObject)) _bindings.set(managedObject, [bindRef]);
	else _bindings.get(managedObject)!.push(bindRef);

	// if already attached, try to start watching already
	if (managedObject[$_origin]) {
		tryWatchFromOrigin(managedObject, managedObject[$_origin], bindRef);
	}
}

/** Search for a possible binding and watch property path if possible (recursive) */
function tryWatchFromOrigin(
	managedObject: ManagedObject,
	origin: ManagedObject | undefined,
	bindRef: BindRef,
	nestingLevel = 0,
): void {
	if (origin && !origin[$_unlinked]) {
		// if the linked origin object is a list, skip it right away
		// (don't bind to e.g. `.count` on containing lists)
		if (Symbol.iterator in origin) {
			tryWatchFromOrigin(
				managedObject,
				origin[$_origin],
				bindRef,
				nestingLevel + 1,
			);
		} else {
			// watch all properties along path if possible
			let first = bindRef.p[0]!;
			if (canTrap(origin, first)) {
				bindRef.i = nestingLevel;
				watchFromOrigin(managedObject, origin, bindRef);
			} else {
				// check if bind filter set, or otherwise unobservable
				let allowed = !origin[$_bindFilter] || origin[$_bindFilter](first);
				if (!allowed || first in origin) {
					let error = err(ERROR.Object_NoObserve, first);
					errorHandler(error);
					return;
				}

				// check on next linked origin, increase nesting level
				tryWatchFromOrigin(
					managedObject,
					origin[$_origin],
					bindRef,
					nestingLevel + 1,
				);
			}
		}
	} else if (bindRef.i !== -2) {
		// can't be bound, set bound value to undefined
		bindRef.i = -2;
		bindRef.f(undefined, false);
	}
}

/** Watch property path on given origin object (used by tryWatchFromOrigin when observable property is definitely found) */
function watchFromOrigin(
	managedObject: ManagedObject,
	origin: ManagedObject,
	bindRef: BindRef,
) {
	let pathLen = bindRef.p.length;
	let lastInvokedWith = NO_VALUE;
	let traps: TrapRef[] = (bindRef.t = []);

	// add trap(s) on origin object recursively using functions below
	setChainTrap(origin, 0, makeTrapFunction(0));

	// helper function to invoke the binding callback, if new value
	function invoke(value: any, bound: boolean, force?: boolean) {
		if (!managedObject[$_unlinked] && (force || value !== lastInvokedWith)) {
			bindRef.f((lastInvokedWith = value), bound);
		}
	}

	// helper function to get a (nested) value using path
	function getValue(value: any, i: number) {
		for (let j = i + 1; j < pathLen; j++) {
			let nextP = bindRef.p[j]!;
			if (value != undefined) {
				if (isManagedObject(value)) value = value[$_get](nextP);
				else value = value[nextP];
			}
		}
		return value;
	}

	// helper function to make a trap handler function for part of the path
	function makeTrapFunction(i: number): TrapFunction {
		let next = i + 1;
		return function (target, p, value) {
			// remove traps beyond this point
			for (let j = traps.length - 1; j > i; j--) {
				removeTrap(traps[j]);
			}
			traps.length = next;

			// use new value to invoke binding or keep looking
			if (next >= pathLen) {
				// last part of path: invoke with found value
				invoke(value, true);
			} else if (value == undefined || value[$_unlinked]) {
				// undefined/null or unlinked object, don't look further
				invoke(undefined, true);
			} else if (isManagedObject(value)) {
				// found a managed object along the way
				if (canTrap(value, bindRef.p[next]!)) {
					// observe this property and move on if/when value set
					setChainTrap(value, next, makeTrapFunction(next));
				} else {
					// otherwise, at least watch for change events
					setEventTrap(value, next);
					invoke(getValue(value, i), false);
				}
			} else {
				// any other value: just get value and invoke with that
				invoke(getValue(value, i), true);
			}
		};
	}

	// set a trap on given target for link `i`
	function setChainTrap(target: ManagedObject, i: number, f: TrapFunction) {
		let trap: TrapRef | undefined = (traps[i] = addTrap(
			target,
			bindRef.p[i]!,
			f,
			function () {
				// managed object unlinked and/or detached
				if (trap === traps[i]) {
					if (!i) {
						// if this was the first trap, start all over
						for (let t of traps) removeTrap(t);
						bindRef.i = -1;
						bindRef.t = undefined;
						if (!managedObject[$_unlinked]) {
							tryWatchFromOrigin(
								managedObject,
								managedObject[$_origin],
								bindRef,
							);
						}
					} else {
						// otherwise, just remove traps from here
						for (let j = traps.length - 1; j >= i; j--) {
							removeTrap(traps[j]);
						}
						traps.length = i;
						invoke(undefined, false);
					}
				}
			},
			true,
		));
	}

	// set a trap on given target for link `i`, just to listen for change events
	function setEventTrap(target: ManagedObject, i: number, isLast?: boolean) {
		let trap = (traps[i] = addTrap(target, $_traps_event, function (t, p, v) {
			if (ManagedEvent.isChange(v)) {
				if (trap === traps[i])
					invoke(isLast ? target : getValue(target, i - 1), true, isLast);
			}
		}));
	}
}
