import { NullableArray, removeFromNullableArray } from "./NullableArray.js";
import { isManagedObject, ManagedObject } from "./ManagedObject.js";
import { err, ERROR, errorHandler } from "../errors.js";
import type { ManagedEvent } from "./ManagedEvent.js";

// Symbols used for ManagedObject properties:

/** @internal Property that's set to true when object is unlinked */
export const $_unlinked = Symbol("unlinked");

/** @internal Property that refers to the linked origin object */
export const $_origin = Symbol("origin");

/** @internal Property that is set only on root objects (cannot be attached) */
export const $_root = Symbol("root");

/** @internal Getter for non-observable properties (used for e.g. list count) */
export const $_get = Symbol("get");

/** @internal Non-existent property, trap is invoked when an event is emitted */
export const $_traps_event = Symbol("event");

/** Map containing a list of traps for observable properties of managed objects */
const _traps = new WeakMap<ManagedObject, TrapLookup>();

/** Map containing a list of attached objects for each origin managed object */
const _attached = new WeakMap<ManagedObject, NullableArray<ManagedObject>>();

/** Map containing a list of active bindings for each managed object */
const _bindings = new WeakMap<ManagedObject, Bound[]>();

/** Initial binding value, not equal to anything else */
const NO_VALUE = { none: 0 };

/** No-op function, used to retain shape of trap objects for performance */
const NOP = function () {
	/* NOP */
};

/** Cached Object.prototype.hasOwnProperty function */
const _hOP = Object.prototype.hasOwnProperty;

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
	value: unknown,
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
	let list: TrapRef[] | undefined;
	if (!target[$_unlinked]) list = getTrapList(target, p);
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

/** @internal Returns true if given property can be observed on given object, by already initializing the trap if possible */
export function canTrap(
	managedObject: ManagedObject,
	p: string | number | symbol,
) {
	return p in managedObject && !!getTrapList(managedObject, p);
}

/** Returns or creates the current list of traps for given property on given object, may initialize traps for the object altogether, and make property observable by adding a getter and setter */
function getTrapList(target: ManagedObject, p: string | number | symbol) {
	// happy path first: find lookup and return traps list
	let lookup = _traps.get(target)!;
	if (lookup && p in lookup) return lookup[p] || (lookup[p] = []);

	// otherwise, create lookup if needed, with symbols first
	if (!lookup) {
		lookup = Object.create(null);
		lookup[$_traps_event] = [];
		lookup[$_origin] = [];
		setTrapDescriptor(target, $_origin, {
			writable: true,
			value: target[$_origin],
		});
		_traps.set(target, lookup);
	}

	// add specified property to lookup and trap it on the target
	if (typeof p === "string" && p[0] !== "_" && _hOP.call(target, p)) {
		let desc = Object.getOwnPropertyDescriptor(target, p);
		if (desc && desc.configurable) {
			lookup[p] = [];
			setTrapDescriptor(target, p, desc);
		}
	}
	return lookup[p];
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

/**
 * @internal Attach given target to a managed object, and start observing it
 * @error Throws an error if target is already attached to same origin, or loop detected
 */
export function attachObject(
	origin: ManagedObject,
	target: ManagedObject,
	listen?: (target: ManagedObject, event: ManagedEvent) => void,
	detach?: (target: ManagedObject) => void,
): ManagedObject | undefined {
	// check if target is already unlinked
	if (target[$_unlinked]) throw err(ERROR.Object_Unlinked, "target");

	// check for root and circular references
	if (target[$_root]) throw err(ERROR.Object_NoAttach);
	for (let p = origin; p; p = p[$_origin]!) {
		if (p === target) throw err(ERROR.Object_NoAttach);
	}

	// detach from current origin
	if (target[$_origin]) {
		if (target[$_origin] === origin) return;
		detachObject(target[$_origin]!, target);
	}

	// set new origin property (note: this may trigger detach listener)
	target[$_origin] = origin;
	if (!_attached.has(origin)) _attached.set(origin, [target]);
	else _attached.get(origin)!.push(target);

	// observe for unlinking, events, and detachment
	// (stop listening when target is moved to other parent)
	if (detach || listen) {
		let eventTrap = listen
			? addTrap(target, $_traps_event, function (t, p, v) {
					listen(t, v as any);
				})
			: undefined;
		let detachTrap = addTrap(
			target,
			$_origin,
			(t, p, v) => {
				if (v !== origin) {
					removeTrap(eventTrap);
					removeTrap(detachTrap);
					detach?.(t);
				}
			},
			detach?.bind(undefined, target),
		);
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
			for (let bound of bindings) {
				bound.start(origin, nestingLevel);
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
				for (let bound of bindings) bound.clear(nestingLevel);
			}

			// recurse for attached managed objects, increase level
			let attached = _attached.get(target);
			if (attached) {
				for (let c of attached) c && updateWatched(c, origin, nestingLevel + 1);
			}
		}
		updateWatched(target, origin, 0);
	}
}

// -- Binding functions ----------------------------------------------

/** @internal Add a watched binding path on origin(s) of given managed object */
export function watchBinding(
	managedObject: ManagedObject,
	label: string | symbol | undefined,
	path: ReadonlyArray<string>,
	f: (value: any, bound: boolean) => void,
) {
	if (!managedObject || !path.length) throw TypeError();
	if (managedObject[$_unlinked]) return;

	// add Bound structure to list of bindings for object
	let bound = new Bound(managedObject, label, path, guard(f));
	if (!_bindings.has(managedObject)) _bindings.set(managedObject, [bound]);
	else _bindings.get(managedObject)!.push(bound);

	// if already attached, try to start watching already
	if (managedObject[$_origin]) bound.start();
}

