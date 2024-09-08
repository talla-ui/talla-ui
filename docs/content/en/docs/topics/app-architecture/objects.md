---
folder: topics
abstract: Understand how the ManagedObject class provides a common foundation for all parts of a Desk application.
---

# Objects

#### Summary

- The Desk framework uses an object-oriented approach, with the `ManagedObject` class at its core.
- This class manages relationships between objects, enabling _event handling_ and _property bindings_.
- Objects are _attached_ to form a tree structure or hierarchy for the entire application. When no longer needed, objects can be _unlinked_ to clean up event handlers and bindings.

## Object orientation <!--{#oo}-->

Desk apps are **object-oriented**, and rely on **composition** to define a tree structure at runtime, i.e. a strict **hierarchy** of objects.

> **Note:** This documentation assumes you're familiar with the basics of object-oriented programming in JavaScript. If you're not, you may want to read up on the topic before proceeding.
>
> - Classes and objects (instances)
> - Properties and methods
> - Inheritance using modern JavaScript syntax (extends, super)

To communicate between objects, you can use standard JavaScript properties and methods — but the framework also provides features to **attach** component objects to 'parent' or containing objects. For example, a view object is _attached_ to an activity. This enables the following special features:

- **Property bindings** automatically observe and copy property data from a parent object to a contained object (one-way only, e.g. to update views when the activity is updated).
- Objects emit **events** that can be handled by containing objects (the other way, e.g. to handle user input).
- Objects can be **unlinked** from the hierarchy when they're no longer needed. This automatically clears event handlers and bindings, and unlinks further contained objects.

## Managed objects <!--{#managed-object}-->

To enable this functionality, most of the classes provided by the Desk framework extend the `ManagedObject` class. This class serves as the primary building block for the Desk application hierarchy: it manages attach objects, binds data between them, and emits events.

- {@link ManagedObject +}

> **Note:** The `ManagedObject` primarily 'manages' references between objects (hence the name), ensuring that properties and events can be observed without memory leaks. By sticking with a strict hierarchy of attached managed objects, Desk introduces a concept of **ownership** — avoiding many of the pitfalls of traditional JavaScript programming surrounding closures and event handlers.

Most of the time you won't need to deal with the `ManagedObject` class itself. For example, to define an **activity**, you'll need to extend the {@link Activity} class. However, this class is itself a subclass of `ManagedObject`, and provides all of its features.

For example, the {@link Activity} class comes with a `view` property that _attaches view objects automatically_.

```ts
class MyActivity extends Activity {
	// ...
	protected ready() {
		this.view = new MyView(); // MyView instance is attached here
		app.showPage(this.view);
	}
}
```

With just this code, property bindings and event handlers are added _and_ cleaned up automatically, as the activity and view are attached and/or unlinked.

Similarly, **views** defined using JSX syntax and/or `ui` methods construct (and attach) an entire object hierarchy in one go when they're instantiated:

```ts
// Here, MyView is a class that extends UICell
const MyView = ui.cell(
	{ padding: 16 },
	// for each object, a UILabel object is attached automatically:
	ui.label("Hello World"),
);
```

Even the {@link app} object itself is a managed object. This object is created immediately when the app starts, and can be used from anywhere in your code. Several other managed objects are attached during runtime.

```ts
// add an activity (this attaches an object)
app.addActivity(new MyActivity(), true);

// show a dialog
let result = await app.showConfirmationDialogAsync("Are you sure?");
```

> ⏩ **Shortcut**︎
>
> If you're in a hurry, you can skip the rest of this article and learn more about the rest of the framework. Come back here once you're ready to learn more — knowing how managed objects work will help you to build more complex applications.
>
> For a practical approach, check out the {@link examples}, or learn about {@link activities} and {@link views}.

## Attaching objects <!--{#attach}-->

On your own managed objects, you can also attach your other managed objects to build out the application hierarchy beyond activities and views — for example, to incorporate relational data or complex view models.

- Objects can be attached ad-hoc using the {@link ManagedObject.attach attach()} method, allowing you to assign relationships between objects dynamically. (Naturally, objects can only be attached to a single parent object at a time)
- Objects can also be attached by referencing them from specific properties. In this case, a property to be watched is set up using the {@link ManagedObject.autoAttach autoAttach()} method. Any object assigned to such a property is automatically attached to the parent object. When the referenced object is unlinked, the property is set to undefined.
- For both methods, an observer or callback function can be provided to listen for events or changes on attached objects.
- When an object is no longer needed, it can be unlinked manually using the {@link ManagedObject.unlink unlink()} method. This method unlinks the object from its parent, and also unlinks all of its own attached objects.

