import type { ObservableObject } from "./ObservableObject.js";
import { err, ERROR, errorHandler } from "../errors.js";
import type { ObservableEvent } from "./ObservableEvent.js";

// Symbols used for ObservableObject properties:

/** @internal Property that's set to true when object is unlinked */
export const $_unlinked = Symbol("unlinked");

/** @internal Property that refers to the linked origin object */
export const $_origin = Symbol("origin");

/** @internal Property that is set only on root objects (cannot be attached) */
export const $_root = Symbol("root");

/** @internal Property that is set to true (on the object prototype) if properties of this object should not be bound */
export const $_nobind = Symbol("nobind");

/** @internal Property that refers to a list of event interceptors */
export const $_intercept = Symbol("intercept");

/** @internal Non-existent property, trap is invoked when an event is emitted */
export const $_traps_event = Symbol("event");

/** @internal Symbol for a property that references the method to apply a binding to a target object */
export const $_bind_apply = Symbol("bind_apply");

/** Map containing a list of traps for observable properties of observable objects */
const _traps = new WeakMap<ObservableObject, TrapLookup>();

/** Map containing a list of attached objects for each origin observable object */
const _attached = new WeakMap<
	ObservableObject,
	NullableArray<ObservableObject>
>();

/** Map containing a list of active bindings for each observable object */
const _bindings = new WeakMap<ObservableObject, Bound[]>();

// Values used for bindings

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

// -- Nullable array helper type -------------------------------------

/** @internal Type of array that has null gaps, used with `removeFromNullableArray()` */
type NullableArray<T> = Array<T | null>;

/** @internal Helper function to remove a value from a NullableArray in the most performant way */
function removeFromNullableArray<T>(a: NullableArray<T>, v: T) {
	const len = a !== undefined ? a.length : 0;
	if (len === 0) return;
	if (len === 1 && a[0] === v) {
		// single element, just remove it
		a.length = 0;
	} else if (len === 2) {
		if (a[0] === v) {
			// take second element only
			a[0] = a[1]!;
		}
		// take first element only
		a.length = 1;
	} else if (len < 16) {
		// replace element with a null value, much faster
		for (let i = len; i > 0; ) {
			if (a[--i] === v) {
				a[i] = null;
				break;
			}
		}
	} else {
		// remove element and all nulls on the way (slowest, copy)
		let j = 0;
		for (let i = 0; i < len; i++) {
			let cur = a[i];
			if (cur === null || cur === v) continue;
			if (i !== j) a[j] = cur!;
			j++;
		}
		a.length = j;
	}
}

// -- Trap functions -------------------------------------------------

/** @internal Object that encapsulates a trap function and unlink function */
export type TrapRef = {
	/** Function that's called when value is updated */
	t: TrapFunction<any>;
	/** Function that's called when trap is unlinked */
	u: () => void;
	/** List to which this trap has been added (for removal) */
	l: NullableArray<TrapRef>;
	/** Object to which this trap has been added (for unlinked check) */
	o: ObservableObject;
};

/** Function that's called when a trap is invoked */
type TrapFunction<TObject extends ObservableObject, TValue = unknown> = (
	target: TObject,
	value: TValue,
) => void;

/** Object that contains traps that are set for different properties */
type TrapLookup = { [p: string | number | symbol]: TrapRef[] | undefined };

/**
 * @internal
 * Add a trap to an observable object (target) for a given property
 * @param target The observable object to add the trap to
 * @param p The property to add the trap to
 * @param trap Function to call when value is set (will be guarded)
 * @param unlinked Function to call when the observable object is unlinked
 * @param init True if trap function should be invoked immediately
 * @returns Trap reference, can be used to remove trap
 */
export function addTrap<TObject extends ObservableObject>(
	target: TObject,
	p: string | number | symbol,
	trap?: TrapFunction<TObject>,
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
			t(target, value);
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
	observedObject: ObservableObject,
	p: string | number | symbol,
	value: any,
) {
	let list = _traps.get(observedObject);
	if (list && list[p]) {
		for (let t of list[p]!.slice()) {
			if (t && !observedObject[$_unlinked]) {
				t.t(observedObject, value);
			}
		}
	}
}

/** @internal Returns true if given property can be observed on given object, by already initializing the trap if possible */
export function canTrap(
	observedObject: ObservableObject,
	p: string | number | symbol,
) {
	return p in observedObject && !!getTrapList(observedObject, p);
}

