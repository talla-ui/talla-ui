---
title: "Fundamentals: managed objects"
abstract: Understand how 'managed' objects work together at the core of your application
breadcrumb_name: Guide
nav_parent: using
sort: -20
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
  - Binding
  - StringFormatBinding
  - bound
  - Observer
---

## Overview

As a front-end application framework, the main purpose of Desk is to _abstract away_ many of the disjointed and complicated parts of running an app, presenting the user interface, and handling user input.

Instead of using a variety of platform-level APIs, you'll end up using the abstractions included in the Desk framework. This _should_ be a better experience, because all of these abstractions were designed together, based on the same core foundation.

In a Desk application, the foundation is provided by the {@link ManagedObject} class, with its methods for building larger structures of objects, as well as for working with events and bindings.

- {@ref ManagedObject}

This guide explores how managed objects work, and how they provide a foundation for other Desk framework constructs.

## Attaching objects {#attach}

Using JavaScript, you can easily reference one object from another object, 'linking' them together:

```js
let a = { one: "object" };
let b = { another: 1 };
a.someProperty = b;
```

This way, you can build up large structures of objects, all referencing each other if needed. You can also store sets of objects in arrays, and use those to connect one object to many others using a single property.

However, the simplicity of this pattern comes with some downsides:

- Properties and arrays aren't type checked — you can overwrite a reference to `b` with the number `2`, or add different types of objects to the same array. Arrays may also include gaps, with array indices that aren't set at all.
- From a referenced object, there's no way to go 'back' — you can't tell which object(s) link to a given object. This is relevant when you no longer need an object: JavaScript won't clear it from memory until it's no longer referenced by any property or variable that's still in use.

To alleviate these issues, the {@link ManagedObject} class includes a way to link objects together by explicitly **attaching** them. Instances of this class are called _managed_ objects because Desk 'manages' these objects' state and their relationships with other parts of your app.

- An object can only be attached to one object (its parent, or owner).
- You can find out to which parent an object is attached, if any.
- Multiple objects can be attached to a single parent, using properties, or as part of a managed list (see below).
- Attaching an object to another parent _detaches_ it from the first.
- After an object is no longer needed, you can **unlink** it: this also _recursively_ unlinks all attached objects automatically, and informs the parent object if needed.
- After unlinking, the object can no longer be attached, and other features such as events and bindings stop working.

This pattern has two main advantages for managing an application at runtime:

**Ownership** — While any object may _reference_ any other object, a {@link ManagedObject} only has one _attached_ parent (an object or a managed list). This makes it clear when objects are no longer needed, and should be cleaned up along with their parent(s) and/or other attached objects.

**Events and bindings** — Arranging objects in a simple parent-child hierarchy also allows for simple event handling, and _binding_ property values by dynamically observing parent properties — as well as cleaning up after event handlers and bindings when objects are detached or unlinked.

Use the following methods to attach and detach objects.

- {@ref ManagedObject.attach}
- {@ref ManagedObject.observeAttach}
- {@ref ManagedObject.unlink}

#### Example

Typically, attached objects are created at the same time as the parent object, and we can construct, assign, and attach all in one go.

```ts
class MyObject extends ManagedObject {
	// Create and attach another object
	readonly someObject = this.attach(new SomeObject());

	// ...
}
```

On the other hand, watched properties are usually not initialized right away, and the call to `observeAttach` is best placed in a constructor.

```ts
class MyObject extends ManagedObject {
	constructor() {
		super();
		this.observeAttach("someObject");
	}

	// This property is watched
	someObject?: SomeObject = undefined;
}
```

## Handling unlinked objects {#handling-unlinked}

After attaching an object, the parent (or owner) object can be notified when the attached object is unlinked.

You can use a callback function or an {@link Observer} class to listen for attachment changes.

#### Example

In the code below, an activity creates an instance of {@link DialogViewActivity} and uses a callback function to be notified when the activity is unlinked. Note that the activity must be attached to become part of the application (and for its view to be rendered); and the {@link DialogViewActivity} is unlinked to 'close' the dialog.

```ts
class MyActivity extends PageViewActivity {
	// ...

	async showMyDialog() {
		let dialog = new MyDialog();
		this.attach(dialog, (target) => {
			// ... unlinked if target is undefined
		});
		await dialog.activateAsync();
	}
}
```

## Attaching objects through managed lists {#attach-lists}

Rather than attaching objects one by one, you can also attach objects using _managed lists_ — that is, instances of {@link ManagedList}. This class has been specifically designed to contain {@link ManagedObject} instances, and they can be attached, too.

- After a list is attached to a {@link ManagedObject} (which includes any other list), all objects contained by it are attached to the list itself.
- Any objects that are added to the list afterwards, are also automatically attached to it.
- When an object is unlinked, it's removed from the list automatically.
- To prevent this behavior, you can use the {@link ManagedList.autoAttach autoAttach()} method.

Refer to the documentation below to learn more about managed lists.

- {@ref ManagedList}

## Understanding attached objects as part of an application {#attach-apps}

A running Desk application consists of different framework objects, mostly arranged in a single hierarchy using {@link ManagedObject}'s attachment features.

By enforcing strict ownership, the lifetime of event handlers and property bindings becomes linked to the state of the objects themselves — for example, when the user moves to another part of your application, views and/or activities are unlinked, and all references between objects are automatically removed.

- The {@link app} singleton object owns an _activation context_ object, i.e. an instance of {@link ActivationContext} (attached).
- The activation context contains a {@link ManagedList} that contains all of the current 'root' activities (i.e. instances of {@link Activity}, attached).
- Activities can be attached to other activities, through properties or other lists. By attaching activities (indirectly) to the {@link app} object, they're able to find the activation context (for routing) and renderer (to render their views, if any).
- Each {@link ViewActivity} object creates and unlinks its view automatically, from a static constructor, and then assigns the view instance to the {@link ViewActivity.view} property (attached).
- Views have different ways of containing other views. For example, {@link UIContainer} instances contain other views through the {@link UIContainer.content} list (attached).

Refer to the documentation for the following classes to learn more.

- {@ref GlobalContext}
- {@ref ActivationContext}
- {@ref Activity}
- {@ref ViewActivity}
- {@ref View}
- {@ref UIContainer}

## Events and bindings {#events-bindings}

The {@link ManagedObject} class also facilitates the use of events and bindings.

Typically, events are used to communicate user input and changes in state **to** parent objects. Bindings are used to communicate data **from** parent objects.

These features are commonly used to communicate between activities and views, but they can also be used with other managed objects, e.g. services, data models, and view composites.

To learn more about events and event handling, refer to the following guide.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Events observers"}}-->

To learn more about bindings, refer to the following guide.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Bindings"}}-->