After an object is unlinked (see below) it can no longer be attached to another parent object. Unlinked objects also can't emit any events, be observed, or have their properties bound to other objects.

- {@link ManagedObject.attach}
- {@link ManagedObject.autoAttach}
- {@link ManagedObject.unlink}
- {@link ManagedObject.isUnlinked}

To get a reference to the containing (attached parent) object, or the _closest_ containing object of a specific type, you can use the **static** {@link ManagedObject.whence whence()} method that's available on the `ManagedObject` class and all subclasses.

- {@link ManagedObject.whence}

```ts
class MyObject extends ManagedObject {
	// ...
	readonly other = this.attach(new OtherObject());
}

let someObject = new MyObject();
MyObject.whence(someObject.other); // => someObject

// attached objects are unlinked automatically:
someObject.unlink();
someObject.other.isUnlinked(); // => true
```

> **Why should I need to "unlink" a managed object?**
>
> Unlinking managed objects is not always necessary. JavaScript is a garbage-collected language, so objects that are no longer referenced by _any_ other object or active closure are automatically removed from memory anyway.
>
> However, unlinking an object is still a good idea if the object had any event listeners or bindings added to it during its lifetime. Unlinking the object explicitly removes such references, and breaks up any circular references that may otherwise prevent the object from being garbage-collected.

## Handling unlinked objects <!--{#handling-unlinked}-->

When writing a managed object class, you may want to perform some cleanup when the object is unlinked. The {@link ManagedObject} class allows you to override the {@link ManagedObject.beforeUnlink beforeUnlink()} method for an opportunity to perform such cleanup.

```ts
class MyObject extends ManagedObject {
	// Called just before the object is unlinked:
	protected beforeUnlink() {
		// ... cleanup code goes here
	}
}
```

On the other hand, after attaching another object, you may want to run some code when the _attached_ object is unlinked. Both the {@link ManagedObject.attach attach()} and {@link ManagedObject.autoAttach autoAttach()} methods accept an optional callback function (or {@link Observer} class) that's invoked when the attached object emits an event **and** when the object is unlinked.

```ts
class ParentObject extends ManagedObject {
	readonly target = this.attach(new MyObject(), (target, event) => {
		if (!target) {
			// ...handle the attached object being unlinked
		} else if (event && event.name === "Change") {
			// ...handle change event from the attached object
		}
	});
}
```

Both callbacks are invoked when the attached object is unlinked explicitly, using the {@link ManagedObject.unlink unlink()} method on the object itself **or** one of its 'parent' containing objects. Note that the callbacks are not invoked when the object is garbage-collected by the JavaScript runtime engine.

## Attaching objects using managed lists <!--{#attach-lists}-->

If you need to keep track of _multiple_ managed objects in a list, you could of course use a regular array or JavaScript `Set`. However, Desk provides a special {@link ManagedList} class that's designed to work with managed objects in a more efficient way.

A managed list (i.e. `ManagedList` instance) contains an _ordered set_ of managed objects. A managed list that's attached to a parent object, automatically attaches all of the objects _contained_ in the list as well, and propagates their events.

```ts
class CustomerOrders extends ManagedObject {
	readonly orders = this.attach(
		new ManagedList().restrict(Order),
		(target, event) => {
			// ... handle changes on this list AND its objects
		},
	);
}
```

Refer to the following article for more information.

- {@link data-structures}

## Application architecture

The {@link ManagedObject} class provides a common foundation for all parts of a Desk application, including activities, views, services, and other objects. Using the features of this class, the application is built up as a tree of objects, with each object managing its own state and relationships.

At the root level of this tree structure is the {@link app} object, which is created immediately when the application starts. This object manages all activities and services, and also references several objects that provide global functionality.

- {@link app +}
- {@link GlobalContext +}

As the root object, the global application content provides ways to add {@link activities}, {@link services}, render {@link views} manually, change {@link themes} and {@link icons}, handle {@link internationalization}, {@link errors-logging errors and logging}, {@link navigation}, {@link message-dialogs message dialogs}, and {@link animation}. Read more about these features in the respective sections of this documentation.

## Further reading <!--{#further-reading}-->

Learn more about event handling, property bindings, and data structures in the following articles:

- {@link event-handling}
- {@link bindings}
- {@link data-structures}
