---
title: Bindings
abstract: Learn how bindings can be used to set property values dynamically
breadcrumb_name: Guide
nav_parent: using
sort: -10
applies_to:
  - ManagedObject
  - Binding
  - bound
---

## Binding view properties {#view}

The most common use for bindings is to update parts of the application UI dynamically. In a Desk application, view objects such as buttons, labels, and text fields are (directly or indirectly) _attached_ to either a {@link ViewActivity} instance or a {@link ViewComposite} instance, and bindings can be used to 'pull' data from one of the attached parent objects into specific properties of each view object.

In view code that's written using `.with()` calls _or_ JSX syntax, you can replace most properties with a binding. When the corresponding view object(s) are constructed, bindings are activated — automatically updating the property value from the binding's 'source' whenever possible.

To create a binding in your view, use the {@link bound()} function (and/or one of the other functions as described in the advanced topics below). The result is a {@link Binding} object, which has some useful methods of its own.

- {@ref bound}
- {@ref Binding}

#### Example

To use a binding, assign the binding to a property in a call to `.with()` or a related method (such as {@link UILabel.withText()}), _or_ use it as a property value in JSX code.

```tsx
// use bindings in .with* calls:
const view = UICell.with(
	UIConditional.with(
		{ state: bound("showHello") },
		UILabel.withText(bound("helloText")),
	),
);

// or use them in JSX code:
const same = (
	<cell>
		<conditional state={bound("showHello")}>
			<label>{bound("helloText")}</label>
		</conditional>
	</cell>
);
```

## Using binding source arguments {#source}

The **source** argument that's passed to {@link bound()} and other methods usually refers to a single property of the view's containing activity.

For example, `bound("helloText")` will create a binding that looks for a property named `helloText` on the closest attached parent object.

However, you can also use the dot `.` character to return a _property of_ any object that is assigned to the first property. If the object is an instance of {@link ManagedObject}, the property will be watched for changes, just like the original property of the activity (or view composite) itself.

For example, `bound("helloText.length")` watches the `helloText` property but returns the value's `length` property (possibly a string length). Similarly, if the activity has an object reference such as `selectedCustomer`, which could be an object that contains properties of its own, you can use a binding such as `bind("selectedCustomer.address.city")`. In this case:

- the bound value updates when `selectedCustomer` is assigned,
- the bound value updates when `address` or `city` are assigned, provided that the objects are instances of (a subclass of) {@link ManagedObject},
- the bound value updates when any object emits a change event (i.e. {@link ManagedChangeEvent}, using {@link ManagedObject.emitChange()}),
- if _any_ property along the source path is undefined or null, the bound value becomes undefined.

> **Note:** Each bound property **must exist** at the time when the binding is initialized (i.e. when the view is attached). Creating a property by assigning to it after the view has already been added will **not** bind this property to the view. Therefore, it's a good idea to initialize properties that will be bound to `undefined` or some other value to ensure that they exist right away, even if they have no value.

## Binding properties of activities and other objects {#activity}

Bindings can also be used outside of views. Any instance of a class that derives from {@link ManagedObject} can manage bindings of its own — causing it to watch for attached parent objects, and bind to the appropriate properties on the closest parent.

You can use this for activities, for example: one activity may be attached to another one, and rather than communicating state between them manually, you can _bind_ values or objects on the attached activity. Any other objects with a clear hierarchical organization can also use bindings to keep data in sync.

Value changes can either update a property immediately, or invoke a callback function that's passed to {@link Binding.bindTo()}.

- {@ref Binding.bindTo}

