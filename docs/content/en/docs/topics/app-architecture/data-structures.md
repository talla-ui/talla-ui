---
title: Data structures
folder: topics
abstract: Use managed lists and records to model hierarchical data in your application.
---

# Data structures

> {@include abstract}

## Overview {#overview}

An important aspect of an application's architecture is its **data model**. With solutions ranging from a simple array to a complex distributed database, the data model determines how data is stored, accessed, and manipulated.

Desk offers a set of data structures that can be used to model data hierarchically, building on the features of {@link objects managed objects}, attachment, bindings, and events — allowing data to be reflected seamlessly in the UI.

> **Note:** The data structures provided by Desk are not meant to replace regular JavaScript patterns completely, and using them is _not mandatory_. You can continue to use your own data model or use a third-party library, however in this case you may need to trigger UI updates using a separate view model or by manually re-assigning activity properties.

## Using managed records {#records}

The {@link ManagedRecord} class is a simple extension of the {@link ManagedObject} class, intended to be used for modeling individual records in a data set.

- {@link ManagedRecord +}

**Creating a managed record** — You can create a managed record by extending the `ManagedRecord` class, adding your own properties and methods. Properties must be assigned an **initial value** explicitly in the class definition (or the constructor) to ensure that they can be bound.

To create an instance, use the `new` method, or use the static {@link ManagedRecord.create create} method that's unique to the {@link ManagedRecord} class. This method first calls the constructor without parameters, and then copies the provided properties to the new instance.

- {@link ManagedRecord.create}

```ts
class PersonRecord extends ManagedRecord {
	id?: string = undefined;
	name = "";
	// ...
}

let p1 = new PersonRecord();
let p2 = PersonRecord.create({ id: "123", name: "Alice" });
```

**Adding record relationships** — The {@link ManagedRecord} class provides basic support for maintaining relationships between records, building on the features of {@link ManagedObject}.

- Use the {@link ManagedObject.attach attach()} and {@link ManagedObject.autoAttach autoAttach()} methods to attach records to other records, making them 'child' records. Each record can only be attached to one parent record at a time.
- Use the {@link ManagedRecord.getParentRecord getParentRecord()} method to find the parent record (of a particular type) of a record — even if the record itself is not directly attached to the parent record.
- The {@link ManagedRecord.getNextSibling getNextSibling()} and {@link ManagedRecord.getPreviousSibling getPreviousSibling()} methods can be used to find the next or previous records in a list (see below).

Records can also be unlinked using the {@link ManagedObject.unlink unlink()} method — which also unlinks all of their attached records, and clears any `autoAttach` property that refers to the unlinked record(s).

- {@link ManagedRecord.getParentRecord}
- {@link ManagedRecord.getNextSibling}
- {@link ManagedRecord.getPreviousSibling}

> **Note:** Record attachment can be used to model hierarchical data, with composition relationships, i.e. 'has-a', 'part-of', 'contains', one-to-one and one-to-many relationships. Other relationships can be modeled using regular properties or (unattached) managed lists.

## Using managed lists {#lists}

The Desk framework provides the {@link ManagedList} class to model a list of records, as an alternative to using plain JavaScript arrays or sets. Managed lists have several advantages over plain arrays:

- A `ManagedList` contains an _ordered set_ of managed objects — each object can only be added to the list **once**.
- A `ManagedList` can be restricted to only contain objects of a specific type.
- A `ManagedList` that's attached to a parent object, automatically attaches all of the contained objects as well.
- When an attached `ManagedList` is unlinked, all of the attached objects are unlinked as well.
- When an object is unlinked, it is automatically removed from the `ManagedList`.
- A `ManagedList` automatically **propagates events** from attached objects, making it easier to listen for events on all objects at the same time.

Managed lists are not restricted to records, and can contain any type of managed object (including managed lists themselves). Objects can be added, removed, replaced, and reversed, and the `ManagedList` class provides methods to find, filter, and iterate over the objects in the list. Refer to the documentation for this class to learn more.

- {@link ManagedList +}

Specifically for modeling data structures, lists are useful in several scenarios.

### Representing a catalog

A list of records can be used to represent a catalog of all (loaded or available) items, with each item being a record in the list. In this case, the list corresponds to a single database table, with all items loaded at once.

If the catalog _could_ grow too large to be represented in-memory as full JavaScript objects, you may want to use an actual database (e.g. IndexedDB on the web, or a native database on mobile or desktop) to store and query items. In this case, a managed list could be used to represent a view, query result, or _subset_ of the catalog, with only a few items loaded at a time.

Either way, this use of lists is best encapsulated in a service, to hide the implementation details from the rest of the application.

```ts
class CatalogService extends Service {
	readonly id = "Catalog";

	findItemById(id: string) {
		// use `find()` or an internal index to find the item
	}

	// ...

	// catalog with all items loaded in memory
	private readonly _items = this.attach(new managedlist().restrict(itemrecord));
}
```

### Using a subrecord list

As part of a record, a managed list can be used to represent a list of subrecords. In this case, data may be duplicated (denormalized) across records as a trade-off for performance, or to ensure that the data is consistent at a particular point in time.

```ts
class OrderRecord extends ManagedRecord {
	id = "";

	// use a denormalized customer record:
	customer?: OrderCustomerRecord = undefined;

	// use an attached list of denormalized order items:
	readonly items = this.attach(new ManagedList().restrict(OrderItemRecord));
}
```

### Creating a view model

A managed list can be used to represent a view model, which is a subset of the data that's presented in the UI. The view model can be used to filter, sort, and paginate the data, and to provide a consistent interface to the UI.

This is where the use of managed lists and records is most beneficial, as the view model can be updated in response to changes in the data, which in turn triggers a view update using bindings. Only UI elements that are bound to the view model's properties need to be updated, and once records are removed from the list, bindings are automatically removed.

```tsx
class CustomerOrderViewModel extends ManagedObject {
	// keep track of visible orders, which can be bound in the view
	readonly list = new ManagedList().restrict(OrderRecord);

	// ... methods to initialize, filter, sort, and paginate
	// (note that these don't modify records, only the list)
}

// in an activity:
class CustomerActivity extends Activity {
	customerOrders = this.attach(new CustomerOrderViewModel());

	// ... initialize the view model if needed
}

// now, in a view:
export default (
	<column>
		<h2>Orders</h2>
		<list items={bind.list("customerOrders.list")}>
			<row>
				<label>Order %[item.id]</label>
				{/* ... */}
			</row>
		</list>
	</column>
);
```

## Further reading {#further-reading}

Learn more about managed objects, events, and property bindings in the following articles:

- {@link objects}
- {@link event-handling}
- {@link bindings}

Learn more about internationalization, localization, and formatting features, which can also be used as part of your data model:

- {@link internationalization}
- {@link text-formatting}

Learn more about list views:

- {@link list-views}
