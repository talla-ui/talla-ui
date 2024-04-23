import type { ManagedObject } from "./ManagedObject.js";

// Reuse the same frozen object for events without data
const NO_DATA = Object.freeze({});

/**
 * An object that represents an event, to be emitted on a {@link ManagedObject}
 *
 * @description
 * Events can be emitted on instances of {@link ManagedObject}, and handled using a callback passed to {@link ManagedObject.listen()} or {@link ManagedObject.attach()}.
 *
 * In most cases, instances of ManagedEvent are created by {@link ManagedObject.emit()} itself, when provided with just the event name and data (if any). When handling events, the implicitly created ManagedEvent will be passed to the handler.
 *
 * **Types** — Events are identified by their name at runtime. In the application source code, a specific event can be identified using the type arguments of ManagedEvent. These refer to the source object type and data object, respectively — e.g. `ManagedEvent<MyView, { foo: number }>`, which is a type definition for an event emitted by instances of MyView, with name Foo and a data object that includes a `foo` number property.
 *
 * TODO: describe change events
 *
 * **Delegation** — If an object handles an event by re-emitting the same event on its own, but both the original source object _and_ the delegating object should be available, a new event should be created that includes the `delegate` property. The original source can be traced back using the `source` property, while the second object is available as `delegate`.
 *
 * **Forwarding and intercepting events** — When an event is forwarded or intercepted by a preset view (using `on...` properties of the object passed to e.g. `ui.cell({ ... })`), the original event is stored in the `inner` property.
 *
 * @example
 * // Emitting an event from a managed object
 * let obj = ManagedRecord.create({ foo: "bar" });
 * obj.emit("Foo");
 * obj.emit("Foo", { baz: 123 })
 *
 * @example
 * // Handling events from an attached object
 * class MyObject extends ManagedObject {
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
 * const BodyView = (
 *   ui.list(
 *     { items: bind("items") }
 *     ui.row(
 *       // ...
 *       ui.button("Remove", "RemoveItem")
 *     )
 *   )
 * )
 * class MyActivity extends Activity {
 *   // ...
 *   items: SampleData[];
 *   onRemoveItem(e: UIList.ItemEvent<SampleData>) {
 *     // ...here:
 *     // e.source refers to a button
 *     // e.delegate refers to a list item view (wrapper)
 *     // e.delegate.item refers to the SampleData object
 *     // e.inner is the original event emited by the button
 *   }
 * }
 */
export class ManagedEvent<
	TSource extends ManagedObject = ManagedObject,
	TData extends Record<string, unknown> = Record<string, unknown>,
> {
	/**
	 * Creates a new event with the same properties as the original event, and the specified delegate
	 * @param event The original event
	 * @param delegate The managed object to set as the delegate
	 * @returns A new event object with the specified delegate
	 */
	static withDelegate(
		event: ManagedEvent,
		delegate?: ManagedObject,
	): ManagedEvent {
		return new ManagedEvent(
			event.name,
			event.source,
			event.data,
			delegate,
			event,
		);
	}

	/**
	 * Creates a new event with the specified name
	 * @param name The name of the event
	 * @param source Managed object that will emit the event
	 * @param data Object that contains further details about the specific event
	 * @param delegate Managed object that delegated the event, if any
	 * @param inner Encapsulated event, if any (intercepted or forwarded)
	 * @param noPropagation True if the event should not be propagated
	 */
	constructor(
		name: string,
		source: TSource,
		data?: TData,
		delegate?: ManagedObject,
		inner?: ManagedEvent,
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

	/** The name of the event, should start with a capital letter */
	readonly name: string;
	/** The object that's emitted (or will emit) the event */
	readonly source: TSource;
	/** Object that contains arbitrary event data (if any) */
	readonly data: Readonly<TData>;
	/** An object that delegated the event, if any */
	readonly delegate?: ManagedObject;
	/** The original event, if the event was intercepted or propagated */
	readonly inner?: ManagedEvent;
	/** True if the event should not be propagated or delegated (by managed lists, activities, views, etc.) */
	readonly noPropagation?: boolean;
}
