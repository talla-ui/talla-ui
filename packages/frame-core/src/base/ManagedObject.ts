import {
	$_origin,
	$_unlinked,
	$_get,
	$_traps_event,
	unlinkObject,
	invokeTrap,
	attachObject,
	addTrap,
	$_bindFilter,
	removeTrap,
} from "./object_util.js";
import { ManagedEvent } from "./ManagedEvent.js";
import { invalidArgErr, safeCall } from "../errors.js";

/** Cache Object.prototype.hasOwnProperty */
const _hOP = Object.prototype.hasOwnProperty;

/** @internal Helper function to duck type ManagedObjects (for performance) */
export function isManagedObject(object: any): object is ManagedObject {
	return !!object && _hOP.call(object, $_unlinked);
}

/**
 * The base class of all managed objects, which can be placed into a tree structure to enable event handling and data binding
 *
 * @description
 * The ManagedObject class is the core construct that powers framework concepts such as event handling and property binding. Many of the other classes are derived from ManagedObject, including {@link ManagedList} and {@link ManagedRecord}. This class provides the following features:
 *
 * **Object lifecycle** — The {@link ManagedObject.unlink unlink()} method marks an object as stale, and disables the other features below. Objects can add additional lifecycle behavior by overriding the {@link ManagedObject.beforeUnlink beforeUnlink()} method.
 *
 * **Attaching objects** — Managed objects are meant to be linked together to form a _directed graph_, i.e. a tree structure where one object can be 'attached' to only one other managed object: its parent, origin, or containing object. In turn, several objects can be attached to every object, which makes up a hierarchical structure.
 *
 * - Objects can be attached using the {@link ManagedObject.attach attach()} method. A callback function can be used to listen for events and unlinking.
 * - When the origin object is unlinked, its attached objects are unlinked as well.
 *
 * **Events** — The {@link ManagedObject.emit emit()} method 'emits' an event from a managed object. Events are instances of {@link ManagedEvent}, which can be handled using a callback provided to the {@link ManagedObject.listen listen()} or {@link ManagedObject.attach()} methods. Typically, events are handled by their parent object (the object they're attached to). This enables event _propagation_, where events emitted by an object such as a {@link UIButton} are handled by a managed object further up the tree — such as an {@link Activity}.
 *
 * **Property bindings** — Whereas events typically flow 'up' a tree towards containing objects, data from these objects can be _bound_ so that it makes its way 'down'. In practice, this can be used to update properties automatically, such as the text of a {@link UILabel} object when a corresponding property is set on an {@link Activity}. Refer to {@link Binding} for details.
 */
export class ManagedObject {
	/**
	 * Returns the containing (attached) managed object of this type, for the provided object
	 * @param object The object for which to find the containing object
	 * @returns The closest containing (attached) object, which is an instance of the class on which this method is called.
	 * @summary This method finds and returns the closest containing object, i.e. parent, or parent's parent, etc., which is an instance of the specific class on which this method is called. For example, calling `ManagedObject.whence(obj)` results in the first parent object, if any; however calling `SomeClass.whence(obj)` results in the one of the parents (if any) that's actually an instance of `SomeClass`.
	 */
	static whence<T extends ManagedObject>(
		this: ManagedObject.Constructor<T>,
		object?: ManagedObject,
	): T | undefined {
		let parent = object ? object[$_origin] : undefined;
		while (parent && !(parent instanceof this)) {
			parent = parent[$_origin];
		}
		return parent;
	}

	/**
	 * Observes a set of properties on a managed object
	 * @param object The object with properties to observe
	 * @param properties An array of property names to observe
	 * @param f A function that will be called when any of the properties are set
	 * @returns The observed object
	 * @error This method throws an error if the provided object is unlinked, or if the properties don't exist or cannot be observed.
	 * @summary This method observes a set of properties on a managed object, calling a function whenever any of the properties are set. The observed properties are redefined with a getter and setter, either shadowing the original property or original setter and getter, if any. These properties must already exist, and their names cannot start with an underscore.
	 */
	static observe<T extends ManagedObject, K extends keyof T>(
		object: T,
		properties: Array<K>,
		f: (object: T, property: K, value: unknown) => void,
	): T {
		if (!(object instanceof ManagedObject) || object[$_unlinked]) {
			throw invalidArgErr("object");
		}
		for (let p of properties) {
			addTrap(object, p, f as any);
		}
		return object;
	}

	/** Creates a new managed object */
	constructor() {
		Object.defineProperty(this, $_unlinked, {
			writable: true,
			value: false,
		});
		Object.defineProperty(this, $_origin, {
			configurable: true,
			writable: true,
			value: undefined,
		});
	}

	/** @internal True if this object has been unlinked */
	declare [$_unlinked]: boolean;

