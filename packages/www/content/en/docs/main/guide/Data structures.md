---
title: Data structures
abstract: Learn how to design data models using managed lists and records
breadcrumb_name: Guide
nav_parent: using
sort: -19
applies_to:
  - ManagedObject
  - ManagedRecord
  - ManagedList
---

## Designing models using managed records {#records}

To take full advantage of the features included in Desk, such as bindings, event handling, and UI list views, it's best to use Desk classes to represent your data models as well.

The core class that powers these features is {@link ManagedObject}. Refer to the following guide to learn more about this class.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Fundamentals"}}-->

However, to make modeling data even easier, Desk also includes a {@link ManagedRecord} class — which is optimized for use as part of data structures that include 'managed' lists.

- {@ref ManagedRecord}

You can use this class as the base class of your data models, using the `extends` keyword.

```ts
class MyModel extends ManagedRecord {
	// ...
}
```

The {@link ManagedRecord} class enables the following features:

- Emitting events, which can be handled by activities, services, or other Desk objects
- Binding property values, e.g. from data models directly to the UI (view)
- Managing and navigating the application hierarchy, using attached objects — notably being able to find 'parent' records in composition relationships
- Retrieving previous and next list items, from a record that's attached to a list.

Refer to the documentation for the following methods to learn more.

- {@ref ManagedRecord.getParentRecord}
- {@ref ManagedRecord.getNextSibling}
- {@ref ManagedRecord.getPreviousSibling}

## Creating managed records {#create}

To create objects that derive from {@link ManagedRecord}, you can of course use the `new` keyword to invoke the record's constructor.

```ts
let myRecord = new MyModel();
```

In addition, the {@link ManagedRecord} class contains a **static** method to create a new instance. This method calls the class constructor, and immediately copies the specified properties to the new instance.

- {@ref ManagedRecord.create}

This method can be used on subclasses as well as on the base class ({@link ManagedRecord}) — which results in an object typed as {@link ManagedRecord} _with_ the specified properties. Use this method to create managed records with few properties, without needing to declare a class.

```ts
let myRecord = ManagedRecord.create({ foo: "bar", num: 1 });
myRecord.foo; // "bar"
```

When using the {@link ManagedRecord.create()} method on subclasses, ensure that the constructor can be called without parameters. Often, all properties on a record are optional or initialized with a default value.

```ts
class Customer extends ManagedRecord {
	name?: string;
	balance = 0;
}

let myCustomer = Customer.create({ name: "Foo Co." });
```

## Using managed lists to store sequential records {#lists}

Arrays in JavaScript have a few 'dangerous' features that make them unsuitable to be used as the only way of storing lists of data in a UI framework.

- Array elements are not type-checked,
- Arrays may contain duplicates,
- Arrays may contain gaps (setting `a[100]` on a new array `a` will not initialize elements 0–99).

Therefore, Desk includes its own data structure for lists, called {@link ManagedList}. Managed lists can only contain managed objects (which can be further restricted), can't contain duplicates or gaps, can be observed, and they also work well with bindings and events.

- {@ref ManagedList}

Use the {@link ManagedList} constructor to create a new list. After that, use its methods to add, remove, or change the objects in the list. Instead of a `length` property, managed lists provide the number of objects in the list as {@link ManagedList.count count}.

```ts
let a = ManagedRecord.create({ foo: "a" });
let b = ManagedRecord.create({ foo: "b" });
let myList = new ManagedList(a, b);
myList.remove(b);
myList.count; // 1
```

You can also directly iterate over all objects in a list using the `for...of` syntax.

```ts
for (let record of myList) {
	// ...
}
```

Refer to the documentation for the {@link ManagedList} class for a full list of methods available.

Note that the {@link ManagedList.restrict()} method not only restricts the type of objects allowed to be added to the list at runtime, but also narrows the resulting type in TypeScript. This can be useful to define list properties or variables without having to use generic types.

```ts
class Customer extends ManagedRecord {
	// ...

	readonly contacts = new ManagedList().restrict(Contact);
	//       ^: ManagedList<Contact>
}
```

## Nesting records and lists {#nested}

The {@link ManagedRecord} and {@link ManagedList} classes are both subclasses of {@link ManagedObject}.

This allows instances of each class to be attached to each other (see below), and it allows lists to be stored as part of _other_ lists.

<!-- TODO: add an example back (removed example with map) -->

## Attaching objects in managed lists {#attach}

For the most part, attaching objects using the {@link ManagedObject} methods conveys an _ownership_ relationship — since each object can only be attached to one parent (owner) object, and the object is unlinked immediately when its parent object is unlinked.

To be able to attach multiple objects to one parent object (e.g. a managed record) conveniently, managed lists include a feature to attach objects automatically. Each object in the list is immediately attach _to the list itself_ — which means that they're also indirectly attached to the parent (owner) of the list.

This is best explained with an example that relates to UI containers:

- The {@link UIContainer} class (base class of UI containers such as rows and columns) contains a read-only `content` property, which references a managed list.
- The content list is _attached_ to the {@link UIContainer}.
- The content list is set to automatically attach all objects to itself.
- When adding content, each view object is _attached_ to the content list.
- Therefore, any bindings on view objects are able to bind to properties of the {@link UIContainer} object and _its_ attached parent objects.
- When the {@link UIContainer} is unlinked, so is the content list, and therefore all of the objects within the list.

Refer to the documentation of {@link ManagedList.autoAttach()} for details.

- {@ref ManagedList.autoAttach}

This pattern is not just reserved for UI components and views, but can also be used for data models. In the case of managed records, attaching a record to a list allows its {@link ManagedRecord.getParentRecord getParentRecord()}, {@link ManagedRecord.getNextSibling getNextSibling()}, and {@link ManagedRecord.getPreviousSibling getPreviousSibling()} to find related records.

```ts
class Customer extends ManagedRecord {
	// ...
	readonly contacts = this.attach(
		new ManagedList().restrict(Contact).autoAttach(true),
	);
}

let myCustomer = new Customer();
let contact1 = new Contact();
let contact2 = new Contact();
myCustomer.contacts.add(contact1, contact2);

contact1.getParentRecord(); // myCustomer
contact1.getNextSibling(); // contact2
```

## Propagating events from records to lists {#propagate}

Attaching objects to managed lists not only conveys ownership, but also allows lists to handle and **propagate** events from each object it contains.

By default, event propagation is enabled along with auto-attachment using the {@link ManagedList.autoAttach autoAttach()} method. To _disable_ event propagation, set the second parameter of this method to false.

After enabling auto-attachment and event propagating, _all events_ emitted on objects in the list are re-emitted by the list itself — propagating the event from the object to the list, allowing it to be handled by the object that contains it.

#### Example

This mechanism can be combined with handling change events that are emitted by the managed list itself, as objects are added, remove, or replaced. As such, a handler would be invoked for each change _to_ the list as well as _within_ the list.

```ts
class Customer extends ManagedRecord {
	// ...
	readonly contacts = this.attach(
		new ManagedList().restrict(Contact).autoAttach(true),
		(list, changeEvent) => {
			// ... handle a change to OR within the list
			// (use changeEvent.source to find the object)
		},
	);
}

let myCustomer = new Customer();
let contact = new Contact();
myCustomer.contacts.add(contact); // handled
contact.emitChange(); // handled
```
