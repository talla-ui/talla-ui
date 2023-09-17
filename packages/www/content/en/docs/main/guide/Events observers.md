---
title: Event handlers and observers
abstract: Find out about different ways to handle events and observe property changes
breadcrumb_name: Guide
nav_parent: using
sort: -10
applies_to:
  - ManagedObject
  - ManagedObject.attach
  - ManagedObject.observeAttach
  - ManagedObject.emit
  - ManagedObject.emitChange
  - ManagedEvent
  - ManagedChangeEvent
  - DelegatedEvent
  - UIComponentEvent
  - Observer
---

## Overview {#overview}

In a Desk application, events are represented by instances of {@link ManagedEvent}. Events include at least a **name** as well as a **source** object — the instance of {@link ManagedObject} that (originally) _emitted_ the event.

- {@ref ManagedEvent}
- {@ref ManagedObject}

After events are emitted by a managed object, they can be handled in different ways. This guide describes various ways to emit, handle, and intercept events in your application.

## Emitting events {#emitting}

To emit an event, use the {@link ManagedObject.emit()} method. You can either pass a {@link ManagedEvent} instance, or provide the event name along with other parameters to have the method create a new event object.

- {@ref ManagedObject.emit}

#### Example

The following program emits two events that have the same properties.

```ts
let o = new ManagedObject();
let event = new ManagedEvent("Example", o);
o.emit(event);

// same:
o.emit("Example");
```

Refer to the documentation for {@link ManagedEvent} for a description of other event properties.

## Emitting change events {#emitting-change}

Instances of the {@link ManagedChangeEvent} class are referred to as _change events_.

These events signal changes to the internal state of an object, and are handled differently in the case of bindings (forcing their value to be updated), {@link Observer} classes, and attached objects' event handlers.

To emit a change event, instantiate a {@link ManagedChangeEvent} object first, or simply use the {@link ManagedObject.emitChange()} method with an event name.

- {@ref ManagedObject.emitChange}

## Handling change events from attached objects {#attached-events}

When attaching an object using {@link ManagedObject.attach()}, or adding an observed property using {@link ManagedObject.observeAttach()}, you can provide a callback function that's invoked when —

- an object is attached,
- an attached object is unlinked or otherwise detached, or
- an attached object emits a _change event_.

Refer to the documentation for these methods to learn more.

- {@ref ManagedObject.attach}
- {@ref ManagedObject.observeAttach}

Alternatively, you can provide an {@link Observer} object instead of a callback function. An observer class would be able to handle _any_ event as well as property changes (refer to the sections about observers below).

#### Example

The following class handles change events from an attached object using a callback function. Note that the callback function can also be defined in a constructor or any other method that attaches a managed object.

```ts
class MyObject extends ManagedObject {
	readonly otherObject = this.attach(new SomeOtherObject(), (target, event) => {
		if (event) {
			// handle a change event here
			this.handleOtherObjectChange(event);
		}
	});

	handleOtherObjectChange(event: ManagedChangeEvent) {
		// ...
	}
}
```

## Handling change events from services {#service-events}

The {@link ServiceContext.observeService()} method accepts the same callback as {@link ManagedObject.attach()}. The callback is invoked when the service object changes, _and_ when an existing service emits a change event.

- {@ref ServiceContext.observeService}

For example, a service that stores data in a local database may emit a change event each time a record is added or updated; and a service that encapsulates an authentication API may emit a change event whenever a user successfully logs in or out.

To start listening for changes and events, define a callback function and provide it to the {@link ServiceContext.observeService()} method. Note that you can do this before any service instance is added at all.

#### Example

The following code illustrates how a single callback can be used to handle service changes as well as change events.

```ts
const dbObserver = app.services.observeService("App.DB", (service, event) => {
	if (!service) {
		// ... service has been unlinked
	} else if (event) {
		// ... handle a change event
	}
});
```

## Handling events using listeners {#listen}

To handle events that are emitted by any object that's not attached, use the {@link ManagedObject.listen()} method.

The provided event handler function is invoked as-is for every event that's emitted, with the event object itself as the only parameter. If the function returns a Promise (i.e. an `async` function), the promise is awaited so that any asynchronous errors will be caught.

- {@ref ManagedObject.listen}

> **Note:** While this method provides the simplest way to add an event handler, and is generally very performant, the event handler can't be removed (other than by unlinking the managed object, or waiting for garbage collection to take place). This may lead to memory leaks since the handler references _both_ the target object and the handler function's own scope.

#### Example

In the following code, an event handler is added to a new object. Any event emitted by this object will be handled by the provided callback function.

```ts
let myObject = new SomeManagedObject();
myObject.listen((event) => {
	if (event.name === "Test") {
		// ... Test event was emitted
	} else if (event.name === "Foo") {
		// ... Foo event was emitted
	}
});
```

