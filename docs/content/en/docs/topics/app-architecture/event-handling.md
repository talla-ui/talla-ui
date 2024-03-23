---
title: Event handling
folder: topics
abstract: Learn about events, event handling, and observers to watch for property changes.
---

# Event handling

> {@include abstract}

## Overview {#overview}

In a Desk app, events are used to communicate between different {@link objects managed objects}. Once an object **emits** an event, it can be handled either by a listener function (callback), an observer (see below), or an attached parent object.

**Why?** — Events allow for a _loosely coupled_ architecture, where objects can communicate without needing to know about each other's implementation details. This makes it easier to maintain and extend the application, and to test individual parts in isolation.

**Implementation** — Events are represented by `ManagedEvent` objects, created by the emitting `ManagedObject` object. The event object contains information about the event, such as the event name, the emitting object, and any additional data.

- {@link ManagedEvent +}

Event names are case-sensitive, and _should_ start with a capital letter — e.g. `Click` and `ButtonClick`, not `click` or `button-click`. This makes it possible to distinguish handler methods with an event name (e.g. `onButtonClick`), which are used in activity classes and composite views.

## Emitting events {#emit}

To emit an event, use the {@link ManagedObject.emit()} method. This method can be used in two ways:

- Emitting an event using an instance of {@link ManagedEvent}.
- Emitting an event using just the event name and additional data.

- {@link ManagedObject.emit}

{@import :emit}

## Emitting change events {#change}

The {@link ManagedChangeEvent} event **subclass** is used to emit _change events_. There's nothing special about the event class itself, but change events are handled differently from other events. Notably:

- Change events can be handled using a callback function, when emitted by an attached object or a service (see below).
- Change events on {@link bindings bound} objects will trigger a forced update of the bound value.

As with other events, change events can be emitted using the {@link ManagedObject.emit emit()} method, but to emit a change event using just the event name, you should use the {@link ManagedObject.emitChange emitChange()} method instead. Without any parameters, this method emits a change event with the name `Change` and no additional data.

- {@link ManagedChangeEvent +}
- {@link ManagedObject.emitChange}

{@import :emitChange}

## Handling change events from attached objects {#change-attach}

With an architecture that's based on _composition_, parent objects are often interested in changes to attached objects — for example, to keep their own internal state up to date.

You can simply provide a callback (or an {@link Observer} instance, see below) to the {@link ManagedObject.attach attach()} or {@link ManagedObject.autoAttach autoAttach()} methods to listen for change events. When a change event is emitted by an attached object, the parent object calls the callback automatically.

{@import :attach-callback}

## Handling change events from services {#service-events}

Shared functionality and data is commonly encapsulated in a **service**, accessible by name (e.g. `Auth` or `Settings`) using the {@link ServiceContext service context}. Refer to the documentation for {@link services} to learn more.

Services can be _observed_ by activities and other services. A callback function (or an {@link Observer} instance, see below) can be used to listen for change events that are emitted by a service, along with service registration, replacement, and unlinking, when provided to the `observeService()` method.

- {@link Activity.observeService}

{@import :service-callback}

## Handling events using listeners {#listen}

Listeners provide the simplest mechanism for handling events. A listener adds a callback function that's invoked whenever _any_ event is emitted by the target object. The listener stops automatically when the target object is unlinked, but is otherwise never removed.

- {@link ManagedObject.listen}

{@import :listen}

> **Note:** Since listeners can't be removed, don't add a listener to an object that's intended to 'outlive' the listener. For example, from the {@link Activity.ready()} method, don't add a listener to an object that stays around during the entire lifetime of the application. That may end up adding multiple listeners, creating a memory leak. In that case, use a (service) observer, or find a way to attach the target object to the activity.

### Async event streams {#listen-async}

Rather than using a callback function, you can also use an _async iterable_ to listen for events. This allows for a 'loop'-like syntax, and ensures that each event is handled in sequence, even if the event is emitted while the listener is still processing a previous event.

{@import :listen-async}

## Observers {#observers}

The Desk framework provides an even more powerful mechanism for handling events, in the form of _observers_.

Observers are _classes_ that are instantiated to observe a single object at a time. They can be used to handle all events, property changes, and attachment changes (i.e. attaching or unlinking) of any {@link ManagedObject} instance.

To create an observer, write a subclass of the {@link Observer} class, and override its methods or add your own. Then, create an instance and use the {@link Observer.observe observe()} method to start observing a target object.

- {@link Observer +}
- {@link Observer.observe}

The lifecycle of an observer instance extends beyond that of the target object, so that a single observer can be used to observe multiple objects. Once a target object is unlinked, the observer stops automatically. You can also stop the observer manually using the {@link Observer.stop stop()} method. After that, the observer can be used again to observe a new object.

- {@link Observer.stop}

## Handling events using observers {#observers-events}

Once the observer has started observing a target object, its {@link Observer.handleEvent handleEvent()} method is called for every event emitted by the target object.

- {@link Observer.handleEvent}