> **Note:** Bindings always work only one way. Updating the bound property on a target object does nothing to the source property, and changes will be overwritten when the source property is updated again (however, if the bound value refers to an object, modifying its properties will of course also modify the same object that's referenced by the source property).

#### Example

The following code contains two activities, one with a `selectedCustomer` property — perhaps controlled by one of its event handlers — and another that's attached to the first. The second activity uses a binding to handle changes to the selected customer using a callback function.

```ts
class OneActivity extends PageViewActivity {
	// ...

	selectedCustomer?: Customer = undefined;

	readonly two = this.attach(new TwoActivity());
}

class TwoActivity extends ViewActivity {
	// ...

	constructor() {
		super();
		bound("selectedCustomer").bindTo(this, (customer?: Customer) => {
			// ... do something with the new value
		});
	}
}
```

## Binding text in views {#view-text}

You can use bindings to set text values in your view, e.g. to update the `text` property of a {@link UILabel} object while your app is running.

However, this would require the full text to be set as a source property, adding complexity and moving UI concerns (the message displayed to a user) to parts of your code that should only be concerned with logic (i.e. your activity).

To display a message such as "Hello, _username_", where the name itself is stored in a property of the activity but the rest of the message is not, you can use **string-formatted bindings**.

String-formatted bindings take values from one or more bindings, and produce a string that contains these values — updating the formatted string as each binding is updated.

Use the {@link bound.strf()} function to create a string-formatted binding. This function returns a {@link StringFormatBinding}, which is a subclass of {@link Binding} and can be used wherever a binding would be valid.

```ts
// A label with a string-formatted binding:
UILabel.withText(bound.strf("Hello, %s", "username"));
```

- {@ref bound.strf}
- {@ref StringFormatBinding}

The implementation of {@link StringFormatBinding} actually uses a {@link LazyString} object, and its {@link LazyString.format()} method. Refer to the following guides for more details on string formatting and internationalization using formatted strings.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/String formatting"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/I18n"}}-->

#### Example

In the following view, label text is populated using a string-formatted binding, including pluralization based on a bound number value. This view can be used with an activity that includes `username` and `numEmails` properties.

```ts
const view = UICell.with(
	UILabel.withText(
		bound.strf(
			"Hello, %s. You have %i new #{email/emails}",
			"username",
			"numEmails",
		),
	),
);
```

If your app will be localized, and you want to provide translators with more descriptive source text, you can use an object argument instead.

```ts
const view = UICell.with(
	UILabel.withText(
		bound.strf(
			"Hello, %[name]. You have %[num] new %[num:plural|email|emails]",
			{ name: bound.string("username"), num: bound.number("numEmails") },
		),
	),
);
```

## Binding text using JSX syntax {#jsx-text}

While {@link bound.strf()} and {@link StringFormatBinding} work using JSX syntax too, Desk's way of handling JSX text enables an easier way to include bindings within strings.

Within plain text that's wrapped in tags such as `<label>` and `<button>`, you can directly include `%[...]` placeholders to include bindings. The placeholder includes the binding source as well as an optional format specifier, e.g. `%[numEmails:i]`.

```tsx
const view = (
	<cell>
		<label>
			Hello, %[username]. You have %[numEmails] new
			%[numEmails:plural|email|emails]
		</label>
	</cell>
);
```

Refer to the below documentation for details.

- {@ref JSX}

## Binding different types of values {#types}

The {@link Binding} class includes a type parameter `<T>`, which may be useful in certain cases — but isn't actually checked at runtime (it can't be).

Therefore, if you want to make sure a bound value is of a certain type, use `bound.number()`, `bound.string()`, `bound.boolean()`, or `bound.list()` instead of using {@link bound()} itself.

- {@ref bound.number}
- {@ref bound.string}
- {@ref bound.boolean}
- {@ref bound.list}

As a special case, the {@link bound.not()} function produces the boolean 'not' of any value, also always resulting in a boolean value type.

- {@ref bound.not}

You can also include calls to the following _methods_ on a {@link Binding} object instead, e.g. after performing boolean logic (see below).

- {@ref Binding.asNumber}
- {@ref Binding.asString}
- {@ref Binding.asBoolean}
- {@ref Binding.asList}

## Binding list data {#lists}

Managed lists (i.e. instances of {@link ManagedList}) provide additional sources for bindings.

- To bind the list itself, simply use {@link bound()} or {@link bound.list()} — this can be used for the **items** property of a {@link UIList}, for example.
- To bind the number of items in a managed list, bind to `.count` — e.g. `bound.number("myList.count")`.
- To bind the first item in a managed list, bind to `#first` — e.g. `bound("myList.#first.foo")`.
- To bind the last item in a managed list, bind to `#last` — e.g. `bound("myList.#last.foo")`.

