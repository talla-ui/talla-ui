---
template: doc_article
title: Lists and maps
description: Detailed description of lists and maps
pageintro: |
  Components are frequently stored in list and map structures, especially when referenced by other components.
---

## Overview {#overview}

In JavaScript, creating a list of values is a simple task. Arrays hold any type of data, and they are easily created using the `[` and `]` operators, so they are usually the best solution if you need to iterate (loop) over a set of values.

```typescript
let data = ["a", "b", "c"];
data.forEach(d => { console.log(d) });
```

In a front-end framework however, JavaScript arrays cause some issues. For one, their values are not checked: they might include a mix of strings, numbers, objects, and other types of values. Any value can be assigned to _any_ array index at any time. This means that they may include duplicates, undefined values, and _gaps_ (which occur when a certain array index is not set at all, which is not the same as setting the array property to `undefined`).

Therefore, Typescene implements two different types of lists of its own, which are much stricter about their contents than regular JavaScript arrays and objects.

[**ManagedList**<br>Represents an ordered set of components](/docs/ref/ManagedList){:.block_link.class}
[**ManagedMap**<br>Represents a set of components that are indexed using a string value](/docs/ref/ManagedList){:.block_link.class}

```typescript
let list = new ManagedList(
  new Component(),
  new Component(),
  new Component()
);
let first = list.first();
let second = list.get(1);
let third = list.last();

let map = new ManagedMap()
map.set("One", new ManagedList());
let one = map.get("One");
```

By design, managed lists and maps circumvent issues with duplicates and gaps: once an item is removed from the list other items take its place, and the same item cannot be included in the same list more than once. Internally, both `ManagedList` and `ManagedObject` are implemented in a way that’s very efficient, and doesn’t require looping over the entire list to add or remove items.

### Restricting item types

The `restrict` method on both lists and maps restricts the type of component objects that can be added to the list — ensuring that all items in the list/map are instantiated by a particular class (or sub class).

