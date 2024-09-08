---
folder: topics
abstract: Learn about events, event handling, and observers to watch for property changes.
---

# Event handling

#### Summary

- Events are used to communicate between managed objects.
- Events are _emitted_ by {@link objects managed objects}, and can be handled by _listeners_, _observers_, or _attached_ parent objects. Observers can also be used to handle property changes.
- _Change events_ are used to signal that an object has changed state in some way.
- _View events_ are emitted by UI components and can be _delegated_ or handled by activity or view composite classes.

## Overview <!--{#overview}-->

In a Desk app, events are used to communicate between different {@link objects managed objects}. Once an object **emits** an event, it can be handled either by a listener function (callback), an observer (see below), or an attached parent object.

**Why?** — Events allow for a _loosely coupled_ architecture, where objects can communicate without needing to know about each other's implementation details. This makes it easier to maintain and extend the application, and to test individual parts in isolation.

**Implementation** — Events are represented by `ManagedEvent` objects, created by the emitting `ManagedObject` object. The event object contains information about the event, such as the event name, the emitting object, and any additional data.

- {@link ManagedEvent +}

Event names are case-sensitive, and _should_ start with a capital letter — e.g. `Click` and `ButtonClick`, not `click` or `button-click`. This makes it possible to distinguish handler methods with an event name (e.g. `onButtonClick`), which are used in activity classes and composite views.

## Emitting events <!--{#emit}-->

To emit an event, use the {@link ManagedObject.emit()} method. This method can be used in two ways:

- Emitting an event using an instance of {@link ManagedEvent}.
- Emitting an event using just the event name and additional data.

For more information, refer to the documentation of this method.

- {@link ManagedObject.emit}

```ts
// {@sample :emit}
```

## Emitting change events <!--{#change}-->

In general, events can be used for many different purposes, e.g. to delegate user interaction from individual UI components to an activity. Commonly, events are also used to signal that the source object has _changed state_, e.g. a data model that was updated, or a service that has connected to its backend.

**Change events** simply include a `change` property on their data object (i.e. {@link ManagedEvent.data}) that references the managed object that has changed. The inclusion of this property enables some additional features:

- Change events are handled by property observers and attached parent listeners — see below.
- Change events on {@link bindings bound} objects will trigger an update of any bound (nested) property value.

This means that emitting a change event is roughly handled in the same way as assigning a new object to the property that references the changed object. For example:

```ts
let newPayment = new Payment();
cart.payment = newPayment;
// ... behaves roughly the same as:

let oldPayment = cart.payment;
// (do something with oldPayment)
oldPayment.emitChange();
```

You can use the {@link ManagedObject.emitChange()} method to emit a change event. A single parameter can be used to specify the event name; otherwise the event will be named `Change`.

- {@link ManagedObject.emitChange}

```ts
// {@sample :emitChange}
```

> **Note:** While the {@link ManagedObject.emitChange emitChange()} method is public, most commonly you'll emit change events from within methods of the managed object itself, after modifying its internal state — in line with the basic principles of object-oriented programming.

## Handling events using listeners <!--{#listen}-->

Listeners provide the simplest mechanism for handling events. A listener adds a callback function that's invoked whenever _any_ event is emitted by the target object. The listener stops automatically when the target object is unlinked, but is otherwise never removed.

- {@link ManagedObject.listen}

```ts
// {@sample :listen}
```

> **Note:** Since listeners can't be removed, don't add a listener to an object that's intended to 'outlive' the listener. For example, from the {@link Activity.ready()} method, don't add a listener to an object that stays around during the entire lifetime of the application. That may end up adding multiple listeners, creating a memory leak. In that case, use a (service) observer, or find a way to attach the target object to the activity. See below for better ways to handle events.

## Async event streams <!--{#listen-async}-->

Rather than using a callback function, you can also use an _async iterable_ to listen for events. This allows for a 'loop'-like syntax, and ensures that each event is handled in sequence, even if the event is emitted while the listener is still processing a previous event.

```ts
// {@sample :listen-async}
```

A useful side effect of this pattern is that you can use the `for await` syntax to wait for a managed object to be unlinked, as in the following example.

```ts
// {@sample :listen-async-unlink}
```

## Handling change events from attached objects <!--{#change-attach}-->

With an architecture that's based on _composition_, parent objects are often most interested in changes to attached objects — for example, to keep their own internal state up to date.

You can simply provide a callback (or an {@link Observer} instance, see below) to the {@link ManagedObject.attach attach()} or {@link ManagedObject.autoAttach autoAttach()} methods to listen for change events from to-be attached objects.

Note that this mechanism only works for change events, not for other events.

```ts
// {@sample :attach-callback}
```

## Handling change events from services <!--{#service-events}-->

Shared functionality and data is commonly encapsulated in a **service**, accessible by name (e.g. `Auth` or `Settings`) using the {@link ServiceContext service context}. Refer to the documentation for {@link services} to learn more.

Services can be _observed_ by activities and other services. A callback function (or an {@link Observer} instance, see below) can be used to listen for change events that are emitted by a service, along with service registration, replacement, and unlinking, when provided to the `observeService()` method.

A callback only listens for change events, not for other events.

```ts
// {@sample :service-callback}
```

## Observers <!--{#observers}-->

The Desk framework provides an even more powerful mechanism for handling events, in the form of _observers_. These can be used to handle _all_ events, as well as property changes, and attachment changes (i.e. attaching or unlinking) of a managed object.

Observers are defined as classes, which are instantiated to observe a single object at a time.

