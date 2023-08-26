---
template: doc_article
title: Components
description: Detailed description of the Component class
pageintro: |
  The Component class provides much of the infrastructure that is used by other Typescene classes. This page explains all of its features in detail.
---

## The `Component` class

The base class for all components in Typescene is the [`Component`](/docs/ref/Component) class. To create your own component, simply extend this class.

[**Component**<br>Component base class](/docs/ref/Component){:.block_link.class}

```typescript
class MyComponent extends Component {
  // ...
}

let c = new MyComponent();
```

This class won’t do anything useful on its own, though. The `Component` class only provides a common infrastructure layer; other classes build on top of this layer to define specific functionality for views, activities, and services. The base class provides a number of features:

- Reference management
- Emitting and handling events
- Observing property changes
- Life cycle states (created, active/inactive, destroyed)
- Declaration of preset constructors (factories)

Let’s look at each of these features in detail.

> **Note:** The `Component` class extends another class, the [`ManagedObject`](/docs/ref/ManagedObject) class. This class is also extended by the `ManagedList` and `ManagedMap` classes (see [Lists and maps](/docs/concepts/lists-maps)). Some of the features described here are actually part of the `ManagedObject` implementation, although application code should never need to extend the `ManagedObject` class directly — use the `Component` class whenever possible.

## Component references {#references}

References between components can be marked as ‘managed’:

[**@managed**<br>Property decorator: turn a property into a managed reference to another component](/docs/ref/managed){:.block_link.decorator}

> **Note:** Property decorators are available in TypesScript and in some variations of transpiled JavaScript. For more information and for ways to implement decorators in plain JavaScript, refer to the [differences between JavaScript and TypeScript](/docs/js-ts/).

```typescript
class MyOtherComponent extends Component {
  // ...
}

class MyComponent extends Component {
  @managed
  other = new MyOtherComponent();
}
```

The [`@managed`](/docs/ref/managed) decorator can be used on a property that’s intended to reference another component. This enables the following behavior:

* Type validation: managed properties _must_ reference a Component instance, nothing else (but they can be `undefined`).
* Life cycle state validation: managed properties cannot refer to a component that's in a 'destroyed' state (see [IDs and state](#ids-state) below -- components in this state are basically invalid, and most of the Component features described here are disabled after the component is destroyed, even if your code can still 'see' the object).
* Dereferencing: when a component is destroyed, managed properties that referenced this component are automatically set to `undefined`.

```typescript
// property values are checked
let c = new MyComponent();
c.other = new MyOtherComponent()  // fine
c.other = 123  // ERROR
c.other = someDestroyedComponent  // ERROR
```

### Parent-child references

Additionally, references can be marked as ‘parent-child’ dependencies, using the [`@managedChild`](/docs/ref/managedChild) property decorator.

[**@managedChild**<br>Property decorator: turn a property into a managed parent-child reference](/docs/ref/managed){:.block_link.decorator}

```typescript
class MyComponent extends Component {
  // ...
  
  @managedChild
  child = new MyOtherComponent();
}
```

In object-oriented terms, this enforces a ‘has-a’ relationship: the parent takes ownership of the child component. Therefore, the lifecycle of a child component depends on its parent (which may be somewhat unintuitive considering the literal meaning of these terms, but this is a common data structure concept).

When the parent component is destroyed, _or_ when the same property of the parent component no longer references the child component, the child component is destroyed immediately.

```typescript
let c = new MyComponent();
let child = c.child;
c.child = undefined;  // no longer referenced
setTimeout(() => {
  console.log(
    child.managedState === ManagedState.DESTROYED
  ); // => true
}, 1);
```

### Tree structures 

To represent a tree structure, you can use Typescene’s [List and Map](/docs/concepts/lists-maps) classes together with the `@managedChild` decorator. Lists and maps will automatically extend parent-child relationships to the objects they contain. Specifically, when a `@managedChild` property refers to a list or map, each of the objects within the list/map becomes a child component:

* When the parent object is destroyed, the list/map is destroyed along with the objects it contains.
* When the parent object no longer references the list/map, it is destroyed along with the objects it contains.
* When an object is removed from the list/map, it is destroyed immediately. 

