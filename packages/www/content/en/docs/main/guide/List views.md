---
title: List views
abstract: Learn how to display lists in your application UI
sort: -5
breadcrumb_name: Guide
nav_parent: using
applies_to:
  - UIList
  - UIContainer
---

## Data types {#data}

Most applications include some sort of list view, that's populated with dynamically generated data. The data may be loaded from a server, or entered directly by the user. Either way, the on-screen data must be stored as a data structure within the application before it can be displayed.

There are two ways to store (in-memory) list data structures to be represented in the UI:

- **Using a plain array.** Each value in the array should correspond to a list item in the UI. Since array values can't always be tracked uniquely (and arrays may contain gaps, duplicates, etc.), the entire list must be re-rendered when the array changes.
- **Using a managed list.** Each managed object within the list should correspond to a list item in the UI. Since objects can be tracked uniquely (and there can be no gaps or duplicates), each list item can be rendered and re-rendered on its own.

To decide whether you should be using a managed list (i.e. an instance of {@link ManagedList}) to represent your data, consider whether re-rendering the entire list would have a noticeable performance impact, or produce visual artifacts.

- {@ref ManagedList}

Commonly, lists are initialized by an activity constructor or overridden initialization method such as {@link Activity.beforeActiveAsync()} or {@link Activity.afterActiveAsync()}.

```ts
class MyActivity extends PageViewActivity {
	// Lists can be created immediately:
	myList = new ManagedList<SomeType>();

	// And/or in an initialization method:
	protected async afterActiveAsync() {
		await super.afterActiveAsync();

		// ... load or find data
		myList.replace(someData);
	}
}
```

## UI components {#components}

Any part of the UI that should be repeated for each element in a list can be wrapped in a {@link UIList} component.

- {@ref UIList}

The {@link UIList} component automatically creates an instance of the contained view, attached to an object (the controller, i.e. an instance of {@link UIList.ItemController}) that provides an `item` property.

From within the list item view, use bindings to access the list item value or any nested object properties.

```ts
const view = UICell.with(
	// a list of rows, one for each item
	UIList.with(
		{ items: bound.list("someList") },
		UIRow.with(
			// within the row, a name label and button
			UILabel.withText(bound.string("item.name")),
			UIOutlineButton.withLabel("Remove", "RemoveItem"),
		),
	),
);
```

## Handling list item events {#events}

When a {@link UIList.ItemController} object forwards an event, it sets the {@link ManagedEvent.delegate} property to the adapter object itself. In practice, that means that you can handle events that were originally emitted from _within_ a list item in the containing view activity as usual, and refer to `delegate.item` to get a reference to the respective item object or value.

You can use {@link UIList.ItemEvent} as the (generic) type for the event handler's parameter, as illustrated below.

```ts
class MyActivity extends ViewActivity {
	// ...

	// if this list is displayed by the view
	someList = new ManagedList<MyListItem>();

	// events can be handled like this
	onRemoveItem(e: UIList.ItemEvent<MyListItem>) {
		this.someList.remove(e.delegate.item);
	}
}
```

## Container types {#containers}

List items are created automatically, after which they're placed inside of a container that's managed by the {@link UIList} component itself.

By default, this container is a plain column view (see {@link UIColumn}), but the type of container can be changed by passing another preset container constructor to {@link UIList.with()} (or the corresponding JSX tag) — for example, to display a list of labels within a row.

```ts
const view = UICell.with(
	// display a list of labels within a row
	UIList.with(
		{ items: bound.list("someList") },
		UILabel.withText(bound.string("item.name")),

		// override the default container type:
		UIRow,
	),
);
```

## Book end components {#bookend}

The final argument to the {@link UIList.with()} method (or, the final content element of the `<list>` JSX tag) is a component that's always displayed _after_ all view components that are created for list items.

Book end components primarily serve two purposes:

- To display a final separator after all list items (at the bottom of the list), by including a spacer component as a book end.
- To display an empty state _within_ the list container, by including a {@link UIConditional} component that's only visible when the list is empty.

```ts
const view = UICell.with(
	UIList.with(
		{ items: bound.list("someList") },
		UIRow.with(/* ... list item ... */),
		UIColumn,

		// book end for empty state, only shows
		// when there are no items at all
		UIConditional.with(
			{ state: bound.not("someList.count") },
			UICenterRow.with(UILabel.withText("The list is empty")),
		),
	),
);
```
