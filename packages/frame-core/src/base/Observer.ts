import { err, ERROR, errorHandler, invalidArgErr } from "../errors.js";
import { NullableArray, removeFromNullableArray } from "./NullableArray.js";
import { ManagedEvent } from "./ManagedEvent.js";
import { isManagedObject, ManagedObject } from "./ManagedObject.js";
import {
	addTrap,
	canTrap,
	removeTrap,
	TrapRef,
	$_traps_event,
	$_origin,
	$_unlinked,
} from "./object_util.js";

/** Type definition for the callback registered with a trap */
type TrapCallback = (p: string, value: any, event?: ManagedEvent) => void;

/** Symbol used as a property on observers */
const $_observed = Symbol("observed");

/** A resolved promise that's reused below */
const _nextTick = Promise.resolve();

/**
 * The base class for an observer that watches a particular {@link ManagedObject}
 *
 * @description
 * Observers can be used to watch particular objects (instances of {@link ManagedObject} or any subclass, including {@link ManagedList}, {@link ManagedRecord}, etc.), specifically to:
 *
 * - Listen for events (see {@link Observer.handleEvent handleEvent()}, which can be overridden or used to dispatch events to specific Observer methods).
 * - Check when the object is attached (see {@link Observer.handleAttachedChange handleAttachedChange()}, which can be overridden).
 * - Check when the object is unlinked (see {@link Observer.handleUnlink handleUnlink()}, which can be overridden).
 * - Handle property changes (see {@link Observer.observeProperty observeProperty()} and {@link Observer.observePropertyAsync observePropertyAsync()} which must be called to observe a property).
 *
 * Before any property can be observed, the `observeProperty*()` method must be called. This should be done within the {@link Observer.observe observe()} method, which must be overridden. Refer to the examples below.
 *
 * Observers can be created manually (using `new`, and the {@link Observer.observe observe()} method), but they can also be passed to {@link ManagedObject.attach()} and {@link ManagedObject.autoAttach()} to observe attached objects. Refer to the examples below.
 *
 * The observer is automatically stopped when the target is unlinked, but it can also be stopped manually (see {@link Observer.stop stop()}). This may be necessary to avoid memory leaks, since observers are linked to the observed object while they're active — keeping them (and any referenced objects) from being freed up by the JavaScript garbage collector as long as the observed object is referenced itself.
 *
 * @online_docs Refer to the Desk website for more information on using observers.
 */
export class Observer<T extends ManagedObject = ManagedObject> {
	/**
	 * Creates a new observer, without observing any object yet
	 * - Start observing an object using the {@link Observer.observe observe()} method; override this method to add property observers.
	 * - Alternatively, pass an observer class to {@link ManagedObject.attach()} or {@link ManagedObject.autoAttach()}.
	 */
	constructor() {
		Object.defineProperty(this, $_observed, {
			writable: true,
			enumerable: false,
		});
	}

	/** @internal Observed object, if any (private, exposed as `object`) */
	private declare [$_observed]?: T;

	/** The currently observed object, if any
	 * - This property is set by the base implementation of the {@link Observer.observe observe()} method.
	 * - This property is automatically cleared when an object is no longer observed (after `stop()`, and/or when unlinked, after `handleUnlink()` is called)
	 * @readonly
	 */
	get observed() {
		return this[$_observed];
	}

	/**
	 * Starts observing the specified managed object
	 * - If another object was already being observed, it will no longer be observed, as if {@link Observer.stop stop()} was called first.
	 * - This method should be overridden to start observing properties of the observed object; refer to the examples for {@link Observer}.
	 * @see {@link Observer.stop}
	 */
	observe(observed: T) {
		if (!isManagedObject(observed)) throw invalidArgErr("observed");
		if (this[$_observed] !== observed) {
			// stop observing last object, if any
			if (this[$_observed]) this._removeTraps();

			// add a trap for events, and one for origin changes
			this._traps = [
				addTrap(
					observed,
					$_traps_event,
					(t, p, v: any) => {
						this.handleEvent(v);
					},
					() => {
						this._removeTraps();
						this.handleUnlink();
					},
				),
				addTrap(observed, $_origin, (t, p, v: ManagedObject) => {
					if (v) this.handleAttachedChange(v);
				}),
			];

			this[$_observed] = observed;
		}
		return this;
	}