/** @internal Object that encapsulates a watched binding path on a managed object instance */
class Bound {
	constructor(
		/** Object to which the binding is applied (binding target) */
		public o: ManagedObject,
		/** Source origin label, if any */
		public b: string | symbol | undefined,
		/** Property path to watch */
		public p: ReadonlyArray<string>,
		/** Function that's called when value is updated */
		public f: (value: any, bound: boolean) => void,
	) {}

	/** Try to start watching from the provided (or original) origin, if not already bound */
	start(origin?: ManagedObject, nestingLevel = 0) {
		if (this.t || !this.o || this.o[$_unlinked]) return;
		if (!origin) {
			origin = this.o[$_origin];
		}
		while (!this._check(origin, nestingLevel)) {
			origin = origin![$_origin];
			nestingLevel++;
		}
	}

	/** Clear all traps and set to undefined, IF currently bound at or beyond given nesting level */
	clear(nestingLevel: number) {
		if (this.i >= nestingLevel) {
			for (let t of this.t!) removeTrap(t);
			this.t = undefined;
			this.i = -2;
			this._invoke(undefined, true, true);
		}
	}

	/** Origin nesting level currently bound to, or -1 if not bound, -2 if not bound and already set to undefined */
	private i = -1;

	/** List of traps, if currently bound */
	private t: TrapRef[] | undefined = undefined;

	/** Check for a possible source, and watch property path if possible */
	private _check(origin: ManagedObject | undefined, nestingLevel: number) {
		// if can't be bound, set bound value to undefined
		if (!origin || origin[$_unlinked]) {
			if (this.i !== -2) {
				this.t = undefined;
				this.i = -2;
				this._invoke(undefined, true, true);
			}
			return true;
		}

		// check source label, and check for lists
		// (don't bind to e.g. `.count` on containing lists)
		let first = this.p[0]!;
		let candidate =
			(this.b === undefined || this.b in origin) &&
			!(Symbol.iterator in origin);
		if (candidate && canTrap(origin, first)) {
			// watch all properties along path
			this.i = nestingLevel;
			this.t = [];
			this._trapProperty(origin, 0);
			return true;
		}

		// error if already at root, or property exists
		if (origin[$_root] || (candidate && first in origin)) {
			let error = err(ERROR.Object_NoObserve, first);
			errorHandler(error);
			return true;
		}
	}

	/** Add a trap to listen for property changes on given object, for link `i` */
	private _trapProperty(target: ManagedObject, i: number) {
		let self = this;
		let traps = this.t!;
		let trap: TrapRef | undefined = (traps[i] = addTrap(
			target,
			this.p[i]!,
			this._makeChainCallback(i),
			function () {
				// managed object unlinked and/or detached
				if (trap === traps[i]) {
					if (!i) {
						// if this was the first trap, start all over
						for (let t of traps) removeTrap(t);
						self.t = undefined;
						self.i = -1;
						self.start();
					} else {
						// otherwise, just remove traps from here
						for (let j = traps.length - 1; j >= i; j--) {
							removeTrap(traps[j]);
						}
						traps.length = i;
						self._invoke(undefined, true, true);
					}
				}
			},
			true,
		));
	}

	/** Add a trap to listen for change events on given object, for link `i` (always > 0) */
	private _trapChangeEvent(object: ManagedObject, i: number) {
		let self = this;
		let traps = this.t!;
		let trap = (traps[i] = addTrap(
			object,
			$_traps_event,
			function (t, _, v) {
				if ((v as ManagedEvent).data.change === t) {
					if (trap === traps[i]) {
						self._invoke(self._get(object, i - 1), false, true);
					}
				}
			},
			() => {
				if (trap === traps[i]) self._invoke(undefined);
			},
		));
	}

	/** Helper to make a callback that watches link `i` along the binding path */
	private _makeChainCallback(i: number): TrapFunction {
		let self = this;
		let traps = this.t!;
		let next = i + 1;
		let nextProp = this.p[next]!;
		let last = next >= this.p.length;
		return function (_, _p, value) {
			// remove traps beyond this point
			for (let j = traps.length - 1; j > i; j--) {
				removeTrap(traps[j]);
			}
			traps.length = next;

			// use new value to invoke binding or keep looking
			if (last) {
				// last part of path: invoke with found value
				self._invoke(value);
			} else if (value == undefined || (value as ManagedObject)[$_unlinked]) {
				// undefined/null or unlinked object, don't look further
				self._invoke(undefined);
			} else if (isManagedObject(value)) {
				// found a managed object along the way
				if (canTrap(value, nextProp)) {
					// observe this property and move on if/when value set
					self._trapProperty(value, next);
				} else {
					// otherwise, at least watch for change events and unlink
					self._trapChangeEvent(value, next);
					self._invoke(self._get(value, i));
				}
			} else {
				// any other value: just get value and invoke with that
				self._invoke(self._get(value, i));
			}
		};
	}

	/** Helper method to get a property of given source (may be an object), for link `i` onwards */
	private _get(source: any, i: number) {
		let pathLen = this.p.length;
		for (let j = i + 1; j < pathLen; j++) {
			let nextP = this.p[j]!;
			if (source == null) break;
			if (isManagedObject(source)) source = source[$_get](nextP);
			else source = source[nextP];
		}
		return source;
	}

	/** Invoke the update function if needed */
	private _invoke(value: any, unbound?: boolean, force?: boolean) {
		if (!this.o[$_unlinked] && (force || value !== this._v)) {
			this.f.call(undefined, (this._v = value), !unbound);
		}
	}

	/** Last value for which the update function was invoked */
	private _v = NO_VALUE;
}
