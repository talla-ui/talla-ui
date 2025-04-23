import { invalidArgErr, safeCall } from "../errors.js";
import { ObservedEvent } from "./ObservedEvent.js";
import {
	$_get,
	$_intercept,
	$_origin,
	$_root,
	$_traps_event,
	$_unlinked,
	addTrap,
	attachObject,
	invokeTrap,
	removeTrap,
	unlinkObject,
} from "./object_util.js";

/** @internal Cache Object.prototype.hasOwnProperty */
const _hOP = Object.prototype.hasOwnProperty;

/** @internal Helper function to duck type ObservedObjects (for performance) */
export function isObservedObject(object: any): object is ObservedObject {
	return !!object && _hOP.call(object, $_unlinked);
}

/** @internal Helper function to create a buffered async event iterator function */
function makeAsyncIterator(
	object: ObservedObject,
): () => AsyncIterator<ObservedEvent> {
	return function () {
		let buf: ObservedEvent[] | undefined = [];
		let waiter: undefined | ((event?: ObservedEvent) => void);
		addTrap(
			object,
			$_traps_event,
			(target, p, event) => {
				// handle an event: add to buffer, or resolve a waiter
				if (waiter) waiter(event as ObservedEvent);
				else if (buf) buf.push(event as ObservedEvent);
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
		let iterator: AsyncIterator<ObservedEvent> = {
			async next() {
				if (!buf) return { done: true } as any;
				if (buf.length) return { value: buf.shift()! };
				return new Promise<IteratorResult<ObservedEvent>>((resolve) => {
					if (object[$_unlinked]) return resolve(stop());
					waiter = (event) => {
						waiter = undefined;
						if (object[$_unlinked]) resolve({ done: true } as any);
						else resolve({ value: event! });
					};
				});
			},
			return: stop,
			throw: stop,
		};
		return iterator;
	};
}

/** @internal Helper function to make an event handler function for attached objects */
function makeAttachHandler(
	source: ObservedObject,
	arg: {
		handler?(object: any, event: ObservedEvent): unknown;
		delegate?: ObservedObject.EventDelegate;
	},
): ((object: any, event: ObservedEvent) => void) | undefined {
	let { handler, delegate } = arg;
	if (handler) {
		return (object, event) => safeCall(handler, arg, object, event);
	}
	if (delegate) {
		return function (_object, event) {
			if (source[$_unlinked] || event.noPropagation) return;
			if (!safeCall(delegate.delegate, delegate, event)) {
				source.emit(
					new ObservedEvent(
						event.name,
						event.source,
						event.data,
						source,
						event,
					),
				);
			}
		};
	}
}

/**
 * The base class of all observed objects, which can be placed into a tree structure to enable event handling and data binding
 *
 * @description
 * The ObservedObject class is the core construct that powers framework concepts such as event handling and property binding. Many of the other classes are derived from ObservedObject, including {@link ObservedList}. This class provides the following features:
 *
 * **Object lifecycle** — The {@link ObservedObject.unlink unlink()} method marks an object as stale, and disables the other features below. Objects can add additional lifecycle behavior by overriding the {@link ObservedObject.beforeUnlink beforeUnlink()} method.
 *
 * **Attaching objects** — Observed objects are meant to be linked together to form a _directed graph_, i.e. a tree structure where one object can be 'attached' to only one other observed object: its parent, origin, or containing object. In turn, several objects can be attached to every object, which makes up a hierarchical structure.
 *
 * - Objects can be attached using the {@link ObservedObject.attach attach()} method. A callback function can be used to listen for events and unlinking.
 * - When the origin object is unlinked, its attached objects are unlinked as well.
 *
 * **Events** — The {@link ObservedObject.emit emit()} method 'emits' an event from an observed object. Events are instances of {@link ObservedEvent}, which can be handled using a callback provided to the {@link ObservedObject.listen listen()} or {@link ObservedObject.attach()} methods. Typically, events are handled by their parent object (the object they're attached to). This enables event _propagation_, where events emitted by an object such as a {@link UIButton} are handled by an observed object further up the tree — such as an {@link Activity}.
 *
 * **Property bindings** — Whereas events typically flow 'up' a tree towards containing objects, data from these objects can be _bound_ so that it makes its way 'down'. In practice, this can be used to update properties automatically, such as the text of a {@link UILabel} object when a corresponding property is set on an {@link Activity}. Refer to {@link Binding} for details.
 */
export class ObservedObject {
	/**
	 * Returns the containing (attached) observed object of this type, for the provided object
	 * @param object The object for which to find the containing object
	 * @returns The closest containing (attached) object, which is an instance of the class on which this method is called.
	 * @summary This method finds and returns the closest containing object, i.e. parent, or parent's parent, etc., which is an instance of the specific class on which this method is called. For example, calling `ObservedObject.whence(obj)` results in the first parent object, if any; however calling `SomeClass.whence(obj)` results in the one of the parents (if any) that's actually an instance of `SomeClass`.
	 */
	static whence<T extends ObservedObject>(
		this: ObservedObject.Constructor<T>,
		object?: ObservedObject,
	): T | undefined {
		let parent = object ? object[$_origin] : undefined;
		while (parent && !(parent instanceof this)) {
			parent = parent[$_origin];
		}
		return parent;
	}

	/**
	 * Observes a set of properties on an observed object
	 * @param object The object with properties to observe
	 * @param properties An array of property names to observe
	 * @param f A function that will be called when any of the properties are set
	 * @returns The observed object
	 * @error This method throws an error if the provided object is unlinked, or if the properties don't exist or cannot be observed.
	 * @summary This method observes a set of properties on an observed object, calling a function whenever any of the properties are set. The observed properties are redefined with a getter and setter, either shadowing the original property or original setter and getter, if any. These properties must already exist, and their names cannot start with an underscore.
	 */
	static observe<T extends ObservedObject, K extends keyof T>(
		object: T,
		properties: Array<K>,
		f: (object: T, property: K, value: unknown) => void,
	): T {
		if (!(object instanceof ObservedObject) || object[$_unlinked]) {
			throw invalidArgErr("object");
		}
		for (let p of properties) {
			addTrap(object, p, f as any);
		}
		return object;
	}

	/**
	 * Intercepts events on an observed object
	 * @summary This method intercepts events on an observed object, calling a function when the specified event would be emitted. The function is called with the event, and a callback argument that can be used to emit an event without further interception (e.g. to emit the original event; otherwise the event is not emitted).
	 * @note If the event is already intercepted, the new handler will be unused (i.e. only one handler is allowed for each event name).
	 * @param object The object to intercept events on
	 * @param eventName The name of the event to intercept
	 * @param f A function that will be called when the event would be emitted
	 */
	static intercept<T extends ObservedObject>(
		object: T,
		eventName: string,
		f: (event: ObservedEvent, emit: (event: ObservedEvent) => void) => void,
	) {
		let intercept = (object[$_intercept] ||= Object.create(null));
		intercept[eventName] ||= f;
	}

	/**
	 * Turns this object into a root object that cannot be attached
	 * - This method is used to mark an object as a 'root' object, which cannot be attached to another object. This also implies that any bindings cannot go beyond this object in the tree structure, and any bindings that are still unbound after an object is attached to the root object will result in an error.
	 * - This method is called automatically on the {@link app} object.
	 * @error This method throws an error if the object is _already_ attached to another object.
	 */
	static makeRoot(object: ObservedObject) {
		if (object[$_origin]) {
			// cannot make an attached object a root object
			throw invalidArgErr("object");
		}
		object[$_root] = true;
	}

	/** Creates a new observed object */
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

	/** @internal Reference to origin (parent) observed object, if any */
	declare [$_origin]?: ObservedObject;

	/** @internal Property that is set only on root objects (cannot be attached) */
	declare [$_root]?: boolean;

	/** @internal Intercepted events, with event names as keys and handler functions as values */
	declare [$_intercept]?: Record<
		string,
		(event: ObservedEvent, emit: (event: ObservedEvent) => void) => void
	>;

	/** @internal Property getter for non-observable property bindings, overridden on observed lists */
	[$_get](propertyName: string) {
		if (propertyName === "*") return this;
		return (this as any)[propertyName];
	}

	/**
	 * Emits an event, immediately calling all event handlers
	 * - Events can be handled using {@link ObservedObject.listen()} or {@link ObservedObject.attach()}.
	 * - If the first argument is undefined, no event is emitted at all and this method returns quietly.
	 * @param event An instance of ObservedEvent, or an event name; if a name is provided, an instance of ObservedEvent will be created by this method
	 * @param data Additional data to be set on {@link ObservedEvent.data}, if `event` is a string
	 */
	emit(event?: ObservedEvent): this;
	emit(event: string, data?: Record<string, any>): this;
	emit(event?: string | ObservedEvent, data?: any) {
		if (event === undefined) return this;
		if (typeof event === "string") event = new ObservedEvent(event, this, data);

		// check for intercepted events
		let handler = this[$_intercept]?.[event.name];
		if (handler) {
			handler(event, (e) => invokeTrap(this, $_traps_event, e));
			return this;
		}

		// trigger traps as if event is written to a property
		invokeTrap(this, $_traps_event, event);
		return this;
	}

	/**
	 * Emits a change event
	 * - A change event can be used to indicate that the state of this object has changed in some way. The event emitted is a regular instance of {@link ObservedEvent}, but includes a data object with a `change` property that references the object itself.
	 * - Change events force an update on bindings for properties of the changed object.
	 * @param name The name of the event; defaults to "Change"
	 * @param data Additional data to be set on {@link ObservedEvent.data}; will be combined with the `change` property
	 */
	emitChange(name = "Change", data?: Record<string, any>) {
		return this.emit(name, { change: this, ...data });
	}

	/**
	 * Adds a handler for all events emitted by this object
	 *
	 * @param listener A function (void return type, or asynchronous) that will be called for all events emitted by this object; or an object of type {@link ObservedObject.Listener}; or `true` to return an async iterator
	 * @returns The object itself, or an async iterable
	 *
	 * @description
	 * This method adds a listener for all events emitted by this object. Either a callback function or an object with callback functions can be provided, or this method returns an async iterable that can be used to iterate over all events.
	 *
	 * **Callback function** — If a callback function is provided, it will be called for every event that's emitted by this object. The function is called with the `this` value set to the observed object, and a single event argument. The callback function can be asynchronous, in which case the result is awaited to catch any errors.
	 *
	 * **Callbacks object** — If an object is provided, its functions (or methods) will be used to handle events. The `handler` function is called for all events, and the `unlinked` function is called when the object is unlinked. The `init` function is called immediately, with the object and a callback to remove the listener.
	 *
	 * **Async iterable** — If the first argument is `true` rather than a callback function or object, this method returns an async iterable that can be used to iterate over all events using a `for await...of` loop. The loop body is run for each event, in the order they're emitted, either awaiting new events or continuing execution immediately. The loop stops when the object is unlinked.
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
	 * for await (let event of someObject.listen(true)) {
	 *   if (event.name === "Foo") {
	 *     // ...handle Foo event
	 *   }
	 * }
	 * // ... (code here runs after object is unlinked, or `break`)
	 */
	listen(listener: ObservedObject.Listener<this>): this;
	listen(isAsync: true): AsyncIterable<ObservedEvent>;
	listen(listener: ObservedObject.Listener<this> | true) {
		if (!listener) throw invalidArgErr("listener");

		// add a single handler if provided
		if (typeof listener === "function") {
			addTrap(this, $_traps_event, function listen(target, p, event) {
				safeCall(listener, target as any, event as ObservedEvent);
			});
			return this;
		}

		// add multiple handlers if an object is provided
		if (typeof listener === "object") {
			const { handler, unlinked, init } = listener;
			let trap = addTrap(
				this,
				$_traps_event,
				function trap(target, p, event) {
					handler &&
						safeCall(handler, listener, target as any, event as ObservedEvent);
				},
				unlinked?.bind(listener, this),
			);
			init?.call(listener, this, () => {
				if (!this[$_unlinked]) removeTrap(trap);
			});
			return this;
		}

		// return an async iterable for events
		return { [Symbol.asyncIterator]: makeAsyncIterator(this) };
	}

	/**
	 * Attaches the specified observed object to this object
	 * - This method makes the _current_ object the 'parent', or containing object for the target object. If the target object is already attached to another object, it's detached from that object first.
	 *
	 * @param target The object to attach
	 * @param listener A function that will be called when the target object emits an event; or an object of type {@link ObservedObject.AttachListener} (which includes an option to delegate events)
	 * @returns The newly attached object
	 * @error This method throws an error if the provided object was unlinked, or already attached to this object, either directly or using a circular reference.
	 *
	 * @example
	 * // Attach an object once, in the constructor
	 * class MyObject extends ObservedObject {
	 *   foo = "bar";
	 * }
	 * class ParentObject extends ObservedObject {
	 *   readonly target = this.attach(
	 *     new MyObject(),
	 *     (event) => {
	 *       // ... handle event
	 *     }
	 *   )
	 * }
	 */
	protected attach<T extends ObservedObject>(
		target: T,
		listener?: ObservedObject.AttachListener<T>,
	): T {
		if (!listener) {
			// simple case: just attach
			attachObject(this, target);
		} else {
			// use handler function(s)
			attachObject(
				this,
				target,
				typeof listener === "function"
					? (_, event) => listener(event)
					: makeAttachHandler(this, listener),
				(listener as any).detached,
			);
		}
		return target;
	}

	/** Returns true if the object has been unlinked */
	isUnlinked() {
		return this[$_unlinked];
	}

	/**
	 * Unlinks this observed object
	 * @summary This method marks the object as 'stale' or 'deleted', which means that the object should no longer be used by the application — even though the object's properties can still be accessed.
	 *
	 * - Any objects that have been attached to the unlinked object (using {@link ObservedObject.attach attach()}) will also be unlinked.
	 * - If this object was attached to a containing {@link ObservedList}, the item will be removed.
	 */
	unlink() {
		unlinkObject(this);
		return this;
	}

	/** A method that's called immediately before unlinking an object, can be overridden */
	protected beforeUnlink() {}
}

export namespace ObservedObject {
	/** Type definition for a subclass (constructor) of the {@link ObservedObject} class */
	export type Constructor<T extends ObservedObject = ObservedObject> = {
		new (...args: any[]): T;
	};

	/** Generic type definition that evaluates to the (non-method) properties of `T` */
	export type PropertiesOf<T> = {
		[K in string & keyof T]: T[K] extends Function ? never : K;
	}[string & keyof T];

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ObservedObject.listen} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object is provided, the `handler` function will be called for all events, and the `unlinked` function will be called when the object is unlinked.
	 * - The `init` function is called immediately, with the object and a callback to remove the listener.
	 */
	export type Listener<T extends ObservedObject> =
		| ((this: T, event: ObservedEvent) => Promise<void> | void)
		| {
				/** A function that will be called for all events emitted by the object */
				handler?: (object: T, event: ObservedEvent) => Promise<void> | void;
				/** A function that will be called when the object is unlinked */
				unlinked?: (object: T) => void;
				/** A function that is called immediately, with both the object and a callback to remove the listener */
				init?: (object: T, stop: () => void) => void;
		  };

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ObservedObject.attach} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object with `handler` property is provided, that function will be called for all events, and the `detached` function will be called when the object is detached **or** unlinked.
	 * - If the object includes a `delegate` property instead of `handler`, the specified object (usually the attached parent itself) must contain a `delegate(event) { ... }` method, which will be called for all events that do **not** have their {@link ObservedEvent.noPropagation} property set. If the `delegate` method does not return `true` (or a promise that resolves to `true`) then the event will be emitted on the attached parent object, with the {@link ObservedEvent.delegate} property set to the attached parent — effectively 'bubbling up' or _propagating_ the event from an object (e.g. a view) to its parent(s).
	 */
	export type AttachListener<T extends ObservedObject> =
		| ((event: ObservedEvent) => Promise<void> | void)
		| {
				handler?: (object: T, event: ObservedEvent) => Promise<void> | void;
				detached?: (object: T) => void;
		  }
		| {
				delegate?: ObservedObject.EventDelegate;
				detached?: (object: T) => void;
		  };

	/**
	 * A type of object that can be used to handle events from other (attached) objects
	 * - This interface must be matched by the `delegate` object that's passed to {@link ObservedObject.attach()}, as part of the {@link ObservedObject.AttachListener} object argument.
	 * - In practice, the required `delegate` method is often defined on the attached parent itself, to handle events from attached objects such as (nested) views. In that case, the parent object itself can be passed to {@link ObservedObject.attach()} as `{ delegate: this }`.
	 * - The `delegate` method is expected to return undefined or false if the event should be propagated on the parent object, i.e. re-emitted with the {@link ObservedEvent.delegate} property set to the attached parent object. Otherwise, the method should return true, or a promise for asynchronous error handling.
	 * @see {@link ObservedObject.attach}
	 */
	export interface EventDelegate {
		/**
		 * A required method that handles the provided event
		 * @see {@link ObservedObject.attach}
		 */
		delegate(event: ObservedEvent): Promise<unknown> | boolean | void;
	}
}