	/** Stops observing events and properties
	 * - After calling this method, handler methods will no longer be called, until another object is observed
	 * - This method may be overridden, as long as the base implementation is still invoked; however, note that the observed object may already be unlinked
	 */
	stop() {
		this[$_observed] = undefined;
		this._removeTraps();
	}

	/**
	 * Starts observing one or more properties
	 * - Property changes are triggered when the property is assigned a different value, or when a referenced managed object emits a change event
	 * - Changes are handled by {@link Observer.handlePropertyChange()} first, which may be overridden. The base implementation of that method looks for a method called `on...Change` (e.g. `onFooChange` for the `foo` property) and calls it with the property value and possibly a change event as arguments.
	 * @see {@link Observer.observePropertyAsync}
	 * @see {@link Observer.handlePropertyChange}
	 */
	protected observeProperty(...properties: Array<keyof T>) {
		for (let p of properties) {
			this._observeProperty(p as string, this.handlePropertyChange.bind(this));
		}
		return this;
	}

	/**
	 * Starts observing one or more properties, asynchronously
	 * - Property changes are triggered when the property is assigned a different value, or when a referenced managed object emits a change event
	 * - Changes are handled by {@link Observer.handlePropertyChange()} asynchronously, which may be overridden. The base implementation of that method looks for a method called `on...Change` (e.g. `onFooChange` for the `foo` property) and calls it with the the _latest_ property value and possibly a change event as arguments. Returned promises are awaited to handle errors, if needed.
	 * @see {@link Observer.observeProperty}
	 * @see {@link Observer.handlePropertyChange}
	 */
	protected observePropertyAsync(...properties: Array<keyof T>) {
		let object = this[$_observed];
		for (let p of properties) {
			let lastValue: any;
			let lastEvent: any;
			let promise: Promise<void> | undefined;
			this._observeProperty(p as string, (p, value, event) => {
				lastValue = value;
				lastEvent = event;
				if (!promise) {
					promise = _nextTick
						.then(() => {
							promise = undefined;
							if (this[$_observed] === object) {
								return this.handlePropertyChange(p, lastValue, lastEvent);
							}
						})
						.catch(errorHandler);
				}
			});
		}
		return this;
	}

	/**
	 * A method that's called when an event is emitted on the observed object, may be overridden
	 * - Override this method to add a non-specific event handler. This method will be called for _all_ events.
	 * - The base implementation calls both synchronous and asynchronous named event handlers.
	 * - Synchronous event handlers such as `onFoo()` or `onSomeEvent()` are called immediately; the event is supplied as the only argument.
	 * - Asynchronous event handlers such as `onFooAsync()` or `onSomeEventAsync()` are called asynchronously (after `Promise.resolve()`), with a single argument which is the _latest_ event that occurred before the function was called. If multiple events with the same name have been emitted, the `on...Async` method is called _only once_.
	 * @see {@link Observer.handleUnlink}
	 * @see {@link Observer.handleAttachedChange}
	 */
	protected handleEvent(event: ManagedEvent) {
		let methodName = "on" + event.name;

		// check if async event handler exists first
		let fa = (this as any)[methodName + "Async"] as any;
		if (fa) {
			if (!this._asyncEvents[methodName]) {
				// schedule on...Async method now
				let object = this[$_observed];
				_nextTick
					.then(() => {
						// call actual handler method
						let event = this._asyncEvents[methodName];
						if (event && this[$_observed] === object) {
							this._asyncEvents[methodName] = undefined;
							return fa.call(this, event);
						}
					})
					.catch(errorHandler);
			}
			this._asyncEvents[methodName] = event;
		}

		// check if event handler by name exists
		let f = (this as any)[methodName] as any;
		if (f) f.call(this, event);
	}