## Handling events using observers {#observers-events}

The {@link Observer} class provides a way to handle events from any object. To start listening, the {@link Observer} object must be instantiated and linked to a particular {@link ManagedObject} instance.

Observers can also _stop_ observing the managed object, using the {@link Observer.stop()} method.

- {@ref Observer}
- {@ref Observer.observe}
- {@ref Observer.stop}

To create your own observer, create a subclass of {@link Observer} first, to be able to override its methods and add your own. The TypeScript type includes a generic parameter which refers to the type of object being observed.

```ts
class MyObserver extends Observer<SomeManagedObject> {
	// ... add methods here
}
```

**Default methods** — By default, the {@link Observer.handleEvent handleEvent()}, {@link Observer.handleUnlink handleUnlink()}, and {@link Observer.handleAttachedChange handleAttachedChange()} methods are called on the {@link Observer} instance while an object is being observed.

- {@ref Observer.handleEvent}
- {@ref Observer.handleUnlink}
- {@ref Observer.handleAttachedChange}

**Named event handlers** — To make event handling easier, methods with names that start with `on`, such as `onEventName`, are also invoked automatically for events with the corresponding name. Methods with names that end with `Async` are called in the same way, with rejected Promises handled appropriately. Note that this behavior is provided by the `handleEvent` method, so be sure to call `super.handleEvent()` if you have overridden that method and you still want `on` methods to be called for specific events.

In summary, to observe an object:

1. Create an {@link Observer} class
2. Create an instance of your class and call the {@link Observer.observe observe()} method to start observing any object
3. Optionally, add a {@link Observer.handleUnlink handleUnlink()} method to be called when the object is unlinked
4. Optionally, add a {@link Observer.handleAttachedChange handleAttachedChange()} method to be called when the object is attached or detached
5. Optionally, add a {@link Observer.handleEvent handleEvent()} method to be called when an event is emitted by the object
6. Or, add an `on...()` method for every event name you want to handle.

#### Example

The observer in the example below handles _only_ `FooBar` events that are emitted by the observed object.

```ts
class MyObserver extends Observer<SomeManagedObject> {
	onFooBar(event: ManagedEvent) {
		// ... handle the event
		// (the object is referenced by this.observed)
	}
}
let myObject = new SomeManagedObject();
new MyObserver().observe(myObject);
myObject.emit("FooBar"); // this event is handled (sync)
```

To handle _all_ events, you can override the {@link Observer.handleEvent()} method instead, and use the event name or type to determine the course of action.

```ts
class MyObserver extends Observer<SomeManagedObject> {
	handleEvent(event: ManagedEvent) {
		if (event.name === "FooBar") {
			// ... handle the FooBar event
		}
	}
}
let myObject = new SomeManagedObject();
new MyObserver().observe(myObject);
myObject.emit("Test");
```

## Handling property changes using observers {#observers-properties}

Observers can also be used to observe property changes on any instance of {@link ManagedObject}.

However, properties aren't watched by default. You'll need to explicitly observe every property by name, before you can handle their changes. The recommended way to do this, is by overriding the `observe` method. In your own method, call `super.observe(...)` and then observe each property by calling one of the methods below.

- {@ref Observer.observeProperty}
- {@ref Observer.observePropertyAsync}

Note that a 'change' is triggered when a property is assigned a new value, **or** when a referenced {@link ManagedObject} emits a change event (see above).

After calling one of the above methods, changes to property values automatically cause the {@link Observer.handlePropertyChange handlePropertyChange()} method to be called. By default, this method looks for methods with names that start with `on` and end with `Change`, e.g. `onFooChange` for changes to a property called `foo`. Note that the first letter of the property name is always capitalized.

- {@ref Observer.handlePropertyChange}

#### Example

The observer in the example below handles changes to two specific properties of the `SomeManagedObject` instance, `foo` and `bar`.

```ts
class MyObserver extends Observer<SomeManagedObject> {
	observe(observed: SomeManagedObject) {
		return super.observe(observed).observeProperty("foo", "bar");
	}
	onFooChange(value: any, changeEvent?: ManagedChangeEvent) {
		// ... handle a change to this.foo
	}
	onBarChange(value: any, changeEvent?: ManagedChangeEvent) {
		// ... handle a change to this.bar
	}
}
let myObject = new SomeManagedObject();
new MyObserver().observe(myObject);
myObject.foo = 123; // handled by onFooChange()
myObject.bar = new ManagedObject();
myObject.bar.emitChange("Test"); // handled by onBarChange()
```

## Handling UI events {#ui-events}

Events that are the result of user interactions, such as button clicks or changes to the contents of a text input field, are represented by events that are emitted by the corresponding {@link UIComponent}.