## Using default values for bindings {#defaults}

You can provide a _default_ value for bindings that will be used instead of an `undefined` bound property value.

To set a default value, use the second parameter of the {@link bound()} function(s).

- {@ref bound}

Alternatively, you can use the following methods to dynamically substitute a specified value when the bound value is equal (according to `==`) to true or false.

- {@ref Binding.select}
- {@ref Binding.else}

#### Example

The following code shows three different ways to add a default value in case the bound value is not defined.

```ts
// Use a default parameter to bound()
UILabel.withText(bound("document.name", "Untitled"));

// Use .else() - also replaces empty strings
UILabel.withText(bound("document.name").else("Untitled"));

// Use a string-formatted binding
UILabel.withText(bound("document.name").strf("%{?||Untitled}"));
```

To decide between two predefined values instead of a single default, use the {@link Binding.select select()} method.

```ts
UILabel.withText(bound("document.saved").select("Saved", "Modified"));
```

## Using boolean logic on bound values {#boolean}

You can further combine bindings into boolean combinations using the methods below. The result is a binding that updates when _either_ binding is updated, and returns the value that would be returned by JavaScript `!`, `&&`, and `||` operators.

- {@ref Binding.not}
- {@ref Binding.and}
- {@ref Binding.or}

#### Example

Combined boolean bindings are useful in many situations, such as for controlling the visibility of UI sections based on multiple properties, as illustrated below.

```ts
const view = UICell.with{
  UIConditional.with(
    { state: bound.not("isAnon").and("selectedCustomer") },
    // ...
  )
}
```

## Comparing bound values {#compare}

To compare bound values — either to a static value, or to _another_ binding, use the following {@link Binding} methods.

- {@ref Binding.matches}
- {@ref Binding.equals}

## Debugging bindings {#debug}

Bindings are updated asynchronously, and their current value may depend on the state of multiple properties. This makes it relatively difficult to debug bound value changes.

Use the {@link Binding.debug()} method to enable debugging _for a particular binding_. Afterwards, all updates to the bound value will be communicated to an event handler. The handler can log changes, for example to the console.

- {@ref Binding.debug}

> **Note:** When using the `.debug()` method, you'll always need to add your own event handler before the binding is used. Desk doesn't include a default binding debug handler. Refer to the example below.

**Troubleshooting** — If a binding isn't working as expected, check for the following causes (possibly using a binding debug handler).

- The source property may not exist at the time when the bound object is attached. Check that the property is initialized in the constructor (before the object with the binding is attached).
- The bound object isn't attached at all to the intended source object. This may be the case if the object is used (e.g. in a view) without being attached to its containing object, but instead to another object (such as another activity). When debugging, use the {@link ManagedObject.whence()} method to find out to which object(s) the bound object has been attached.
- The source object isn't a managed object, or one of the objects along the source path can't be observed. If needed, you can emit a change event (see {@link ManagedObject.emitChange()}) on one of the objects after writing to a property that can't be observed.
- The source property includes complex getters and/or setters. While getters and setters are usually handled correctly (if they are added before the binding takes effect), any side effects may cause the binding not to work as expected.

#### Example

Refer to the following example to learn how to add a binding debug handler, and debug one of the bindings in a view.

```ts
// do this once, e.g. in app.js
if (process.env.NODE_ENV !== "production") {
	Binding.debugEmitter.listen((e) => {
		let message = "--- Binding " + e.data.binding.toString();
		message += ": " + e.data.value;
		if (!e.data.bound) message += " [not bound]";
		app.log.debug(message);
	});
}
```

```tsx
// then, in a view, simply add .debug() to any binding:
export default (
	<cell>
		<conditional state={bound("customer").equals("selectedCustomer").debug()}>
			<label>Customer name: {bound.string("customer.name").debug()}</label>
		</conditional>
	</cell>
);
```
