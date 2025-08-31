import { err, ERROR, invalidArgErr, safeCall } from "../errors.js";
import { Binding } from "./Binding.js";
import { ObservableEvent } from "./ObservableEvent.js";
import {
	$_bind,
	$_bind_apply,
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

/** @internal Helper function to duck type ObservableObjects (for performance) */
export function isObservableObject(object: any): object is ObservableObject {
	return !!object && _hOP.call(object, $_unlinked);
}

/** @internal Helper function to create a buffered async event iterator function */
function makeAsyncIterator(
	object: ObservableObject,
): () => AsyncIterator<ObservableEvent> {
	return function () {
		let buf: ObservableEvent[] | undefined = [];
		let waiter: undefined | ((event?: ObservableEvent) => void);
		addTrap(
			object,
			$_traps_event,
			function (_, event) {
				// handle an event: add to buffer, or resolve a waiter
				if (waiter) waiter(event as ObservableEvent);
				else if (buf) buf.push(event as ObservableEvent);
			},
			function () {
				// handle unlinking: resolve waiter if any
				if (waiter) waiter();
			},
		);
		const stop = (): any => {
			buf = undefined;
			return Promise.resolve({ done: true });
		};

		// return the iterator
		let iterator: AsyncIterator<ObservableEvent> = {
			async next() {
				if (!buf) return { done: true } as any;
				if (buf.length) return { value: buf.shift()! };
				return new Promise<IteratorResult<ObservableEvent>>((resolve) => {
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
	source: ObservableObject,
	arg: {
		handler?(object: any, event: ObservableEvent): unknown;
		delegate?: ObservableObject.EventDelegate;
	},
): ((object: any, event: ObservableEvent) => void) | undefined {
	let { handler, delegate } = arg;
	if (handler) {
		return (object, event) => safeCall(handler, arg, object, event);
	}
	if (delegate) {
		return function (_object, event) {
			if (source[$_unlinked] || event.noPropagation) return;
			if (!safeCall(delegate.delegate, delegate, event)) {
				source.emit(
					new ObservableEvent(
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
 * The base class of all observable objects, which can be placed into a tree structure to enable event handling and data binding
 *
 * @description
 * The ObservableObject class is the core construct that powers framework concepts such as event handling and property binding. Many of the other classes are derived from ObservableObject, including {@link ObservableList}. This class provides the following features:
 *
 * **Object lifecycle** — The {@link ObservableObject.unlink unlink()} method marks an object as stale, and disables the other features below. Objects can add additional lifecycle behavior by overriding the {@link ObservableObject.beforeUnlink beforeUnlink()} method.
 *
 * **Attaching objects** — Observable objects are meant to be linked together to form a _directed graph_, i.e. a tree structure where one object can be 'attached' to only one other observable object: its parent, origin, or containing object. In turn, several objects can be attached to every object, which makes up a hierarchical structure.
 *
 * - Objects can be attached using the {@link ObservableObject.attach attach()} method. A callback function can be used to listen for events and unlinking.
 * - When the origin object is unlinked, its attached objects are unlinked as well.
 *
 * **Events** — The {@link ObservableObject.emit emit()} method 'emits' an event from an observable object. Events are instances of {@link ObservableEvent}, which can be handled using a callback provided to the {@link ObservableObject.listen listen()} or {@link ObservableObject.attach()} methods. Typically, events are handled by their parent object (the object they're attached to). This enables event _propagation_, where events emitted by an object such as a {@link UIButton} are handled by an observable object further up the tree — such as an {@link Activity}.
 *
 * **Property bindings** — Whereas events typically flow 'up' a tree towards containing objects, data from these objects can be _bound_ so that it makes its way 'down'. In practice, this can be used to update properties automatically, such as the text of a {@link UILabel} object when a corresponding property is set on an {@link Activity}. Refer to {@link Binding} for details.
 */
export class ObservableObject {
	/**
	 * Returns the containing (attached) observable object of this type, for the provided object
	 * @param object The object for which to find the containing object
	 * @returns The closest containing (attached) object, which is an instance of the class on which this method is called.
	 * @summary This method finds and returns the closest containing object, i.e. parent, or parent's parent, etc., which is an instance of the specific class on which this method is called. For example, calling `ObservableObject.whence(obj)` results in the first parent object, if any; however calling `SomeClass.whence(obj)` results in the one of the parents (if any) that's actually an instance of `SomeClass`.
	 */
	static whence<T extends ObservableObject>(
		this: new (...args: any[]) => T,
		object?: ObservableObject,
	): T | undefined {
		let parent = object ? object[$_origin] : undefined;
		while (parent && !(parent instanceof this)) {
			parent = parent[$_origin];
		}
		return parent;
	}

	/**
	 * Intercepts events on an observable object
	 * @summary This method intercepts events on an observable object, calling a function when the specified event would be emitted. The function is called with the event, and a callback argument that can be used to emit an event without further interception (e.g. to emit the original event; otherwise the event is not emitted).
	 * @note If the event is already intercepted, the new handler will be unused (i.e. only one handler is allowed for each event name).
	 * @param object The object to intercept events on
	 * @param eventName The name of the event to intercept
	 * @param f A function that will be called when the event would be emitted
	 */
	static intercept<T extends ObservableObject>(
		object: T,
		eventName: string,
		f: ObservableObject.InterceptHandler<T>,
	) {
		let intercept = (object[$_intercept] ||= Object.create(null));
		intercept[eventName] ||= f;
	}

	/**
	 * Enables bindings on all instances of this class
	 * @summary If this method is called on a class, bindings created using the global `bind()` function will bind on properties of instances of this class (when bound to an attached child object).
	 * @note This method is called automatically on {@link AppContext}, {@link Activity} and {@link ComponentView} instances. You cannot call this method on the {@link ObservableObject} class itself.
	 */
	static enableBindings() {
		if (this === ObservableObject) throw invalidArgErr("limitOn");
		this.prototype[$_bind] = true;
	}

	/**
	 * Turns this object into a root object that cannot be attached
	 * - This method is used to mark an object as a 'root' object, which cannot be attached to another object. This also implies that any bindings cannot go beyond this object in the tree structure, and any bindings that are still unbound after an object is attached to the root object will result in an error.
	 * - This method is called automatically on the {@link app} object.
	 * @error This method throws an error if the object is _already_ attached to another object.
	 */
	static makeRoot(object: ObservableObject) {
		if (object[$_origin]) {
			// cannot make an attached object a root object
			throw invalidArgErr("object");
		}
		object[$_root] = true;
	}

	/** Creates a new observable object */
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

	/** @internal Reference to origin (parent) observable object, if any */
	declare [$_origin]?: ObservableObject;

	/** @internal Property that is set only on root objects (cannot be attached) */
	declare [$_root]?: boolean;

	/** @internal Property that is set to the constructor to which bindings should be limited; if not set, properties are not bound */
	declare [$_bind]?: unknown;

	/** @internal Intercepted events, with event names as keys and handler functions as values */
	declare [$_intercept]?: Record<
		string,
		ObservableObject.InterceptHandler<any>
	>;

	/** @internal Property getter for non-observable property bindings, overridden on observable lists */
	[$_get](propertyName: string) {
		if (propertyName === "*") return this;
		return (this as any)[propertyName];
	}

	/**
	 * Emits an event, immediately calling all event handlers
	 * - Events can be handled using {@link ObservableObject.listen()} or {@link ObservableObject.attach()}.
	 * - If the first argument is undefined, no event is emitted at all and this method returns quietly.
	 * @param event An instance of ObservableEvent, or an event name; if a name is provided, an instance of ObservableEvent will be created by this method
	 * @param data Additional data to be set on {@link ObservableEvent.data}, if `event` is a string
	 */
	emit(event?: ObservableEvent): this;
	emit(event: string, data?: Record<string, any>): this;
	emit(event?: string | ObservableEvent, data?: any) {
		if (event === undefined) return this;
		if (typeof event === "string")
			event = new ObservableEvent(event, this, data);

		// check for intercepted events
		let handler = this[$_intercept]?.[event.name];
		if (handler) {
			handler.call(this, event, (e) => invokeTrap(this, $_traps_event, e));
			return this;
		}

		// trigger traps as if event is written to a property
		invokeTrap(this, $_traps_event, event);
		return this;
	}

	/**
	 * Emits a change event
	 * - A change event can be used to indicate that the state of this object has changed in some way. The event emitted is a regular instance of {@link ObservableEvent}, but includes a data object with a `change` property that references the object itself.
	 * - Change events force an update on bindings for properties of the changed object.
	 * @param name The name of the event; defaults to "Change"
	 * @param data Additional data to be set on {@link ObservableEvent.data}; will be combined with the `change` property
	 */
	emitChange(name = "Change", data?: Record<string, any>) {
		return this.emit(name, { change: this, ...data });
	}

	/**
	 * Adds a handler for all events emitted by this object
	 *
	 * @param listener A function (void return type, or asynchronous) that will be called for all events emitted by this object; or an object of type {@link ObservableObject.Listener}
	 * @returns The object itself
	 *
	 * @description
	 * This method adds a listener for all events emitted by this object. Either a callback function or an object with callback functions can be provided.
	 *
	 * **Callback function** — If a callback function is provided, it will be called for every event that's emitted by this object. The function is called with the `this` value set to the observable object, and a single event argument. The callback function can be asynchronous, in which case the result is awaited to catch any errors.
	 *
	 * **Callbacks object** — If an object is provided, its functions (or methods) will be used to handle events. The `handler` function is called for all events, and the `unlinked` function is called when the object is unlinked. The `init` function is called immediately, with the object and a callback to remove the listener.
	 *
	 * To be able to remove the event handler, use a callbacks object with an `init` function, and store the `stop` (second) argument in a variable. When needed, call the `stop` function to remove the listener.
	 *
	 * @see {@link ObservableObject.listenAsync}
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
	 * // Handle all events using a callbacks object
	 * someObject.listen({
	 *   init: (object, stop) => {
	 *     // ... store `stop` in a variable if needed
	 *   },
	 *   handler: (object, event) => {
	 *     // ...handle events here
	 *   },
	 *   unlinked: (object) => {
	 *     // ...handle unlinking here
	 *   },
	 * });
	 */
	listen(listener: ObservableObject.Listener<this>) {
		// add a single handler if provided
		if (typeof listener === "function") {
			addTrap(this, $_traps_event, safeCall.bind(undefined, listener as any));
			return this;
		}

		// add multiple handlers if an object is provided
		if (typeof listener === "object") {
			const { handler, unlinked, init } = listener;
			let trap = addTrap(
				this,
				$_traps_event,
				function trap(target, event) {
					handler &&
						safeCall(
							handler,
							listener,
							target as any,
							event as ObservableEvent,
						);
				},
				unlinked?.bind(listener, this),
			);
			init?.call(listener, this, () => {
				if (!this[$_unlinked]) removeTrap(trap);
			});
			return this;
		}

		// otherwise, throw an error
		throw invalidArgErr("listener");
	}

	/**
	 * Adds a handler for all events emitted by this object, and returns an async iterable
	 *
	 * @description
	 * This method adds a listener for all events emitted by this object, and returns an async iterable. The result can be used to handle all events using a `for await...of` loop. The loop body is run for each event, in the order they're emitted, either awaiting new events or continuing execution immediately.
	 *
	 * The loop stops when the object is unlinked, and the event handler is removed if the loop is stopped using a `break` statement.
	 *
	 * @see {@link ObservableObject.listen}
	 *
	 * @example
	 * // Handle all events using an async iterable
	 * for await (let event of someObject.listenAsync()) {
	 *   if (event.name === "Foo") {
	 *     // ...handle Foo event
	 *   }
	 * }
	 * // ... (code here runs after object is unlinked, or `break`)
	 */
	listenAsync() {
		return { [Symbol.asyncIterator]: makeAsyncIterator(this) };
	}

	/**
	 * Observes a property, a bound property from an attached parent, or an observable object
	 * - Use a string parameter to observe a property directly. The provided function is called whenever the property is set to a new value. While the property is set to an observable object, the function is also called when the object emits a change event (until the object is unlinked, or the property is set to a new value).
	 * - Use a binding parameter to observe a property from an attached parent object, if any. The provided function is called when the binding found a property to bind to, and when it is set to a new value.
	 * - Use an observable object parameter to observe the provided object, for as long as both objects are not unlinked. The provided function is called whenever the object emits a change event.
	 * @param target A property name, binding, or observable object instance
	 * @param f A function that will be called when the associated value changes; the function is called with the value of the property or binding, and a boolean indicating whether the value is bound (i.e. an attached parent object is found with the matching bound property).
	 * @returns The target parameter
	 *
	 * @example
	 * class SomeView extends ComponentView {
	 *   constructor() {
	 *     super();
	 *
	 *     // Observe a bound property
	 *     this.observe(bind("foo"), (fooValue) => {
	 *       // ... handle foo value, e.g. from an activity
	 *     });
	 *
	 *     // Observe a property (from this object)
	 *     this.observe("someViewModel", (someViewModel) => {
	 *       // ... handle someViewModel value, after direct updates
	 *       //   and change events if property is an observable object
	 *     });
	 *   }
	 *   // ...
	 * }
	 *
	 * @example
	 * class SomeActivity extends Activity {
	 *   // Observe an observable object
	 *   constructor(public readonly auth: AuthProvider) {
	 *     super();
	 *     this.observe(auth, (auth) => {
	 *       // ... handle change events on the auth provider object
	 *       //   as long as the activity and provider are not unlinked
	 *     });
	 *   }
	 * }
	 */
	observe<K extends string & keyof this>(
		target: K,
		f: NoInfer<(this: this, value: this[K]) => void>,
	): void;
	observe<T extends ObservableObject>(
		target: T,
		f: NoInfer<(this: this, value: T) => void>,
	): T;
	observe<T = unknown>(
		target: Binding<T>,
		f: NoInfer<(this: this, value: T, bound?: boolean) => void>,
	): void;
	observe(
		target: string | Binding | ObservableObject | undefined,
		f: (this: ObservableObject, value: unknown, bound?: boolean) => void,
	) {
		if (this[$_unlinked]) throw err(ERROR.Object_Unlinked);

		// use a trap to listen for change events on referenced objects
		let trap: any;
		let trapSelf: any;
		function observeObject(self: ObservableObject, object: ObservableObject) {
			trapSelf ||= addTrap(self, $_origin, undefined, () => removeTrap(trap));
			trap = addTrap(object, $_traps_event, (_, event: any) => {
				if (event.data.change === object) f.call(self, object);
			});
		}

		if (typeof target === "string") {
			// observe a property, handle change events
			addTrap(this, target, (self, value) => {
				if (trap) removeTrap(trap);
				f.call(self, value);
				if (isObservableObject(value)) observeObject(self, value);
			});

			// observe current value if observable object
			let current = (this as any)[target];
			if (isObservableObject(current)) observeObject(this, current);
		} else if (isObservableObject(target)) {
			// handle change events on an observable object
			observeObject(this, target);
			f.call(this, target);
		} else if (target) {
			// apply a binding (does its own change event handling)
			target[$_bind_apply](this, f.bind(this));
		}
		return target;
	}

	/**
	 * Create a binding to a property of this object
	 * - If the (first) source property doesn't exist yet, it will be initialized as undefined.
	 * @param source The name of the property to bind to, or a path of properties separated by dots
	 * @param defaultValue The default value to use if the property is undefined
	 * @returns A binding to the property
	 */
	protected bind<K extends string & keyof this>(
		source: `${K}${"" | `.${string}`}`,
		defaultValue?: unknown,
	): Binding<this[K]> {
		// TODO: typing not working
		let path = source.split(".");
		let first = path[0] as keyof this;
		if (!(first in this)) (this as any)[first] = undefined;
		return new Binding({
			path,
			origin: this,
			default: defaultValue,
		});
	}

	/**
	 * Attaches the specified observable object to this object
	 * - This method makes the _current_ object the 'parent', or containing object for the target object. If the target object is already attached to another object, it's detached from that object first.
	 *
	 * @param target The object to attach
	 * @param listener A function that will be called when the target object emits an event; or an object of type {@link ObservableObject.AttachListener} (which includes an option to delegate events)
	 * @returns The newly attached object
	 * @error This method throws an error if the provided object was unlinked, or if a loop is detected (i.e. the target object would be indirectly attached to itself).
	 *
	 * @example
	 * // Attach an object once, in the constructor
	 * class MyObject extends ObservableObject {
	 *   foo = "bar";
	 * }
	 * class ParentObject extends ObservableObject {
	 *   readonly target = this.attach(
	 *     new MyObject(),
	 *     (event) => {
	 *       // ... handle event
	 *     }
	 *   )
	 * }
	 */
	protected attach<T extends ObservableObject>(
		target: T,
		listener?: ObservableObject.AttachListener<T>,
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
	 * Unlinks this observable object
	 * @summary This method marks the object as 'stale' or 'deleted', which means that the object should no longer be used by the application — even though the object's properties can still be accessed.
	 *
	 * - Any objects that have been attached to the unlinked object (using {@link ObservableObject.attach attach()}) will also be unlinked.
	 * - If this object was attached to a containing {@link ObservableList}, the item will be removed.
	 */
	unlink() {
		unlinkObject(this);
		return this;
	}

	/** A method that's called immediately before unlinking an object, can be overridden */
	protected beforeUnlink() {}
}

export namespace ObservableObject {
	/**
	 * Intercept handler function
	 * - This type of function is accepted by {@link ObservableObject.intercept}, handling events that _would be_ emitted by the object.
	 * - The `emit` parameter is a callback that can be used to emit an event without further interception (e.g. to emit the original event).
	 * - The `this` parameter is the object that the event would be emitted on.
	 */
	export type InterceptHandler<T extends ObservableObject> = (
		this: T,
		event: ObservableEvent<T>,
		emit: (event: ObservableEvent) => void,
	) => void;

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ObservableObject.listen} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object is provided, the `handler` function will be called for all events, and the `unlinked` function will be called when the object is unlinked.
	 * - The `init` function is called immediately, with the object and a callback to remove the listener.
	 */
	export type Listener<T extends ObservableObject> =
		| ((this: T, event: ObservableEvent) => Promise<void> | void)
		| {
				/** A function that will be called for all events emitted by the object */
				handler?: (object: T, event: ObservableEvent) => Promise<void> | void;
				/** A function that will be called when the object is unlinked */
				unlinked?: (object: T) => void;
				/** A function that is called immediately, with both the object and a callback to remove the listener */
				init?: (object: T, stop: () => void) => void;
		  };

	/**
	 * Type definition for a callback, or set of callbacks that can be passed to the {@link ObservableObject.attach} method
	 * - If a single function is provided, it will be called for all events emitted by the object.
	 * - If an object with `handler` property is provided, that function will be called for all events, and the `detached` function will be called when the object is detached **or** unlinked.
	 * - If the object includes a `delegate` property instead of `handler`, the specified object (usually the attached parent itself) must contain a `delegate(event) { ... }` method, which will be called for all events that do **not** have their {@link ObservableEvent.noPropagation} property set. If the `delegate` method does not return `true` (or a promise that resolves to `true`) then the event will be emitted on the attached parent object, with the {@link ObservableEvent.delegate} property set to the attached parent — effectively 'bubbling up' or _propagating_ the event from an object (e.g. a view) to its parent(s).
	 */
	export type AttachListener<T extends ObservableObject> =
		| ((event: ObservableEvent) => Promise<void> | void)
		| {
				handler?: (object: T, event: ObservableEvent) => Promise<void> | void;
				detached?: (object: T) => void;
		  }
		| {
				delegate?: ObservableObject.EventDelegate;
				detached?: (object: T) => void;
		  };

	/**
	 * A type of object that can be used to handle events from other (attached) objects
	 * - This interface must be matched by the `delegate` object that's passed to {@link ObservableObject.attach()}, as part of the {@link ObservableObject.AttachListener} object argument.
	 * - In practice, the required `delegate` method is often defined on the attached parent itself, to handle events from attached objects such as (nested) views. In that case, the parent object itself can be passed to {@link ObservableObject.attach()} as `{ delegate: this }`.
	 * - The `delegate` method is expected to return undefined or false if the event should be propagated on the parent object, i.e. re-emitted with the {@link ObservableEvent.delegate} property set to the attached parent object. Otherwise, the method should return true, or a promise for asynchronous error handling.
	 * @see {@link ObservableObject.attach}
	 */
	export interface EventDelegate {
		/**
		 * A required method that handles the provided event
		 * @see {@link ObservableObject.attach}
		 */
		delegate(event: ObservableEvent): Promise<unknown> | boolean | void;
	}
}