	/** @internal Reference to origin (parent) managed object, if any */
	declare [$_origin]?: ManagedObject;

	/** @internal A function that's used to filter applicable bindings on this object */
	declare [$_bindFilter]?: (property: string | symbol) => boolean;

	/** @internal Property getter for non-observable property bindings, overridden on managed lists */
	[$_get](propertyName: string) {
		if (propertyName === "*") return this;
		return (this as any)[propertyName];
	}

	/**
	 * Emits an event, immediately calling all event handlers
	 * - Events can be handled using {@link ManagedObject.listen()} or {@link ManagedObject.attach()}.
	 * - If the first argument is undefined, no event is emitted at all and this method returns quietly.
	 * @param event An instance of ManagedEvent, or an event name; if a name is provided, an instance of ManagedEvent will be created by this method
	 * @param data Additional data to be set on {@link ManagedEvent.data}, if `event` is a string
	 */
	emit(event?: ManagedEvent): this;
	emit(event: string, data?: Record<string, any>): this;
	emit(event?: string | ManagedEvent, data?: any) {
		if (event === undefined) return this;
		if (typeof event === "string") event = new ManagedEvent(event, this, data);

		// trigger traps as if event is written to a property
		invokeTrap(this, $_traps_event, event);
		return this;
	}

	/**
	 * Emits a change event
	 * - A change event can be used to indicate that the state of this object has changed in some way. The event emitted is a regular instance of {@link ManagedEvent}, but includes a data object with a `change` property that references the object itself.
	 * - Change events force an update on bindings for properties of the changed object.
	 * @param name The name of the event; defaults to "Change"
	 * @param data Additional data to be set on {@link ManagedEvent.data}; will be combined with the `change` property
	 */
	emitChange(name = "Change", data?: Record<string, any>) {
		let event = new ManagedEvent(name, this, { change: this, ...data });
		invokeTrap(this, $_traps_event, event);
		return this;
	}

	/**
	 * Adds a handler for all events emitted by this object
	 *
	 * @param listener A function (void return type, or asynchronous) that will be called for all events emitted by this object; or an object of type {@link ManagedObject.Listener}
	 * @returns The object itself, or an async iterable if no parameter was provided
	 *
	 * @description
	 * This method adds a listener for all events emitted by this object. Either a callback function or an object with callback functions can be provided, or this method returns an async iterable that can be used to iterate over all events.
	 *
	 * **Callback function** — If a callback function is provided, it will be called for every event that's emitted by this object. The function is called with the `this` value set to the managed object, and a single event argument. The callback function can be asynchronous, in which case the result is awaited to catch any errors.
	 *
	 * **Callbacks object** — If an object is provided, its functions (or methods) will be used to handle events. The `handler` function is called for all events, and the `unlinked` function is called when the object is unlinked. The `init` function is called immediately, with the object and a callback to remove the listener.
	 *
	 * **Async iterable** — If no callback function is provided, this method returns an async iterable that can be used to iterate over all events using a `for await...of` loop. The loop body is run for each event, in the order they're emitted, either awaiting new events or continuing execution immediately. The loop stops when the object is unlinked.
	 *
	 * @example
	 * // Handle all events using a callback function
	 * someObject.listen((event) => {
	 *   if (event.name === "Foo") {
	 *     // ...handle Foo event
	 *   }
	 * });
	 * // ... (code continues to run)
	 *
	 * @example
	 * // Handle all events using an async iterable
	 * for await (let event of someObject.listen()) {
	 *   if (event.name === "Foo") {
	 *     // ...handle Foo event
	 *   }
	 * }
	 * // ... (code here runs after object is unlinked, or `break`)
	 */
	listen(listener: ManagedObject.Listener<this>): this;
	listen(): AsyncIterable<ManagedEvent>;
	listen(listener?: ManagedObject.Listener<this>) {
		// add a single handler if provided
		if (typeof listener === "function") {
			addTrap(this, $_traps_event, function (target, p, event) {
				safeCall(function () {
					listener.call(target as any, event as ManagedEvent);
				});
			});
			return this;
		} else if (listener) {
			const { handler, unlinked, init } = listener;
			let trap = addTrap(
				this,
				$_traps_event,
				function (target, p, event) {
					handler &&
						safeCall(function () {
							handler.call(listener, target as any, event as ManagedEvent);
						});
				},
				unlinked?.bind(listener, this),
			);
			init?.call(listener, this, () => {
				if (!this[$_unlinked]) removeTrap(trap);
			});
			return this;
		}

		// return an async iterable for events
		let self = this;
		let iterable: AsyncIterable<ManagedEvent> = {
			[Symbol.asyncIterator]() {
				let buf: ManagedEvent[] | undefined = [];
				let waiter: undefined | ((event?: ManagedEvent) => void);
				addTrap(
					self,
					$_traps_event,
					(target, p, event) => {
						// handle an event: add to buffer, or resolve a waiter
						if (waiter) waiter(event as ManagedEvent);
						else if (buf) buf.push(event as ManagedEvent);
					},
					() => {
						// handle unlinking: resolve waiter if any
						if (waiter) waiter();
					},
				);
				const stop = (): any => {
					buf = undefined;
					return Promise.resolve({ done: true });
				};

				// return the iterator
				let iterator: AsyncIterator<ManagedEvent> = {
					async next() {
						if (!buf) return { done: true } as any;
						if (buf.length) return { value: buf.shift()! };
						return new Promise<IteratorResult<ManagedEvent>>((resolve) => {
							if (self[$_unlinked]) return resolve(stop());
							waiter = (event) => {
								waiter = undefined;
								if (self[$_unlinked]) resolve({ done: true } as any);
								else resolve({ value: event! });
							};
						});
					},
					return: stop,
					throw: stop,
				};
				return iterator;
			},
		};
		return iterable;
	}

