import type { ManagedObject } from "./ManagedObject.js";

/**
 * An object that represents an event, to be emitted on a {@link ManagedObject}
 *
 * @description
 * Events can be emitted on instances of {@link ManagedObject}, and handled using {@link ManagedObject.listen()}, {@link Observer}, or a change callback to {@link ManagedObject.attach()} or {@link ManagedObject.autoAttach()}.
 *
 * In most cases, instances of ManagedEvent are created by {@link ManagedObject.emit()} itself, when provided with just the event name and data (if any). When handling events, the implicitly created ManagedEvent will be passed to the handler.
 *
 * **Types** — Events are identified by their name at runtime. In the application source code, a specific event can be identified using the type arguments of ManagedEvent. These refer to the source object type, data object, and name, respectively — e.g. `ManagedEvent<MyView, { foo: number }, "Foo">`, which is a type definition for an event emitted by instances of MyView, with name Foo and a data object that includes a `foo` number property.
 *
 * Several types are already defined, such as {@link DelegatedEvent}, {@link ViewEvent}, {@link UIListView.ItemEvent}, and {@link ManagedList.ChangeEvent}.
 *
 * Alternatively a sub class can be defined, such as {@link ManagedChangeEvent}, if a type of event may be used with different names.
 *
 * **Delegation** — If an object handles an event by re-emitting the same event on its own, but both the original source object _and_ the delegating object should be available, a new event should be created that includes the `delegate` property. The original source can be traced back using the `source` property, while the second object is available as `delegate`. Refer to {@link DelegatedEvent} and the example below.
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
 * // Handling change events from an attached object
 * class MyObject extends ManagedObject {
 *   constructor() {
 *     super();
 *     this.autoAttach("foo", (foo, e) => {
 *       // ...either foo property is set directly, OR
 *       // a change event `e` was emitted
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
	TData extends Record<string, unknown> | undefined =
		| Record<string, unknown>
		| undefined,
	TName extends string = string,
> {
	/**
	 * Creates a new event with the specified name
	 * @param name The name of the event
	 * @param source Managed object that will emit the event
	 * @param data Object that contains further details about the specific event
	 * @param delegate Managed object that delegated the event, if any
	 * @param inner Encapsulated event, if any (intercepted or forwarded)
	 */
	constructor(
		name: TName,
		source: TSource,
		data?: TData,
		delegate?: ManagedObject,
		inner?: ManagedEvent,
	) {
		this.name = name;
		this.source = source;
		this.data = data as TData;
		this.delegate = delegate;
		this.inner = inner;
	}

	/** The name of the event, should start with a capital letter */
	readonly name: TName;
	/** The object that's emitted (or will emit) the event */
	readonly source: TSource;
	/** Object that contains arbitrary event data (if any) */
	readonly data: Readonly<TData>;
	/** An object that delegated the event, if any, e.g. {@link UIForm} or {@link UIListView.ItemControllerView} */
	readonly delegate?: ManagedObject;
	/** The original event, if the event was intercepted or propagated */
	readonly inner?: ManagedEvent;
}

/**
 * An object that represents an event, emitted on a {@link ManagedObject} when its internal state changes
 * - Events of this type can be emitted using the {@link ManagedObject.emitChange()} method.
 * - Change events are handled specially by {@link Observer}, and trigger the callback provided to {@link ManagedObject.attach()} and {@link ManagedObject.autoAttach()}.
 */
export class ManagedChangeEvent<
	TSource extends ManagedObject = ManagedObject,
	TData extends Record<string, unknown> | undefined =
		| Record<string, unknown>
		| undefined,
	TName extends string = string,
> extends ManagedEvent<TSource, TData, TName> {
	/** A method that always returns true, can be used for duck-typing this type of events */
	isChangeEvent(): true {
		return true;
	}
}

/**
 * A generic type definition for an event that has been propagated by a delegate object
 * - The `source` property refers to the object that originally emitted (or intercepted) the event; however, the `delegate` property can be used to find the object that delegated the event, e.g. {@link UIForm} or {@link UIListView.ItemControllerView}.
 */
export type DelegatedEvent<
	TDelegate extends ManagedObject,
	TSource extends ManagedObject = ManagedObject,
	TData extends Record<string, unknown> | undefined =
		| Record<string, unknown>
		| undefined,
	TName extends string = string,
> = ManagedEvent<TSource, TData, TName> & {
	/** The object that delegated the event, e.g. {@link UIForm} or {@link UIListView.ItemControllerView} */
	readonly delegate: TDelegate;
};
