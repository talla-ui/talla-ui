import type { ObservableObject } from "./ObservableObject.js";

// Reuse the same frozen object for events without data
const NO_DATA = Object.freeze({});

/**
 * An object that represents an event, to be emitted on an {@link ObservableObject}
 *
 * @description
 * Events can be emitted on instances of {@link ObservableObject}, and handled using a callback passed to {@link ObservableObject.listen()} or {@link ObservableObject.attach()}.
 *
 * In most cases, instances of ObservableEvent are created by {@link ObservableObject.emit()} itself, when provided with just the event name and data (if any). When handling events, the implicitly created ObservableEvent will be passed to the handler.
 *
 * **Types** — Events are identified by their name at runtime. In the application source code, a specific event can be identified using the type arguments of ObservableEvent. These refer to the source object type and data object, respectively — e.g. `ObservableEvent<MyView, { foo: number }>`, which is a type definition for an event emitted by instances of MyView, with name Foo and a data object that includes a `foo` number property.
 *
 * **Change events** — The {@link ObservableObject.emitChange()} method can be used to emit events with a `change` property in the data object. This is a common pattern for notifying listeners about changes in the object's state, and will also trigger bindings to update the value of any bound properties.
 *
 * **Delegation** — An object may handle an event by emitting a new event with the same name, referencing itself as the delegate object. This is useful for forwarding events from one object to another, or for handling events in a different context, and is implemented automatically using the `delegate` option in the {@link ObservableObject.attach()} method. The delegate object can be accessed on any event using the {@link findDelegate()} method.
 *
 * **Event aliases** — Using the `intercept()` method of a view builder (i.e. the result of functions such as `UI.Image()`, `UI.Button()`, etc.), or the `emit()` method on button and text field view builders, event names can be aliased to other event names. In the corresponding activity or component, the event can be handled using the aliased name. Refer to the example below.
 *
 * @example
 * // Emitting an event from an observable object
 * let obj = Object.assign(new ObservableObject(), { foo: "bar" });
 * obj.emit("Foo");
 * obj.emit("Foo", { baz: 123 })
 *
 * @example
 * // Handling events from an attached object
 * class MyObject extends ObservableObject {
 *   constructor() {
 *     super();
 *     this.foo = this.attach(new Foo(), (e) => {
 *       // ... handle event on attached foo object
 *     })
 *   }
 *   foo: MyFooObject;
 * }
 *
 * @example
 * // Handling delegated UI events
 * const bodyView = list(
 *   bind("items"),
 *   row(
 *     // ...
 *     button("Remove").emit("RemoveItem")
 *   )
 * )
 * class MyActivity extends Activity {
 *   // ...
 *   items: SampleData[];
 *   onRemoveItem(e: UIListViewEvent) {
 *     let item = e.data.listViewItem;
 *     // ...here:
 *     // item refers to the SampleData object
 *     // e.source refers to a button
 *   }
 * }
 */
export class ObservableEvent<
	TSource extends ObservableObject = ObservableObject,
	TData extends Record<string, unknown> = Record<string, unknown>,
> {
	/**
	 * Creates a new event with the specified name
	 * @param name The name of the event
	 * @param source Observable object that will emit the event
	 * @param data Object that contains further details about the specific event
	 * @param delegate Observable object that delegated the event, if any
	 * @param inner Encapsulated event, if any (intercepted or forwarded)
	 * @param noPropagation True if the event should not be propagated
	 */
	constructor(
		name: string,
		source: TSource,
		data?: TData,
		delegate?: ObservableObject,
		inner?: ObservableEvent,
		noPropagation?: boolean,
	) {
		this.name = name;
		this.source = source;
		this.data = data || (NO_DATA as TData);
		this.delegate = delegate;
		this.inner = inner;
		this.noPropagation = noPropagation;
		Object.freeze(this);
	}

	/**
	 * Returns the delegate object of the specified type
	 * @summary This method returns either the {@link delegate} property of this event, or the delegate object of any of the referenced {@link inner} events, where it matches the specified type. If none of the delegates match the type, this method returns undefined.
	 * @param type An {@link ObservableObject} class that determines the return type
	 * @returns The matched delegate, or undefined
	 */
	findDelegate<T extends ObservableObject>(
		type: new (...args: any[]) => T,
	): T | undefined {
		for (let e: ObservableEvent | undefined = this; e; e = e.inner) {
			if (e.delegate instanceof type) return e.delegate;
		}
	}

	/** The name of the event, should start with a capital letter */
	readonly name: string;
	/** The object that's emitted (or will emit) the event */
	readonly source: TSource;
	/** Object that contains arbitrary event data */
	readonly data: Readonly<TData>;
	/** An object that delegated the event, if any */
	readonly delegate?: ObservableObject;
	/** The original event, if the event was propagated */
	readonly inner?: ObservableEvent;
	/** True if the event should not be propagated or delegated (by observable lists, activities, views, etc.) */
	readonly noPropagation?: boolean;
}