/** Returns or creates the current list of traps for given property on given object, may initialize traps for the object altogether, and make property observable by adding a getter and setter */
function getTrapList(target: ObservableObject, p: string | number | symbol) {
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

/** Add a getter/setter for an (own) property on given observable object, to invoke its trap (only used by getTrapList above) */
function setTrapDescriptor(
	target: ObservableObject,
	p: string | number | symbol,
	desc: PropertyDescriptor,
) {
	if (desc.set) {
		// override property with new setter that calls old one
		Object.defineProperty(target, p, {
			...desc,
			set(v) {
				desc.set!.call(this, v);
				invokeTrap(target, p, (target as any)[p]);
			},
		});
	} else if (!desc.get && desc.writable) {
		// override property with getter and setter
		let value = desc.value;
		Object.defineProperty(target, p, {
			enumerable: desc.enumerable,
			get() {
				return value;
			},
			set(v) {
				if (value !== v) {
					value = v;
					invokeTrap(target, p, v);
				}
			},
		});
	}
}

// -- Link management functions --------------------------------------

/** @internal Unlink given observable object, detaching it and removing all traps, then recurse */
export function unlinkObject(observedObject: ObservableObject) {
	if (observedObject[$_unlinked]) return;

	// call beforeUnlink method, handle errors
	guard((observedObject as any).beforeUnlink).call(observedObject);
	observedObject[$_unlinked] = true;

	// detach from origin observable object
	let origin = observedObject[$_origin];
	if (origin && !origin[$_unlinked]) {
		detachObject(origin, observedObject);
	}

	// clear traps list
	let trapRefs = _traps.get(observedObject);
	if (trapRefs) {
		_traps.delete(observedObject);

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

	// unlink all attached observable objects, if not unlinked yet
	let attached = _attached.get(observedObject);
	if (attached) {
		_attached.delete(observedObject);
		for (let c of attached.splice(0)) {
			if (c) unlinkObject(c);
		}
	}

	// remove bindings list reference explicitly
	_bindings.delete(observedObject);
}

/**
 * @internal Attach given target to an observable object, and start observing it
 * @error Throws an error if a loop is detected
 */
export function attachObject(
	origin: ObservableObject,
	target: ObservableObject,
	listen?: (target: ObservableObject, event: ObservableEvent) => void,
	detach?: (target: ObservableObject) => void,
): ObservableObject | undefined {
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
			? addTrap(target, $_traps_event, listen as any)
			: undefined;
		let detachTrap = addTrap(
			target,
			$_origin,
			(t, v) => {
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
		target: ObservableObject,
		origin: ObservableObject,
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

		// recurse for attached observable objects, increase level
		let attached = _attached.get(target);
		if (attached) {
			for (let c of attached) c && updateWatched(c, origin, nestingLevel + 1);
		}
	}
	updateWatched(target, origin, 0);
	return target;
}

/** Detach given target from an observable object, either before moving or when unlinked (called above) */
function detachObject(origin: ObservableObject, target: ObservableObject) {
	if (target[$_origin] === origin) {
		// remove link both ways
		target[$_origin] = undefined;
		removeFromNullableArray(_attached.get(origin)!, target);

		// update bindings recursively
		function updateWatched(
			target: ObservableObject,
			origin: ObservableObject,
			nestingLevel: number,
		) {
			// clear bindings from given nesting level
			let bindings = _bindings.get(target);
			if (bindings) {
				for (let bound of bindings) bound.clear(nestingLevel);
			}

			// recurse for attached observable objects, increase level
			let attached = _attached.get(target);
			if (attached) {
				for (let c of attached) c && updateWatched(c, origin, nestingLevel + 1);
			}
		}
		updateWatched(target, origin, 0);
	}
}

// -- Binding functions ----------------------------------------------

/** @internal Representation of a bound binding, can be rebound */
export type BoundResult = { a: ObservableObject; r: boolean };

/** @internal Add a watched binding path on specified origin, or origin(s) of given observable object */
export function watchBinding(
	observedObject: ObservableObject,
	origin: ObservableObject | undefined,
	path: ReadonlyArray<string | number | symbol>,
	f: (value: any, bound: boolean) => void,
) {
	if (!observedObject || !path.length) throw TypeError();
	if (observedObject[$_unlinked]) return;

	// add Bound structure to list of bindings for object
	let bound = new Bound(observedObject, path, guard(f), !origin);
	if (!_bindings.has(observedObject)) _bindings.set(observedObject, [bound]);
	else _bindings.get(observedObject)!.push(bound);

	// if origin already set/attached, try to start watching already
	let o = origin || observedObject[$_origin];
	if (o) bound.start(o, 0);
	return bound as BoundResult;
}

/** @internal Rebind given (bound) binding to a new origin */
export function rebind(
	bound: BoundResult,
	origin: ObservableObject | undefined,
) {
	if (bound.r) throw TypeError();
	(bound as Bound).clear(0);
	if (origin) (bound as Bound).start(origin, 0);
}

/** @internal Object that encapsulates a watched binding path on an observable object instance */
class Bound {
	constructor(
		/** Object to which the binding is applied (binding target) */
		public a: ObservableObject,
		/** Property path to watch */
		public p: ReadonlyArray<string | number | symbol>,
		/** Function that's called when value is updated */
		public f: (value: any, bound: boolean) => void,
		/** True if origin is not fixed (automatically rebind when object is attached/moved) */
		public r: boolean,
	) {}

	/** Origin nesting level currently bound to, or -1 if not bound, -2 if not bound and already set to undefined */
	private i = -1;

	/** List of traps, if currently bound */
	private t: TrapRef[] | undefined = undefined;

	/** Last value for which the update function was invoked */
	private _v = NO_VALUE;

	/** Try to start watching from the provided (or original) origin, if not already bound */
	start(origin: ObservableObject | undefined, nestingLevel: number) {
		if (this.t || !this.a || this.a[$_unlinked]) return;
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

	/** Check for a possible source, and watch property path if possible */
	private _check(origin: ObservableObject | undefined, nestingLevel: number) {
		// if can't be bound, set bound value to undefined
		if (!origin || origin[$_unlinked]) {
			if (this.i !== -2) {
				this.t = undefined;
				this.i = -2;
				this._invoke(undefined, true, true);
			}
			return true;
		}

		// check source binding type and check if property is observable
		let firstProp: string | number | symbol | undefined;
		if (!origin[$_nobind]) {
			firstProp = this.p[0]!;
			if (canTrap(origin, firstProp)) {
				// watch all properties along path
				this.i = nestingLevel;
				this.t = [];
				this._trapProperty(origin, 0);
				return true;
			}
			if (firstProp in origin) {
				// only watch for change events on this object
				this.i = nestingLevel;
				this.t = [];
				this._trapChangeEvent(origin, 0, false);
				this._invoke((origin as any)[firstProp]);
				return true;
			}
		}

		// error if already at root, or not going to rebind
		if (origin[$_root] || !this.r) {
			this.t = []; // prevent restart on attachment
			errorHandler(
				firstProp == null
					? err(ERROR.Object_NoBind, this.p.join("."))
					: err(ERROR.Object_NoObserve, firstProp),
			);
			return true;
		}
	}

	/** Add a trap to listen for property changes on given object, for link `i` */
	private _trapProperty(target: ObservableObject, i: number) {
		let self = this;
		let traps = this.t!;
		let trap: TrapRef | undefined = (traps[i] = addTrap(
			target,
			this.p[i]!,
			this._makeChainCallback(i),
			function () {
				// observable object unlinked and/or detached
				if (trap === traps[i]) {
					if (!i) {
						// if this was the first trap, start all over
						for (let t of traps) removeTrap(t);
						self.t = undefined;
						self.i = -1;
						if (self.r) self.start(self.a[$_origin]!, 0);
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

	/** Add a trap to listen for change events on given object, for link `i` */
	private _trapChangeEvent(
		object: ObservableObject,
		i: number,
		clear: boolean,
	) {
		let self = this;
		let traps = this.t!;
		let trap = (traps[i] = addTrap(
			object,
			$_traps_event,
			function (t, v) {
				if ((v as ObservableEvent).data.change === t) {
					if (trap === traps[i]) {
						if (clear && canTrap(t, self.p[i]!)) {
							// property is now observable, re-trap it
							self._trapProperty(t, i);
						} else {
							// property is still not observable, get value
							self._invoke(self._get(object, i - 1), false, true);
						}
					}
				}
			},
			() => {
				if (clear && trap === traps[i]) self._invoke(undefined);
			},
		));
	}

	/** Helper to make a callback that watches link `i` along the binding path */
	private _makeChainCallback(i: number): TrapFunction<any> {
		let self = this;
		let traps = this.t!;
		let next = i + 1;
		let nextProp = this.p[next]!;
		let last = next >= this.p.length;
		return function (_, value: any) {
			// remove traps beyond this point
			for (let j = traps.length - 1; j > i; j--) {
				removeTrap(traps[j]);
			}
			traps.length = next;

			// use new value to invoke binding or keep looking
			if (last) {
				// last part of path: watch for change events and invoke
				if (typeof value === "object" && $_origin in value) {
					self._trapChangeEvent(value, next, false);
				}
				self._invoke(value);
			} else if (value == null || (value as ObservableObject)[$_unlinked]) {
				// undefined/null or unlinked object, don't look further
				self._invoke(undefined);
			} else if (typeof value === "object" && $_origin in value) {
				// found an observable object along the way
				if (canTrap(value, nextProp)) {
					// observe this property and move on if/when value set
					self._trapProperty(value, next);
				} else {
					// otherwise, at least watch for change events and unlink
					self._trapChangeEvent(value, next, true);
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
		let len = this.p.length;
		for (let j = i + 1; j < len; j++) {
			if (source == null) break;
			source = source[this.p[j]!];
		}
		return source;
	}

	/** Invoke the update function if needed */
	private _invoke(value: any, unbound?: boolean, force?: boolean) {
		if (!this.a[$_unlinked] && (force || value !== this._v)) {
			this.f.call(undefined, (this._v = value), !unbound);
		}
	}
}
