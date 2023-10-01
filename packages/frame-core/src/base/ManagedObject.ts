import {
	$_origin,
	$_unlinked,
	$_get,
	$_traps_event,
	unlinkObject,
	invokeTrap,
	attachObject,
	watchAttachProperty,
	addTrap,
} from "./object_util.js";
import { ManagedEvent, ManagedChangeEvent } from "./ManagedEvent.js";
import { Observer } from "./Observer.js";
import { err, ERROR, errorHandler } from "../errors.js";

/** Cache Object.prototype.hasOwnProperty */
const _hOP = Object.prototype.hasOwnProperty;

/** @internal Helper function to duck type ManagedObjects (for performance) */
export function isManagedObject(object: any): object is ManagedObject {
	return object && _hOP.call(object, $_unlinked);
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
 * - Objects can be attached ad-hoc using the {@link ManagedObject.attach attach()} method. An {@link Observer} or callback function can be used to listen for events (see below) or wait for the object to be unlinked.
 * - Objects can be attached by referencing them from specific observed properties. The property needs to be watched using the {@link ManagedObject.observeAttach observeAttach()} method; afterwards, any object assigned to this property is attached automatically, and then when the referenced object is unlinked, the property is set to undefined. The {@link ManagedObject.observeAttach observeAttach()} method also accepts an observer or callback function.
 * - When an object is unlinked, its attached objects are unlinked as well.
 *
 * **Events** — The {@link ManagedObject.emit emit()} method 'emits' an event from a managed object. Events are instances of {@link ManagedEvent}, which can be handled using a callback provided to the {@link ManagedObject.listen listen()} method, or an {@link Observer} that's currently observing the object. Typically, objects are observed by their parent object (the object they're attached to). This enables event _propagation_, where events emitted by an object such as a {@link UIButton} are handled by a managed object further up the tree — such as a {@link ViewActivity}. Refer to {@link ManagedEvent} for details.
 *
 * **Property bindings** — Whereas events typically flow 'up' a tree towards containing objects, data from these objects can be _bound_ so that it makes its way 'down'. In practice, this can be used to update properties such as the text of a {@link UILabel} object automatically when a particular property value is set on a containing object such as the {@link ViewActivity}. Refer to {@link Binding} for details.
 *
 * @example
 * // Attach an object to a parent object, handle events
 * class MyObject extends ManagedObject {
 *   doSomething() { this.emit("Foo") }
 * }
 *
 * class MyParentObject extends ManagedObject {
 *   readonly object = this.attach(
 *     new MyObject(),
 *     class extends Observer<MyObject> {
 *       onFoo(e: ManagedEvent) {
 *         // ...handle Foo event from object
 *       }
 *     }
 *   );
 * }
 *
 * let parent = new MyParentObject();
 * parent.object.doSomething()
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

	/** @internal Property getter for non-observable property bindings, overridden on managed lists */
	[$_get](propertyName: string) {
		return (this as any)[propertyName];
	}

	/**
	 * Emits an event, immediately calling all event handlers
	 * - Events can be handled using {@link ManagedObject.listen()} or an {@link Observer}. Refer to {@link ManagedEvent} for details.
	 * @param event An instance of ManagedEvent, or an event name; if a name is provided, an instance of ManagedEvent will be created by this method
	 * @param data Additional data to be set on {@link ManagedEvent.data}, if `event` is a string
	 */
	emit(event: ManagedEvent): this;
	emit(event: string, data?: any): this;
	emit(event: string | ManagedEvent, data?: any) {
		if (typeof event === "string") event = new ManagedEvent(event, this, data);

		// trigger traps as if event is written to a property
		invokeTrap(this, $_traps_event, event);
		return this;
	}

	/**
	 * Emits a change event, an instance of {@link ManagedChangeEvent}
	 * - Events can be handled using {@link ManagedObject.listen()} or an {@link Observer}. Refer to {@link ManagedEvent} for details.
	 * - Change events are treated differently, e.g. change events are also handled using the callback passed to {@link ManagedObject.attach attach()} and {@link ManagedObject.observeAttach observeAttach()}, and trigger updates of bound (sub) property values.
	 * @param name An event name; an instance of ManagedChangeEvent with the provided name will be created by this method
	 * @param data Additional data to be set on {@link ManagedEvent.data}
	 */
	emitChange(name = "Change", data?: any) {
		return this.emit(new ManagedChangeEvent(name, this, data));
	}

	/**
	 * Adds a handler for all events emitted by this object
	 *
	 * @param handler A function (void return type, or asynchronous) that will be called for all events emitted by this object; the function is called with the `this` value set to the managed object, and a single event argument
	 * @returns If no callback function is provided, an async iterable that can be used instead
	 *
	 * @description
	 * This method adds a permanent listener for all events emitted by this object, in one of two ways. Either a callback function can be provided, or this method returns an async iterable that can be used to iterate over all events.
	 *
	 * **Callback function** — If a callback function is provided, it will be called for every event that's emitted by this object. The function is called with the `this` value set to the managed object, and a single event argument. The callback function can be asynchronous, in which case the result is awaited to catch any errors.
	 *
	 * **Async iterable** — If no callback function is provided, this method returns an async iterable that can be used to iterate over all events using a `for await...of` loop. The loop body is run for each event, in the order they're emitted, either awaiting new events or continuing execution immediately. The loop stops when the object is unlinked.
	 *
	 * @note This method adds a permanent listener. To prevent memory leaks, it may be better to use an {@link Observer} that can be stopped when needed, if the object is expected to outlive the listener.
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
	listen(
		handler: (this: this, event: ManagedEvent) => Promise<void> | void,
	): void;
	listen(): AsyncIterable<ManagedEvent>;
	listen(handler?: (this: this, event: ManagedEvent) => Promise<void> | void) {
		// add a single handler if provided
		if (handler) {
			addTrap(this, $_traps_event, (target, p, event) => {
				handler.call(this, event)?.catch?.(errorHandler);
			});
			return;
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
						if (waiter) waiter(event);
						else if (buf) buf.push(event);
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

	/** Returns true if the object has been unlinked */
	isUnlinked() {
		return this[$_unlinked];
	}

	/**
	 * Unlinks this managed object
	 * @summary This method marks the object as 'stale' or 'deleted', which means that the object should no longer be used by the application — even though the object's properties can still be accessed.
	 *
	 * - Any objects that have been attached to the unlinked object (using {@link ManagedObject.attach attach()} or {@link ManagedObject.observeAttach observeAttach()}) will also be unlinked.
	 * - If this object is attached using {@link ManagedObject.observeAttach observeAttach()} (to a 'parent' or containing object), the corresponding property will be set to undefined.
	 * - If this object was attached to a containing {@link ManagedList}, the item will be removed.
	 */
	unlink() {
		unlinkObject(this);
		return this;
	}

	/** A method that's called immediately before unlinking an object, can be overridden */
	protected beforeUnlink() {}

	/**
	 * Attaches the provided managed object to this object
	 * - This method makes the current object the 'parent', or containing object for the target object; not the other way around.
	 * - Refer to {@link ManagedObject} for more information on attaching objects.
	 *
	 * @param target The object to attach
	 * @param observer An {@link Observer} class or instance, or a function that's called whenever a change event is emitted by the target object (with target and event arguments, respectively), and when the object is unlinked or moved to another object by re-attaching it (without any arguments)
	 * @returns The newly attached object
	 * @error This method throws an error if the provided object was already attached to this object, or if a circular reference was found.
	 *
	 * @example
	 * // Attach an object once, in the constructor
	 * class MyObject extends ManagedObject {
	 *   foo = "bar";
	 * }
	 * class ParentObject extends ManagedObject {
	 *   readonly target = this.attach(
	 *     new MyObject(),
	 *     (target, event) => {
	 *       // ...target is either the target object, or undefined
	 *       // ...event is a change event, or undefined
	 *     }
	 *   )
	 * }
	 */
	protected attach<T extends ManagedObject>(
		target: T,
		observer?: Observer<T> | ManagedObject.AttachObserverFunction<T>,
	): T {
		if (typeof observer === "function")
			observer = Observer.fromChangeHandler(observer) as Observer<T>;
		let result = attachObject(this, target, observer) as T | undefined;
		if (!result) throw err(ERROR.Object_NoAttach);
		return result;
	}

	/**
	 * Observes a property, so that any object assigned to it is attached immediately
	 * - This method makes the current object the 'parent', or containing object of all objects assigned to the property.
	 * - Refer to {@link ManagedObject} for more information on attaching objects.
	 *
	 * @param propertyName The name of the property to watch for references to other managed objects; must be a public property
	 * @param observer An {@link Observer} class or instance, or a function that's called whenever a change event is emitted by the target object (with target and event arguments, respectively), and when the object is unlinked or moved to another object by re-attaching it (without any arguments)
	 *
	 * @example
	 * // Attach any object assigned to a property
	 * class MyObject extends ManagedObject {
	 *   foo = "bar";
	 * }
	 * class ParentObject extends ManagedObject {
	 *   constructor() {
	 *     super();
	 *     this.observeAttach(
	 *       "target",
	 *       (target, event) => {
	 *         // ...target is either the target object, or undefined
	 *         // ...event is a change event, or undefined
	 *       }
	 *     );
	 *   }
	 *   target?: MyObject;
	 * }
	 *
	 * let parent = new ParentObject();
	 * parent.target = new MyObject(); // attached right away
	 * parent.target.unlink();
	 * parent.target // => undefined
	 */
	protected observeAttach<
		K extends keyof this,
		T extends NonNullable<this[K]> & ManagedObject,
	>(
		propertyName: K,
		observer?: Observer<T> | ManagedObject.AttachObserverFunction<T>,
	) {
		if (typeof observer === "function")
			observer = Observer.fromChangeHandler(observer) as Observer<T>;
		watchAttachProperty(this, propertyName, observer);
	}
}

export namespace ManagedObject {
	/** Type definition for a subclass (constructor) of the {@link ManagedObject} class */
	export type Constructor<T extends ManagedObject = ManagedObject> = {
		new (...args: any[]): T;
	};

	/** Type definition for the callback function argument passed to {@link ManagedObject.attach()} and {@link ManagedObject.observeAttach()} */
	export type AttachObserverFunction<T extends ManagedObject> = (
		target?: T,
		event?: ManagedChangeEvent<T>,
	) => void;
}