	/**
	 * A method that's called when an observed property has been changed on the observed object, may be overridden
	 * - Each property to be observed must be added using {@link Observer.observeProperty()} or {@link Observer.observePropertyAsync()}.
	 * - The base implementation calls a handler method based on the property name, e.g. `onFooChange()`; refer to {@link Observer.observeProperty()}.
	 * @see {@link Observer.observeProperty}
	 * @see {@link Observer.observePropertyAsync}
	 */
	protected handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedEvent,
	): Promise<void> | void {
		if (!property) return;
		let methodName =
			"on" + property[0]!.toUpperCase() + property.slice(1) + "Change";
		let f = (this as any)[methodName] as Function | undefined;
		if (f) return f.call(this, value, event);
	}

	/**
	 * A method that's called when the observed object has been attached to another object, may be overridden
	 * - Override this method to perform any actions after the observed object is attached; the base implementation does nothing.
	 * @param origin The new object that the observed object is attached to
	 * @see {@link Observer.handleUnlink}
	 * @see {@link Observer.handleEvent}
	 */
	protected handleAttachedChange(origin: ManagedObject) {
		// to be overridden, nothing here
	}

	/**
	 * A method that's called when the observed object is unlinked, may be overridden
	 * - Override this method to perform any actions after the observed object is unlinked.
	 * - The base implementation simply calls {@link Observer.stop()} immediately.
	 * @see {@link Observer.handleAttachedChange}
	 * @see {@link Observer.handleEvent}
	 */
	protected handleUnlink() {
		this.stop();
	}

	/** Private implementation of `stop` method, also used by `observe` to stop observing implicitly */
	private _removeTraps() {
		for (let t of this._traps) if (t) removeTrap(t);
		this._traps.length = 0;
		this._trapped = Object.create(null);
		this._callbacks = Object.create(null);
		this._asyncEvents = Object.create(null);
	}

	/** Helper method to observe a single property */
	private _observeProperty(p: string, callback: TrapCallback) {
		this._callbacks[p] = callback;

		// if property was already trapped, we're done here
		if (p in this._trapped) return;

		// otherwise, check if can observe and add trap if possible
		let object = this[$_observed];
		if (!object) return;
		if (!canTrap(object, p)) {
			if (p in object) throw err(ERROR.Object_NoObserve, p);
			return;
		}
		this._trapped[p] = true;

		// keep track of change events for managed objects
		let eventTrap: TrapRef | undefined;

		// helper function to add trap for (change) events
		const setEventTrap = (target: ManagedObject) => {
			eventTrap = addTrap(
				target,
				$_traps_event,
				(_t, _p, event) => {
					// event emitted, handle only if change event
					if (this[$_observed] === object && ManagedEvent.isChange(event)) {
						this._callbacks[p]!(p, target, event);
					}
				},
				removeEventTrap,
			);
			this._traps.push(eventTrap);
		};

		// helper function to remove trap for events
		const removeEventTrap = () => {
			if (eventTrap) {
				removeTrap(eventTrap);
				removeFromNullableArray(this._traps, eventTrap);
				eventTrap = undefined;
			}
		};

		// add a trap for this property, watch for objects
		this._traps.push(
			addTrap(
				object,
				p,
				(_t, _p, v) => {
					if (this[$_observed] === object) {
						// maintain traps for change events
						removeEventTrap();
						if (isManagedObject(v) && !v[$_unlinked]) {
							setEventTrap(v);
						}

						// call handler method with new value
						this._callbacks[p]!(p, v);
					}
				},
				removeEventTrap,
			),
		);

		// check if property already contains an object
		let initValue = (object as any)[p];
		if (isManagedObject(initValue)) {
			setEventTrap(initValue);
		}
	}

	private _traps: NullableArray<TrapRef> = [];
	private _trapped: { [p: string]: true | undefined } = Object.create(null);
	private _callbacks: { [p: string]: TrapCallback } = Object.create(null);
	private _asyncEvents: { [name: string]: ManagedEvent | undefined } =
		Object.create(null);
}

export namespace Observer {
	/** @internal Create an observer that calls a single function on change/unlink */
	export function fromChangeHandler<
		TObserver extends Observer<T>,
		T extends ManagedObject,
	>(
		f: (target?: T, event?: any) => void,
		Base?: new () => TObserver,
	): TObserver {
		let _last: T | undefined;
		function withInvoke(orig: Function) {
			return function (this: Observer<T>) {
				let r = orig.apply(this, arguments);
				if (this.observed !== _last) {
					f((_last = this.observed));
				}
				return r;
			};
		}
		let result = new (Base || Observer)() as any;
		result.observe = withInvoke(result.observe);
		result.stop = withInvoke(result.stop);
		result.handleUnlink = withInvoke(result.handleUnlink);
		result.handleEvent = function (this: Observer<T>, event: ManagedEvent) {
			if (ManagedEvent.isChange(event)) {
				f(this.observed, event);
			}
		};
		return result;
	}
}