For example, view components contained by `UIRow` and `UIColumn` components are _child_ components, even if they are referenced indirectly through a `ManagedList` in the `content` property.

The following example shows how child components in a list are destroyed when they are no longer part of the list.

```typescript
// child gets destroyed when removed from a list:
class MyListComponent extends Component {
  @managedChild
  list = new ManagedList(
    new MyComponent(),
    new MyComponent()
  );
}

let listComponent = new MyListComponent();
let firstChild = listComponent.list.first()!;
listComponent.list.clear(); // items are destroyed

setTimeout(() => {
  console.log(
    firstChild.managedState === ManagedState.DESTROYED
  ); // => true
}, 1)
```

[**See also:** Concepts &gt; Lists and maps](/docs/concepts/lists-maps){:.block_link.doc}

## Events {#events}

Components can _emit events_, for a variety of reasons — for example when the user interacts with a UI component, or when the state of a data model or service changes. These events can then be handled by components that _include a reference_ to the emitting component (using managed references, as described above).

You can emit your own events: any instance of the `ManagedEvent` class can be emitted using the [`emit()`](/docs/ref/ManagedObject#ManagedObject:emit) method of a component. For components that hold some type of data, the [`emitChange()`](/docs/ref/ManagedObject#ManagedObject:emitChange) method provides an efficient way to emit a 'Change' event — signaling that the data has changed — without having to construct the event object itself.

[**ManagedObject.emit()**<br>Emit an event](/docs/ref/ManagedObject#ManagedObject:emit){:.block_link.method}
[**ManagedObject.emitChange()**<br>Emit a change event (instance of `ManagedChangeEvent`)](/docs/ref/ManagedObject#ManagedObject:emitChange){:.block_link.method}

```typescript
let c = new MyComponent()
c.emit(new ManagedEvent("Hello"));
c.emit("Hello");  // same thing
c.emitChange();
```

### Handling events

Events can be handled in one of the following ways:

* By 'propagating' events from child components, or
* Using a component observer (see [Observers](#observers) below).

Event propagation is particularly useful for components that are part of a tree structure. When a child component emits an event (e.g. a `Click` event on a UI button component, or a `Change` event on an address data record), it’s often desirable to emit an event on the containing component as well (e.g. the row container that contains the button, or the contact record that refers to the address).

To do this, use the [`propagateChildEvents`](/docs/ref/ManagedObject#ManagedObject:propagateChildEvents) method. This method accepts a callback function as its only argument, which is called whenever an event has been emitted by any child component. The function may return either the same event, or another one (or nothing at all) to emit an event on the parent component itself.

[**ManagedObject.propagateChildEvents()**<br>Propagate events from managed child objects](/docs/ref/ManagedObject#ManagedObject:propagateChildEvents){:.block_link.method}

```typescript
// usually used in the component constructor:
c.propagateChildEvents((e) => {
  if (e.name === "Hello") return e;
  // ... otherwise, return nothing
});

c.child.emit("Hello")  // propagated on c
c.child.emitChange()  // not propagated on c
```

You can use the `propagateChildEvents` callback to take any action before the event is propagated, if at all. This makes it the simplest way to handle events, as long as the event source is referenced through a managed child reference property.

> **Note:** The built-in events ['Active'](/docs/ref/ManagedCoreEvent#ManagedCoreEvent:ACTIVE), ['Inactive'](/docs/ref/ManagedCoreEvent#ManagedCoreEvent:INACTIVE), and ['Destroyed'](/docs/ref/ManagedCoreEvent#ManagedCoreEvent:DESTROYED) are emitted automatically when the state of a component changes to active, inactive, and destroyed states, respectively (see 'IDs and state' below). However, these events _cannot_ be propagated.

## Observers {#observers}

A more advanced method for handling events is to add a component _observer_. Observers can handle events emitted by the component itself, as well as those emitted by referenced components. In addition, observers can be used to observe _property changes_ of the component object.

Observers are used extensively by the Typescene framework itself, for example to watch for changes to UI component properties (e.g. the `text` property of a `UILabel` component), and update elements on screen accordingly.

Use the static [`addObserver`](/docs/ref/ManagedObject#ManagedObject:addObserver) method of a component class to add an observer of your own:

[**ManagedObject.addObserver()**<br>Add an observer to all instances of this class and derived classes](/docs/ref/ManagedObject#ManagedObject:addObserver){:.block_link.method}

```typescript
class ObservedComponent extends Component {
  @managed other = new MyOtherComponent();
  foo = 123;
}

// add an observer class:
ObservedComponent.addObserver(class {
    constructor (public observed: ObservedComponent) {
      // called with each new ObservedComponent instance
    }

// ... (continue below)
```

An observer _instance_ is created for each new instance of the observed component, providing a reference to the observer’s constructor.

Methods of the observer class are then invoked whenever a property changes or an event occurs. Typescene invokes the appropriate method based on the method name:

* `onFooChange` is called whenever a property `foo` changes, _or_ when a ‘Change’ event is emitted on a component that is referenced by the (managed) `foo` property.
* `onEventName` is called when an event with name `EventName` is emitted by the component itself.
* `...Async` methods are called when a change or event occurs, but only after the code surrounding the statement that makes the change has completed. Async methods are always invoked only once, even if multiple changes or events occurred.

```typescript
// ... define methods:
    onOtherChange() {
      // called when (1) the observed.other property changes
      // or (2) a change event is emitted on observed.other
      this.observed.doSomething()
    }
    async onOtherChangeAsync() {
      // same as above, but asynchronously
    }
    onFooChange() { /* when observed.foo changes */ }
    async onFooChangeAsync() { /* same, but async */ }
    onHello() {
      // called when an event with name Hello is emitted
      // on the observed component itself
    }
});
```

In addition, observer methods can be decorated using the following decorators to specify when an observer method should be called.

[**@onPropertyEvent**<br>Observer method decorator: call a method when an event is emitted by a referenced object](/docs/ref/onPropertyEvent){:.block_link.decorator}
[**@onPropertyChange**<br>Observer method decorator: call a method when a property value changes](/docs/ref/onPropertyChange){:.block_link.decorator}
[**@rateLimit**<br>Observer method decorator: call a method at most once within a specific time frame](/docs/ref/rateLimit){:.block_link.decorator}

## IDs and state {#ids-state}

To keep track of component references internally, Typescene uses a unique ID that's assigned to every component instance as soon as it is created. This number is available through the read-only `managedId` field.

[**ManagedObject.managedId**<br>Unique object identifier](/docs/ref/ManagedObject#ManagedObject:managedId){:.block_link.property}

```typescript
class MyComponent extends Component { }
console.log(new MyComponent().managedId)  // e.g. 16
```

The [`managedState`](/docs/ref/ManagedObject#ManagedObject:managedState) field is another read-only component field. This represents the current 'state' of the component, i.e. one of the values defined on the [`ManagedState`](/docs/ref/ManagedState) enumeration object.

[**ManagedObject.managedState**<br>The current lifecycle state](/docs/ref/ManagedObject#ManagedObject:managedState){:.block_link.property}

[**ManagedState**<br>Enumeration of possible states for a managed object](/docs/ref/ManagedObject#ManagedObject:managedId){:.block_link.type}

* `ManagedState.CREATED` -- the initial state
* `ManagedState.DESTROYED` -- a state in which the component should not be used anymore, can no longer be referenced from other components, and cannot emit events; this state is permanent
* `ManagedState.ACTIVE` -- mostly used for activities and applications, to signify that corresponding view(s) should be rendered to the screen
* `ManagedState.INACTIVE` -- the component is no longer active
* `*.ACTIVATING`, `*.INACTIVATING`, `*.DESTROYING` -- the component is transitioning from one state to another.

You don't usually need to change a component's state yourself, but you may want to handle state changes when they occur — e.g. to trigger loading some data for an Activity as it becomes 'active'.

State transitions are _asynchronous_, and can only be initiated using the following (protected) methods:

* `activateManagedAsync()` — to transition to the active state;
    * While activating, the component calls its own `onManagedStateActivatingAsync()` method, which can be overridden to intercept the state transition. Throwing an error cancels the transition.
    * After the component becomes 'active', the `onManagedStateActiveAsync()` method is called.
* `deactivateManagedAsync()` — to transition (back) to the inactive state;
    * While deactivating, the component calls its own `onManagedStateDeactivatingAsync()` method, which can be overridden. Throwing an error cancels the transition.
    * After the component becomes 'inactive', the `onManagedStateInactiveAsync()` method is called.
* `destroyManagedAsync()` — to transition to the destroyed state;
    * If the component was in ‘active’ state, it is always deactivated first.
    * While destroying, the component calls its own `onManagedStateDestroyingAsync()` method, which can be overridden. Throwing an error does _not_ cancel the transition.

Be careful to avoid typos when overriding these methods — their names are long to make sure they don’t interfere with your own methods.

```typescript
class MyActivity extends PageViewActivity.with(view) {
  async onManagedStateActivatingAsync() {
    await super.onManagedStateActivatingAsync();
    // ...e.g. load some data here...
  }
}
```

---

### Recap

So far, we've seen that components

- can reference each other through 'managed' properties, with Typescene automatically managing some relationships
- can emit events, which may be handled and 'propagated' through parent-child references
- can be observed (for properties changes and events)
- have an ID and an asynchronously managed state.

There is one more feature that changes the way components are used in a Typescene app, and makes a large difference to code readability: declarative constructors.

## Declarations {#preset}

With the features described above, it would be possible to create a functioning Typescene application. For example, you could create a row of buttons just like this:

```typescript
// this works, but...
let row = new UIRow();
row.height = 48;
let button2 = new UIPrimaryButton();
button2.label = "OK";
let button1 = new UIButton();
button1.label = "Cancel";
row.content.add(button1, button2);
row.propagateChildEvents((e) => { /* etc... */ })
```

However, that’s not efficient at all, and especially with more components it’s easy to make mistakes. If event handlers modify components, or add or remove them, it’s difficult to understand what the final result looks like.

As an alternative, Typescene lets you _declare_ components, before creating any instances using `new`. A _declaration_ for the row in the example above becomes much simpler:

```typescript
// same, but different:
const preset = UIRow.with(
  { height: 48 },
  UIPrimaryButton.withLabel("OK"),
  UIButton.withLabel("Cancel")
)

let row = new preset();
```

Every component has a static `with(...)` method, and some components have related methods such as `withLabel`. Note that these methods do **not** return a component, but a _constructor_. This ‘preset’ constructor can be used to create components with content and properties exactly as specified in the declaration.

[**Component.with()**<br>Create a preset constructor (i.e. a class that is the result of a component declaration)](/docs/ref/Component#Component:with){:.block_link.method}

### Property values

If the first argument to `with` is a plain object (i.e. `{ ... }`), then by default, all properties from that object are copied to instances created using the preset constructor.

```typescript
let MyButton = UIButton.with({ label: "Cancel" });

let btn1 = new MyButton();
console.log(btn1.label);  // => "Cancel"
let btn2 = new MyButton();
console.log(btn2.label);  // => "Cancel"
```

However, some properties aren't just copied. Components can define their own preset logic, but there are two exceptions that are shared by all components: _bindings_ and _event handlers_.

### Bindings

If you add a ‘binding’ to a preset object — i.e. the result of a call to [`bind`](/docs/ref/bind) or [`bindf`](/docs/ref/bindf), then the corresponding property on the preset component becomes 'bound' to a property of one of its parent components, allowing it to be updated dynamically.

[**bind()**<br>Create a new binding for a given property name](/docs/ref/bind){:.block_link.function}
[**bindf()**<br>Create a new binding using a format string](/docs/ref/bindf){:.block_link.function}
[**Binding**<br>Represents a binding, created using `bind` or `bindf`](/docs/ref/Binding){:.block_link.class}

Here’s an example of a preset view component that includes a binding:

```typescript
const view = UICell.with(
  UICenterRow.with(
    UILabel.with({
      text: bind("labelText"),
      textStyle: { color: "red" }
    })
  )
)
```

This enables the following behavior:

1. When this component is created on its own, the `text` property of the label is undefined — the binding isn’t bound yet at all.
2. When an activity sets its `view` property to the newly created view component, it makes the view component a _child_ component of the activity.
3. Typescene notices that the view’s parent component has changed, and informs the binding that it can now be bound to the activity object.
4. The binding takes the value from the `labelText` property of the activity, and assigns it to the label’s `text` property.
5. The `labelText` property is observed, so that every time its value changes, the label’s `text` property is updated accordingly.

Bindings allow for updates to deeply nested components (e.g. setting the `text` property of a label, which is in a row, which is in a cell, etc.) without the need for a direct reference to the component. This is key to how views (and in some cases, activities) are used in Typescene applications.

> **Note:** How do bindings find their bound parent components? While it’s intuitively understandable that a view takes its bound values from a parent activity, there’s nothing special about views and activities that makes this work. Views can be bound to other view components as well. Remember, these features exist on the generic `Component` class. Refer to [Custom presets](#custom) below to learn more about how this works.

Bindings don’t always need to refer to a single property value:

* Nested properties can be bound using e.g. `bind("user.name")`. Note that _only_ the `user` property will be observed; updating the `name` property on the user object alone doesn’t update the bound value — this can be solved by emitting a ‘Change’ event on the user object.
* Bound property values can be changed using formatting ‘filters’, e.g. `bind("value|.2f")` results in a number with 2 decimal places, and `bind("!showResults")` results in the boolean _opposite_ of the `showResults` property value.
* Bindings can be combined logically (similar to `&&` and `||` operators in JavaScript) using the [`.and`](/docs/ref/Binding#Binding:and) and [`.or`](/docs/ref/Binding#Binding:or) methods, e.g. `bind("!noResults").and("showResults")`.
* The [`bindf`](/docs/ref/bindf) function (bind _formatted_, in reference to the `printf` function that exists in C and many other programming languages) returns a binding that results in a string, incorporating the current value(s) of one or more bindings. E.g. `bindf("Buy %i for $%.2f", "qty", "price")` binds to the `qty` and `price` properties, but applies its result as a string such as “Buy 2 for $2.50”.

### Event handlers

If the first argument to `with` is a plain object, then this object may also include _event handlers_ for specific events. For example, to handle `Click` events, include an `onClick` property in the argument to `with`.

You _may_ include a handler function directly in the preset argument:

```typescript
// not best practice!
const view = UIRow.with(
  UIButton.with({
    label: "Click me",
    onClick: function (e) {
      // ... user clicked the button
      console.log(e.name)  // => "Click"
    }
  })
)
```

However, in practice this not only makes (view) code more difficult to read, but also makes it more likely that business logic finds its way into other parts of the program — something that should generally be avoided.

Instead, the `onClick` property may be set to a string in one of the following formats:

- `onClick: "+Foo"` instructs the (nested) component to listen for `Click` events, and emit a `Foo` event in response. The emitted event is an instance of [`ComponentEvent`](/docs/ref/ComponentEvent), which refers to both the emitting component, and the original event.
- `onClick: "foo()"` instructs the component to listen for `Click` events, and _delegate_ the event to the `foo()` method on the bound parent component, i.e. the same component that bound property values are taken from, usually the activity.

Combining event handlers and bindings, the resulting ‘preset’ view component declaration describes an interactive user interface, without ever needing to create or update any of the view components directly.

The preset view constructor can then be passed to a preset activity constructor, to make sure that the resulting activity displays this view when it is active:

```typescript
const view = UIRow.with(
  UIButton.with({
    label: "Click me",
    onClick: "addCount()"
  }),
  UILabel.withText(
    bindf("You clicked %i times", "count")
  )
)

class MyActivity extends PageViewActivity.with(view) {
  path = "/";
  count = 0;
  addCount() { this.count++ }
}
```

## Custom presets {#custom}

A component class may define a custom function to handle preset arguments (i.e. the arguments passed to the `with` method) — although this is often not necesary in your own code; most of the standard view classes implement their own handlers.

For example, the `style` property passed to UI components is _not_ directly copied to the resulting component — since that would completely override existing styles. Instead, the given styles are combined with the existing styles of that component.

```typescript
const styles = UIStyle.group({
  red: { textStyle: { color: "red" } },
  bold: { textStyle: { bold: true } }
})

const MyRedButton = UIButton.with({
  label: "Click me",
  style: styles.red  // red text
})
const MyBoldRedButton = MyRedButton.with({
  style: styles.bold  // red and bold
})
```

### Overriding preset methods

This behavior is implemented by the static `preset` method. This method is defined by the `Component` class, but it may be overridden.

> **Note:** For custom views, it’s best to rely on the existing functionality of the `ViewComponent` class, rather than implementing your own `preset` method.

[**See also:** Concepts &gt; Views](/docs/concepts/views){:.block_link.doc}

If you do need to implement custom preset behavior, override the static `preset` method. This method can intercept preset arguments before they are applied by the method defined by `Component`.

The `preset` method is called by `with` itself, right after creating the constructor that will eventually be returned. Here’s an example of a custom `preset` method:

```typescript
class MyButton extends UIButton {
  // override default behavior
  static preset(args: UIButton.Presets & { fancy: boolean }) {
    if (args.fancy) {
      // ...change presets here before they are applied,
      // if necessary
    }

    // this method returns a function that is run
    // for each instance by the new constructor:
    let f = super.preset(args);
    return function (this: UIButton) {
      f.call(this);  // apply default behavior first

      // `this` refers to the button instance now
      if (args.fancy) {
        this.label = String(this.label).toUpperCase();
      }
    }
  }
}

let B = MyButton.with({ label: "a", fancy: true });
let button = new B();
console.log(button.label);  // => "A"
```

Similarly, you can take any content (other arguments passed to `with`) as an array of constructors, and change or add to the array:

```typescript
class MyRow extends UIRow {
  static preset(
    args: UICell.Presets,
    ...content: Array<UIRenderableConstructor | undefined>) {
    content.reverse();
    return super.preset(args, ...content);
  }
}
```

### Preset bindings and limiting bound properties

The `preset` function can also be used to make the (new, preset) component class the ‘bound’ parent for any child components that may have been added. Note that this is _necessary_, because any bindings that were not included by/from the given class, will not work.

Bound properties can be limited to a specific set of properties — for example, this is how the [`UIListCellAdapter`](/docs/ref/UIListCellAdapter) class enables bindings to the `object`, `value`, `selected`, and `hovered` properties _of the list cell_ while all other bindings still refer to the previously bound parent component, as illustrated below.

```typescript
const view = UICell.with(
  UIListController.with(
    { items: bind("items") },  // a, b, c
    
    // this class *limits* bindings:
    UIListCellAdapter.with(
      UIRow.with(
        // this is bound to the activity:
        UILabel.withText(bind("greeting")),
        // this is bound to the list item:
        UILabel.withText(bindf("Item: %s", "value"))
      )
    )
  )
)

class MyActivity extends PageViewActivity.with(view) {
  path = "/";
  greeting = "Hello, world!"
  items = ["a", "b", "c"]
}
```

The following methods should be used within the `preset` method if a component accepts further component declarations as arguments to `with` (similar to `UIListCellAdapter` above) which may include bindings to properties of the component _itself_.

[**Component.presetBoundComponent()**<br>Make this component the bound parent component for given child component type(s)](/docs/ref/Component#Component:presetBoundComponent){:.block_link.method}
[**BoundComposition.limitBindings()**<br>Remove all bindings that are to be bound to properties that are not included in a given list](/docs/ref/Component#Component:BoundComposition:limitBindings){:.block_link.method}

In practice these advanced techniques are rarely ever needed: custom view components already automate this setup using the `with` method of the `ViewComponent` class (making it unnecessary to use the methods above), and custom component declarations outside of the view don’t normally accept any component declarations with nested bindings.

---

### Next steps

Now that you have an understanding of the `Component` class, it’s time to look at how components are grouped into collections for data modeling and display.

* Learn about [Lists and maps](/docs/concepts/lists-maps).