By default, this method tries to find a specific method for each event using its name (e.g. `onConnected()` for a `Connected` event). You can also override this method to handle events in a different way.

{@import :observer-events}

You can pass an observer instance to the {@link ManagedObject.attach()} or {@link ManagedObject.autoAttach()} methods to observe attached objects. In the case of `autoAttach`, the observer is started and stopped automatically when a new object is attached or detached.

{@import :observer-attach}

In addition, observers can be used to handle unlinking, and attachment changes (i.e. moving the observed object to a different attached parent). Use the following methods to handle these events:

- {@link Observer.handleUnlink}
- {@link Observer.handleAttachedChange}

## Handling property changes using observers {#observers-properties}

With the help of an {@link Observer} instance, you can handle _property changes_ of a managed object. In the observer, you can either handle all property changes in a single method, or handle each property change individually — either synchronously or asynchronously.

Each property is observed individually. Under the hood, this adds a property _getter_ and _setter_ for each observed property, the same way bindings are implemented. This allows the observer to intercept changes.

> **Observed properties and maintainability**
>
> Although being able to observe any property directly seems like a powerful and convenient feature, it's best not to rely on this mechanism unnecessarily. From the part of your code _where a property is set_, it may not be clear that a handler will be called. This could cause unexpected side effects, or 'magic' that's difficult to unravel for other developers later on.
>
> Where possible, consider using change events (see above) to communicate state changes, or use methods to get and set data. Only use observers where side effects _are expected_ and _well documented_ — for example, built-in renderers use observers to handle property changes of UI components and update or re-render on-screen elements when needed, which is clearly an 'expected' side effect.

To start observing a property, call the {@link Observer.observeProperty observeProperty()} or {@link Observer.observePropertyAsync observePropertyAsync()} methods. Since you'll likely want to start observing properties as soon as the observer starts, you can add these calls to your implementation of the `observe(...)` method — refer to the example below.

- {@link Observer.observeProperty}
- {@link Observer.observePropertyAsync}

Once a property is observed, the observer's {@link Observer.handlePropertyChange handlePropertyChange()} method is called whenever the property is set, _or_ when a managed object referenced by the property emits a change event. By default, this method calls a specific handler method for each property change, using the property name (e.g. `onNameChange()` for a `name` property). You can override the {@link Observer.handlePropertyChange handlePropertyChange} method to handle property changes in a different way, or implement a handler method for each property change.

{@import :observer-properties}

## Handling view events {#view-events}

In practice, the most common source of events in a front-end application are view objects: UI components and other view instances emit events when the user interacts with them.

When a view is _attached_ to an activity or view composite, these events are handled by a single method. By default, this method tries to find a specific handler method for each event using the event name (e.g. `onButtonClick()` for a `ButtonClick` event). You can override this method to handle events in a different way, or implement a handler method for each event.

- {@link Activity.delegateViewEvent}

To declare **types** of events that are emitted by a view object, you can use the {@link ViewEvent} type. This type is based on the {@link ManagedEvent} class, but narrows down the `source` property to a specific {@link View} type (refer to the example code below).

- {@link ViewEvent +}

> **Note:** In an event handler, you can access the rendered output element (e.g. the DOM element) of a UI component using the {@link UIComponent.lastRenderOutput} property, if needed.

Since views are typically defined using `ui` methods or JSX tags, which allow you to _alias_ events (e.g. `onClick: "Foo"`), adding event handlers to an activity or view composite class is as simple as adding a handler method with the appropriate name (like `onFoo()`).

{@import :view-events}

In the case of view composites, if the handler does not return true or if a handler doesn't exist, the event is also _delegated_ to the parent object (see next section).

## Handling delegated view events {#delegate-view-events}

There are a few situations where being able to find the emitting view object using the event `source` property may not be enough — notably when the view is contained by another view object (or composite) that's important to understanding the source of the event.

- For events that are emitted by a view object **within a list** (i.e. a {@link UIListView} instance), handling the event often requires access to the list item object (or value) that's associated with the view object.
- For events that are emitted from **within a form**, access to the form context object (i.e. {@link UIFormContext} instance) is often useful.
- For events that are emitted from **within a view composite**, and not handled by the composite itself, access to the composite object allows for retrieving view composite properties or its associated view model.

In these cases, the event is _delegated_ by the containing view object or composite — emitting a **new** event object, that references both the containing view and the original event object. The new object has its {@link ManagedEvent.delegate delegate} property set to the containing view object, and the {@link ManagedEvent.inner inner} property set to the original event object.

You can use the {@link DelegatedEvent} generic type to describe such events. For events that are emitted from within a list, you can use the more specific {@link UIListView.ItemEvent} type.

- {@link DelegatedEvent +}
- {@link UIListView.ItemEvent}

The following example shows how to handle an event that's emitted from within a list.

{@import :view-delegate}

## Further reading {#further-reading}

For more information on views, UI components, view composites, and list views, see the following topic:

- {@link views}

For more information on data structures, which are often used together with events, see the following topic:

- {@link data-structures}
