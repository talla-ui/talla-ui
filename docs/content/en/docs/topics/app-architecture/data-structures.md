---
folder: topics
abstract: Use managed lists and records to model hierarchical data in your application.
---

# Data structures

#### Summary

- In a Desk application, data can be modeled using _managed records_ and _managed lists_.
- Using these classes has several advantages over plain JavaScript objects and arrays, including enforcing consistency, and being able to _bind_ to them from your view.
- Managed records are used to model individual records in a data set, with support for relationships between records within a hierarchy.
- Managed lists contain an _ordered set_ of managed objects, such as managed records or other lists.

## Overview <!--{#overview}-->

An important aspect of an application's architecture is its **data model**. With solutions ranging from a simple array to a complex distributed database, the data model determines how data is stored, accessed, and manipulated.

Desk offers a set of data structures that can be used to model data hierarchically, building on the features of {@link objects managed objects}, attachment, bindings, and events — allowing data to be reflected seamlessly in the UI.

> **Note:** The data structures provided by Desk are not meant to replace regular JavaScript patterns completely, and using them is _not mandatory_. You can continue to use your own data model or use a third-party library, however in this case you may need to trigger UI updates using a separate view model or by manually re-assigning activity or view composite properties.

## Using managed records <!--{#records}-->

The {@link ManagedRecord} class is a simple extension of the {@link ManagedObject} class, intended to be used for modeling individual records in a data set.

- {@link ManagedRecord +}

**Creating a managed record** — You can create a managed record by extending the `ManagedRecord` class, adding your own properties and methods. Properties must be assigned an **initial value** explicitly in the class definition (or the constructor) to ensure that they can be bound.

To create an instance, use the `new` method, or use the static {@link ManagedRecord.create create} method that's unique to the {@link ManagedRecord} class. This method first calls the constructor without parameters, and then copies the provided properties to the new instance.

- {@link ManagedRecord.create}

```ts
// {@sample :record}
```

**Adding record relationships** — The {@link ManagedRecord} class provides basic support for maintaining relationships between records, building on the features of {@link ManagedObject}.

- Use the {@link ManagedObject.attach attach()} and {@link ManagedObject.autoAttach autoAttach()} methods to attach records to other records, making them 'child' records. Each record can only be attached to one parent record at a time.
- Use the {@link ManagedRecord.getParentRecord getParentRecord()} method to find the parent record (of a particular type) of a record — even if the record itself is not directly attached to the parent record.
- The {@link ManagedRecord.getNextSibling getNextSibling()} and {@link ManagedRecord.getPreviousSibling getPreviousSibling()} methods can be used to find the next or previous records in a list (see below).

Records can be unlinked using the {@link ManagedObject.unlink unlink()} method — which also unlinks all of their attached records, and clears any `autoAttach` property that _refers to_ the unlinked record(s).

- {@link ManagedRecord.getParentRecord}
- {@link ManagedRecord.getNextSibling}
- {@link ManagedRecord.getPreviousSibling}

> **Note:** Record attachment can be used to model hierarchical data, with composition relationships, i.e. 'has-a', 'part-of', 'contains', one-to-one and one-to-many relationships. Other relationships can be modeled using regular properties or (unattached) managed lists.

## Using managed lists <!--{#lists}-->

The Desk framework provides the {@link ManagedList} class to model a list of records, as an alternative to using plain JavaScript arrays or sets. Managed lists have several advantages over plain arrays:

- A managed list (i.e. instance of `ManagedList`) contains an _ordered set_ of managed objects — each object can only be added to the list **once**.
- A managed list can be restricted to only contain objects of a specific type.
- A managed list that's attached to a parent object, automatically attaches all of the contained objects as well.
- When an attached managed list is unlinked, all of the attached objects are unlinked as well.
- When an object is unlinked, it is automatically removed from the managed list
- A managed list automatically _propagates_ events from attached objects (re-emitting them on the list itself), making it easier to listen for events on all objects at the same time.

Managed lists are not restricted to records, and can contain any type of managed object (including managed lists themselves). Objects can be added, removed, replaced, and reversed, and the `ManagedList` class provides methods to find, filter, and iterate over the objects in the list. Refer to the documentation for this class to learn more.

- {@link ManagedList +}

Specifically for modeling data structures, lists are useful in several scenarios (especially when attached).

### Representing a catalog

A list of records can be used to represent a catalog of items, with each item being a record in the list. In some cases, all of your data could fit in the list, but in some cases you can use a list to represent a view, query result, or _subset_ of the catalog, with only a few items loaded at a time.

This use of lists is best encapsulated in a service, to hide the implementation details from the rest of the application.

```ts
// {@sample :list-catalog}
```

### Using a subrecord list

As part of a record, a managed list can be used to represent a list of subrecords. In this case, data may be duplicated (denormalized) across records as a trade-off for performance, or to ensure that the data is consistent at a particular point in time.

```ts
// {@sample :list-subrecords}
```

### Creating a view model

A managed list can be used to represent a view model, which is a subset of the data that's presented in the UI. The view model can be used to filter, sort, and paginate the data, and to provide a consistent interface to the UI.

This is where the use of managed lists and records is most beneficial, as the view model can be updated in response to changes in the data, which in turn triggers a view update using bindings. Only UI elements that are bound to the view model's properties need to be updated, and once records are removed from the list, bindings are automatically removed.

```ts
// {@sample :view-model}
```

## Further reading <!--{#further-reading}-->

Learn more about managed objects, events, and property bindings in the following articles:

- {@link objects}
- {@link event-handling}
- {@link bindings}

Learn more about internationalization, localization, and formatting features, which can also be used as part of your data model:

- {@link internationalization}
- {@link text-formatting}

Learn more about list views:

- {@link list-views}