[**ManagedList.restrict()**<br>Restrict objects within this list to be of a given type (class)](/docs/ref/ManagedList#ManagedList:restrict){:.block_link.method}
[**ManagedMap.restrict()**<br>Restrict objects within this map to be of a given type (class)](/docs/ref/ManagedMap#ManagedMap:restrict){:.block_link.method}

```typescript
class MyComponent extends Component { }
class SameComponent extends MyComponent { }
class OtherComponent extends Component { }

let list = new ManagedList().restrict(MyComponent);
list.add(new MyComponent());  // OK
list.add(new SameComponent());  // OK
list.add(new OtherComponent());  // ERROR
```

### Nested lists/maps

Both lists and maps (instances of `ManagedList` and `ManagedMap`) may directly contain _other_ lists and maps. They may even refer to themselves in a circular pattern, directly or indirectly — *unless* the `restrict` method has been used to limit the particular object type that can be added.

This is because by default, lists and maps may contain instances of the [`ManagedObject`](/docs/ref/ManagedObject) class, a superclass of [`Component`](/docs/ref/Component) as well as [`ManagedList`](/docs/ref/ManagedList), [`ManagedMap`](/docs/ref/ManagedMap), and [`ManagedReference`](/docs/ref/ManagedReference).

### Managed record references

The [`ManagedRecord`](/docs/ref/ManagedRecord) class implements several methods that are useful for use with records that are stored in a list — a common way to model ordered or indexed ‘record’ data.

[**ManagedRecord**<br>Represents data that is managed as a component, often within a list structure](/docs/ref/ManagedRecord){:.block_link.class}

* [`record.getParentRecord()`](/docs/ref/ManagedRecord#ManagedRecord:getParentRecord) — retrieves the ‘parent’ instance (containing a property that has been marked with the `@managedChild` decorator which indirectly references the record) of the `ManagedRecord` class itself, even if the parent record references a list/map that _contains_ this record.
* [`record.getNextSibling()`](/docs/ref/ManagedRecord#ManagedRecord:getNextSibling) — retrieves the next record in a parent list (i.e. a list that is assigned to a property marked with `@managedChild` in another record).
* [`record.getPreviousSibling()`](/docs/ref/ManagedRecord#ManagedRecord:getNextSibling) — retrieves the previous record in a parent list.

### Parent-child references

Often, components within a list should be considered to be fully ‘contained’ by the component that includes the list itself — for example in the case of a row of buttons on screen, the buttons certainly belong to the row; moving or removing the row should also move the buttons within. Similarly, a list of addresses may ‘belong’ to a contact record.

For this reason, component lists/maps extend parent-child relationships to all components within the list, _if_ the list itself is assigned to a property marked with [`@managedChild`](/docs/ref/managedChild) (refer to  [Components](/docs/concepts/components) for details on how this property decorator works).

```typescript
class PersonAddress extends ManagedRecord {
  street: string;
  // ... etc. 
}

class PersonContact extends ManagedRecord {
  name: string;
  // ... etc.
  
  @managedChild
  addresses = new ManagedList().restrict(PersonAddress);
}

let contact = new PersonContact();
let address = new PersonAddress(); //  ... etc  
contact.addresses.add(address);
contact.addresses.first().getParentComponent()  // contact
```

### Weak parent-child references

To mark a property containing a list or map as parent-child reference, but _not_ the contained components, use the `weakRef` method:

[**ManagedList.weakRef()**<br>Stop newly referenced objects from becoming child objects](/docs/ref/ManagedList#ManagedList:weakRef){:.block_link.method}

```typescript
class PersonContact extends ManagedRecord {
  // ...
  @managedChild
  colleagues = new ManagedList()
    .restrict(PersonContact)
    .weakRef();
}
```

> **Note:** The use case for this pattern is relatively limited. You may only need to mark the list as a child component (but not its items) if you notice a memory leak when new lists are created frequently, containing many of the _same_ items. Using a child reference, the list itself will be destroyed as soon as a new list is assigned to the same property, even if the contained items are not.

## Lists {#lists}

[**ManagedList**<br>Represents an ordered set of components](/docs/ref/ManagedList){:.block_link.class}

Lists of components can be created using the [`ManagedList`](/docs/ref/ManagedList) constructor. This constructor accepts an initial set of objects, which are added to the list immediately.

Afterwards, the list’s methods can be used to add objects:

```typescript
let a = new MyComponent();
let b = new MyComponent();
let list = new ManagedList(a, b);

// add an item to the back of the list:
list.add(new MyComponent());

// insert an item *before* `b`
list.insert(new MyComponent(), b);
```

[**ManagedList.add()**<br>Add one or more objects (or managed lists or maps) to the end of this list](/docs/ref/ManagedList#ManagedList:add){:.block_link.method}
[**ManagedList.insert()**<br>Insert an object before another object in this list](/docs/ref/ManagedList#ManagedList:insert){:.block_link.method}
[**ManagedList.remove()**<br>Remove an object from this list](/docs/ref/ManagedList#ManagedList:remove){:.block_link.method}
[**ManagedList.clear()**<br>Remove all objects from this list](/docs/ref/ManagedList#ManagedList:clear){:.block_link.method}
[**ManagedList.splice()**<br>Add and/or remove objects at the same time](/docs/ref/ManagedList#ManagedList:splice){:.block_link.method}
[**ManagedList.replace()**<br>Replace _all_ items in this list with a given set of new items, in one go](/docs/ref/ManagedList#ManagedList:replace){:.block_link.method}

### Iteration

You can loop over all objects in a list using a standard `for...of` statement.

```typescript
class SomeComponent extends Component {
  constructor(public s: string) { super() }
}
let list = new ManagedList(
  new SomeComponent("a"),
  new SomeComponent("b"),
  new SomeComponent("c")
);
for (let component of list) {
  console.log(component.s);
}
```

Alternatively, you can use the following methods to iterate over the objects in a list.

[**ManagedList.forEach()**<br>Invoke a callback function for each object in this list](/docs/ref/ManagedList#ManagedList:forEach){:.block_link.method}
[**ManagedList.map()**<br>Invoke a callback function to each object, and return an Array with all results](/docs/ref/ManagedList#ManagedList:map){:.block_link.method}
[**ManagedList.pluck()**<br>Take a given property from each object, and return an Array with all values](/docs/ref/ManagedList#ManagedList:pluck){:.block_link.method}
[**ManagedList.some()**<br>Returns true if a given callback function returns `true` for at least one object in this list](/docs/ref/ManagedList#ManagedList:some){:.block_link.method}
[**ManagedList.every()**<br>Returns true if a given callback function returns `true` for all objects in this list](/docs/ref/ManagedList#ManagedList:every){:.block_link.method}
[**ManagedList.toArray()**<br>Returns an Array with all objects in this list](/docs/ref/ManagedList#ManagedList:toArray){:.block_link.method}

### Events

Lists emit a [`ManagedListChangeEvent`](/docs/ref/ManagedListChangeEvent) event when objects are added, removed, or moved.

* When an object is added, the object itself is referenced by the `object` property of the [`ManagedObjectAddedEvent`](/docs/ref/ManagedObjectAddedEvent) event.
* When an object has been removed, the removed object is referenced by the `object` property of the [`ManagedObjectRemovedEvent`](/docs/ref/ManagedObjectRemovedEvent) event.

Furthermore, lists can be made to ‘propagate’ (i.e. re-emit) all events that are emitted by objects within the list, using the [`propagateEvents`](/docs/ref/ManagedList#ManagedList:propagateEvents) method.

[**ManagedList.propagateEvents()**<br>Propagate events from all objects in this list](/docs/ref/ManagedList#ManagedList:propagateEvents){:.block_link.method}

```typescript
class PersonContact extends ManagedRecord {
  @managed
  friends = new ManagedList()
    .restrict(PersonContact)
    .propagateEvents();
}
PersonContact.addObserver(class {
  constructor(public contact: PersonContact) { }
  onFriendsChange() {
    // ...[1] 
  }
})
```

In the code above, the `onFriendsChange` method [1] is called when:

* the friends list is assigned the first time (an empty list),
* any objects are added to, removed from, or moved within the friends list,
* any object _within_ the friends list emits a change event — since those events are immediately also emitted by the list itself.

### Views and bindings

`ManagedList` instances are frequently used to manage lists of objects that need to be displayed in the application UI. The [`UIListController`](/docs/ref/UIListController) view component can be used for this purpose. Its `items` property refers to a `ManagedList` instance, which are turned into views using a ‘view adapter’ — a component that takes an object and produces a view component. The generic [`UIListCellAdapter`](/docs/ref/UIListCellAdapter) component usually serves this purpose well.

[**See also:** Concepts &gt; Views](/docs/concepts/views){:.block_link.doc}

Note that Typescene will _automatically_ convert arrays to objects in a managed list when updating a binding.

* If the existing property value of a bound property (e.g. the `items` property of a `UIListController` view component) is _already_ an instance of `ManagedList`, **and**
* if the bound value (i.e. the value of the bound parent’s property) is a `ManagedList`, **then** the list reference itself is copied to the target component.
* if the bound value is `undefined`, **then** the list is cleared.
* if the bound value is an array of `ManagedObject` instances (e.g. components), **then** all objects in the list are replaced with the objects from the array.
* if the bound value is an array of other values (e.g. strings), **then** those values are encapsulated in an anonymous component type first, whose `valueOf()` method returns the original value.

This makes it possible to bind the `items` property of a list view either to a ‘real’ list of components, or to a simple array:

```typescript
const view = UICell.with(
  UIListController.with(
    // items is actually a ManagedList:
    { items: bind("items") },
    UIListCellAdapter.with(
      UIRow.with(
        UILabel.with(bind("value"))  // a, b, c
      )
    )
  )
)

class MyActivity extends PageViewActivity.with(view) {
  // ...
  
  // plain array elements get converted:
  items = ["a", "b", "c"]
}
```

## Maps {#maps}

[**ManagedMap**<br>Represents a set of components that are indexed using a string value](/docs/ref/ManagedList){:.block_link.class}

Indexed sets of components can be created using the [`ManagedMap`](/docs/ref/ManagedMap) constructor. This constructor does not accept any arguments.

Afterwards, the map’s methods can be used to add objects:

```typescript
let map = new ManagedMap();
map.set("one", new MyComponent());
map.set("two", new MyComponent());
```

[**ManagedMap.set()**<br>Add an object (or managed list or map) to this map using given string index (key)](/docs/ref/ManagedMap#ManagedMap:set){:.block_link.method}
[**ManagedMap.unset()**<br>Remove an object from this map using a given string index (key)](/docs/ref/ManagedMap#ManagedMap:unset){:.block_link.method}
[**ManagedMap.remove()**<br>Remove an object from this map](/docs/ref/ManagedMap#ManagedMap:remove){:.block_link.method}
[**ManagedMap.clear()**<br>Remove all objects from this map](/docs/ref/ManagedMap#ManagedMap:clear){:.block_link.method}

### Iteration

Unlike with the `ManagedList` class, you _cannot_ loop over objects in a map using a `for...of` statement.

Instead, you can use the following methods to iterate over the indexes (keys) or objects in a list.

[**ManagedMap.forEach()**<br>Invoke a callback function for each key and object in this map](/docs/ref/ManagedMap#ManagedMap:forEach){:.block_link.method}
[**ManagedMap.objects()**<br>Returns an Array with all objects in this map](/docs/ref/ManagedMap#ManagedMap:keys){:.block_link.method}
[**ManagedMap.keys()**<br>Returns an Array with all keys in this map](/docs/ref/ManagedMap#ManagedMap:keys){:.block_link.method}
[**ManagedMap.toObject()**<br>Returns a plain JavaScript object with all objects in this map, with keys as property names](/docs/ref/ManagedMap#ManagedMap:toObject){:.block_link.method}

```typescript
class SomeComponent extends Component {
  constructor(public s: string) { super() }
}
let map = new ManagedMap();
map.set("1", new SomeComponent("One"));
map.set("2", new SomeComponent("Two"));
map.set("3", new SomeComponent("Three"));
map.forEach((key, component) => {
  console.log(key + ": " + component.s);
  // => 1: One
  // ...etc 
}
```

### Events

Maps emit a [`ManagedListChangeEvent`](/docs/ref/ManagedListChangeEvent) event when objects are added, removed, or moved — similar to lists.

* When an object is added, the object itself is referenced by the `object` property of the [`ManagedObjectAddedEvent`](/docs/ref/ManagedObjectAddedEvent) event, and the key is stored in the `key` property.
* When an object has been removed, the removed object is referenced by the `object` property of the [`ManagedObjectRemovedEvent`](/docs/ref/ManagedObjectRemovedEvent) event, and the key is stored in the `key` property.

Furthermore, maps can also be made to ‘propagate’ (i.e. re-emit) all events that are emitted by objects within the map, using the [`propagateEvents`](/docs/ref/ManagedList#ManagedList:propagateEvents) method (see Lists above for an example).

[**ManagedMap.propagateEvents()**<br>Propagate events from all objects in this map](/docs/ref/ManagedMap#ManagedMap:propagateEvents){:.block_link.method}

---

### Next steps

Find out how lists and maps are used by Typescene to store application components.

* Learn more about [views](/docs/concepts/views), which represent the user interface as a tree structure of components.
* Learn more about [activities](/docs/concepts/activities), which encapsulate views and represent the possible states of an application.
* Learn more about [services](/docs/concepts/services), which encapsulate the application’s global state, available from within all other components.