	/**
	 * Attaches the specified managed object to this object
	 * - This method makes the _current_ object the 'parent', or containing object for the target object. If the target object is already attached to another object, it's detached from that object first.
	 *
	 * @param target The object to attach
	 * @param listener A function that will be called when the target object emits an event; or an object of type {@link ManagedObject.AttachListener}
	 * @returns The newly attached object
	 * @error This method throws an error if the provided object was unlinked, or already attached to this object, either directly or using a circular reference.
	 *
	 * @example
	 * // Attach an object once, in the constructor
	 * class MyObject extends ManagedObject {
	 *   foo = "bar";
	 * }
	 * class ParentObject extends ManagedObject {
	 *   readonly target = this.attach(
	 *     new MyObject(),
	 *     (event) => {
	 *       // ... handle event
	 *     }
	 *   )
	 * }
	 */
	protected attach<T extends ManagedObject>(
		target: T,
		listener?: ManagedObject.AttachListener<T>,
	): T {
		if (!listener) {
			// simple case: just attach
			attachObject(this, target);
		} else {
			// use handler function(s)
			let func = typeof listener === "function" && listener;
			let handler = func
				? (_: any, event: ManagedEvent) => func(event)
				: (listener as any).handler;
			attachObject(
				this,
				target,
				handler,
				func ? undefined : (listener as any).detached,
			);
		}
		return target;
	}

	/** Returns true if the object has been unlinked */
	isUnlinked() {
		return this[$_unlinked];
	}

	/**
	 * Unlinks this managed object
	 * @summary This method marks the object as 'stale' or 'deleted', which means that the object should no longer be used by the application — even though the object's properties can still be accessed.
	 *
	 * - Any objects that have been attached to the unlinked object (using {@link ManagedObject.attach attach()}) will also be unlinked.
	 * - If this object was attached to a containing {@link ManagedList}, the item will be removed.
	 */
	unlink() {
		unlinkObject(this);
		return this;
	}

	/** A method that's called immediately before unlinking an object, can be overridden */
	protected beforeUnlink() {}
}

export namespace ManagedObject {
	/** Type definition for a subclass (constructor) of the {@link ManagedObject} class */
	export type Constructor<T extends ManagedObject = ManagedObject> = {
		new (...args: any[]): T;
	};

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ManagedObject.listen} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object is provided, the `handler` function will be called for all events, and the `unlinked` function will be called when the object is unlinked.
	 * - The `init` function is called immediately, with the object and a callback as arguments. The callback can be used to remove the listener (only if the object is not already unlinked).
	 */
	export type Listener<T extends ManagedObject> =
		| ((this: T, event: ManagedEvent) => Promise<void> | void)
		| {
				/** A function that will be called for all events emitted by the object */
				handler?: (object: T, event: ManagedEvent) => Promise<void> | void;
				/** A function that will be called when the object is unlinked */
				unlinked?: (object: T) => void;
				/** A function that is called immediately, with both the object and a callback to remove the listener */
				init?: (object: T, stop: () => void) => void;
		  };

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ManagedObject.attach} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object is provided, the `handler` function will be called for all events, and the `detached` function will be called when the object is detached **or** unlinked.
	 */
	export type AttachListener<T extends ManagedObject> =
		| ((event: ManagedEvent) => Promise<void> | void)
		| {
				/** A function that will be called for all events emitted by the object */
				handler?: (object: T, event: ManagedEvent) => Promise<void> | void;
				/** A function that will be called when the object is detached OR unlinked */
				detached?: (object: T) => void;
		  };
}