The {@link UIComponentEvent} type can be used to refer to {@link ManagedEvent} instances that have their **source** property set to a {@link UIComponent}. Other than that, UI events are simply instances of {@link ManagedEvent}, with names such as `Click`, `FocusIn`, or `Change`.

To find out which events are emitted by different types of UI components, refer to the **Events** section of the corresponding guide for each UI component. You can find guides for all UI components on the following page.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/UI components"}}-->

UI events are typically handled by the {@link ViewActivity} or {@link ViewComposite} classes that contain the source UI component. To handle an event, these classes look for methods by name, such as `onClick` or `onSearchFieldChange`.

Note that views can use _presets_ (or JSX properties) to intercept generic events and give them more descriptive names — for example, turning a `Change` event on a search text field into a `SearchFieldChange` event, which leads to the `onSearchFieldChange()` method being called on the containing {@link ViewActivity} or {@link ViewComposite} class. Refer to the below guide for more information on creating views.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Views"}}-->

#### Example

As illustrated by the example below, handling UI events is easy — thanks to the default behavior of observers and methods added by the {@link ViewActivity} (and {@link ViewComposite}) class. To handle an event, define a method with the appropriate name, and optionally refer to the event's {@link ManagedEvent.source source} property to get access to the {@link UIComponent} object that emitted the event.

```ts
const body = UICell.with(
	UIRow.with(
		UITextField.with({ onChange: "SearchFieldChange" }),
		UIPrimaryButton.withLabel("Search", "GoSearch"),
	),
);

class MyActivity extends PageViewActivity {
	static ViewBody = body;

	/** The latest search field input value */
	searchText = "";

	/** Event handler, called when search field text changes */
	onSearchFieldChange(e: UIComponentEvent<UITextField>) {
		this.searchText = e.source.value;
	}

	/** Event handler, called when Search button pressed */
	onGoSearch() {
		// ...
	}
}
```

> **Note:** This example shows how to use UI events to keep track of a single input field. For multiple fields, it's recommended to use a form instead — see {@link UIFormContext}.

## Handling delegated UI events {#delegate-ui-events}

The reason that UI events (emitted by view objects) can be handled by a {@link ViewActivity} or {@link ViewComposite} instance — even if the view object is **not directly attached** to the handling object — is because these UI events are handled and then emitted as-is by every containing view object along the way.

In the example above, the `SearchFieldChange` event is emitted multiple times:

1. The {@link UITextField} itself emits the event when its input value is updated.
2. The containing {@link UIRow} view handles the event, and immediately emits it again — with the `source` property still referencing the {@link UITextField}.
3. The containing {@link UICell} view handles the event, and also emits it again, with the same `source` property.
4. Finally, the {@link PageViewActivity} object handles the event emitted by the attached {@link UICell}, and invokes its own `onSearchFieldChange` method.

However, not every view object _needs_ to emit the event unmodified. In particular, the following view classes create a new event, keeping the original `source` property, but utilizing the {@link ManagedEvent.delegate} property to add a reference to themselves as well. This can be used by the final handler to get more information from the containing view.

- The {@link UIForm} and {@link UIFormController} views add a reference to themselves, allowing UI event handlers to get easy access to the form context.
- The {@link UIList.ItemController} view composite — created automatically for each list item by {@link UIList}, adds a reference to itself as well. This allows UI event handlers to get easy access to the list item (data).

In both cases, the {@link ManagedEvent.inner} property is set to the original event, which you can use to find _nested_ delegate views if needed.

The {@link DelegatedEvent} type definition is available with generic parameters for both the `delegate` and `source` properties. For delegated events from list item views, a more specific {@link UIList.ItemEvent} type is available.

- {@ref DelegatedEvent}
- {@ref UIList.ItemEvent}

#### Example

The following example demonstrates how an event handler can use the `delegate` property to access form context data.

```ts
class MyActivity extends PageViewActivity {
	// ...

	/** Change event handler for a textfield within a UIForm */
	onSomeFormFieldChange(e: DelegatedEvent<UIForm, UITextField>) {
		// now, we can access the form context:
		let formContext = e.delegate.formContext;

		// and also still the input value:
		let value = e.source.value;

		// ...
	}
}
```

The following example shows an event handler for a button that's part of a list item view. Assuming list items are of type `SomeItem`, which are made available by the (implicit) {@link UIList.ItemController} view through its `item` property, the event handler's parameter could be typed as `UIList.ItemEvent<SomeItem>`.

```ts
class SomeItem extends ManagedObject {
	// ... add the item data here
	foo?: string;
}

class MyActivity extends PageViewActivity {
	// ...

	/** Click event handler for a button within a list item view */
	onSomeButtonClick(e: UIList.ItemEvent<SomeItem>) {
		// now, we can access the list item (typed):
		let foo = e.delegate.item.foo;

		// ...
	}
}
```