To create an observer, write a subclass of the {@link Observer} class, and override its methods or add your own. Then, create an instance and use the {@link Observer.observe observe()} method to start observing a target object.

- {@link Observer +}
- {@link Observer.observe}

```ts
// {@sample :observer}
```

Note that while an observer only observes one object at a time, the lifecycle of an observer instance extends beyond that of the target object. A single observer can be used to observe multiple objects _after_ one another.

Once a target object is unlinked, the observer stops automatically. You can also stop the observer manually using the {@link Observer.stop stop()} method, or call {@link Observer.observe observe()} again to stop observing one object and start observing a new one.

- {@link Observer.stop}

## Handling events using observers <!--{#observers-events}-->

Once the observer has started observing a target object, its {@link Observer.handleEvent handleEvent()} method is called for every event emitted by the target object.

- {@link Observer.handleEvent}

By default, this method tries to find a specific method for each event using its name (e.g. `onConnected()` for a `Connected` event). You can also override this method to handle events in a different way.

```ts
// {@sample :observer-events}
```

You can pass an observer instance to the {@link ManagedObject.attach()} or {@link ManagedObject.autoAttach()} methods to observe attached objects. In the case of `autoAttach`, the observer is started and stopped automatically when a new object is attached or detached.

```ts
// {@sample :observer-attach}
```

In addition, observers can be used to handle unlinking, and attachment changes (i.e. moving the observed object to a different attached parent). Use the following methods to handle these events:

- {@link Observer.handleUnlink}
- {@link Observer.handleAttachedChange}

## Handling property changes using observers <!--{#observers-properties}-->

With the help of an {@link Observer} instance, you can also handle _property changes_ of a managed object. Under the hood, this adds a property _getter_ and _setter_ for each observed property, the same way bindings are implemented. This allows the observer to intercept changes.

> **Observed properties and maintainability**
>
> Although being able to observe any property directly seems like a powerful and convenient feature, it's best not to rely on this mechanism unnecessarily. From the part of your code _where a property is set_, it may not be clear that a handler will be called. This could cause unexpected side effects, or 'magic' that's difficult to unravel for other developers later on.
>
> Where possible, consider using change events (see above) to communicate state changes, or use methods to get and set data. Only use observers where side effects _are expected_ and _well documented_ — for example, built-in renderers use observers to handle property changes of UI components and update or re-render on-screen elements when needed, which is clearly an 'expected' side effect.

To start observing a property, call the {@link Observer.observeProperty observeProperty()} or {@link Observer.observePropertyAsync observePropertyAsync()} methods. Since you'll likely want to start observing properties as soon as the observer starts, you can add these calls to your implementation of the `observe(...)` method — refer to the example below.

- {@link Observer.observeProperty}
- {@link Observer.observePropertyAsync}

Once a property is observed, the observer's {@link Observer.handlePropertyChange handlePropertyChange()} method is called whenever the property is set, _or_ when a managed object referenced by the property emits a change event. By default, this method calls a specific handler method for each property change, using the property name (e.g. `onNameChange()` for a `name` property). You can override the {@link Observer.handlePropertyChange handlePropertyChange} method to handle property changes in a different way, or implement a handler method for each property change.

```ts
// {@sample :observer-properties}
```

## Handling view events <!--{#view-events}-->

Besides change events, the most common use of events in a front-end application is to signal user interaction: UI components and other view instances emit events when the user interacts with them.

When a view is (indirectly) _attached_ to an activity or view composite, these events can be handled using specially named methods. To add a handler for a `EscapeKeyPress` event for example, you can add a method named `onEscapeKeyPress()` to the activity or view composite class. This method will be called with a single parameter, being the event that was emitted by the view. The event can be typed as a {@link ViewEvent}, which narrows the `source` property down to a {@link View} object.

- {@link ViewEvent +}

Since views are typically defined using `ui` methods or JSX tags, which allow you to _alias_ events (e.g. `onClick: "SelectContact"` or `onclick="SelectContact"`), adding event handlers to an activity or view composite class is as simple as adding a handler method with the appropriate name (like `onSelectContact()`).

```ts
// {@sample :view-events}
```

> **Note:** In an event handler, you can access the rendered output element (e.g. the DOM element) of a UI component using the {@link UIComponent.lastRenderOutput} property, if needed.

**Event delegation** — After handling an event, the event will be re-emitted from the activity. Or rather, a _new_ event instance will be emitted, with the same `name`, `source`, and `data` properties, but with an additional `delegate` (referring to the delegating object). The original event is stored in the `inner` property.

You can stop this behavior by returning `true` from the event handler method, or by overriding {@link Activity.delegateViewEvent} (or {@link ViewComposite.delegateViewEvent}) to handle events differently altogether.

## Handling delegated view events <!--{#delegate-view-events}-->

Some built-in view objects also emit delegated events. This allows handlers to access the containing object and its properties.

- For events that are emitted by a view object **within a list** (i.e. a {@link UIListView} instance), handling the event often requires access to the specific list item object (or value).
- For events that are emitted from **within a view composite**, and not handled by the composite itself, access to the composite object allows for retrieving view composite properties or its associated view model.

In these cases, just like for activities, the new event object has its {@link ManagedEvent.delegate delegate} property set to the re-emitting (view) object, and the {@link ManagedEvent.inner inner} property set to the original event object.

The following example shows how to handle an event that's emitted from within a list.

```ts
// {@sample :view-delegate}
```

## Further reading <!--{#further-reading}-->

For more information on views, UI components, view composites, and list views, see the following topic:

- {@link views}

For more information on data structures, which are often used together with events, see the following topic:

- {@link data-structures}
