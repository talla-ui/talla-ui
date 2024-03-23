---
title: Bindings
folder: topics
abstract: Learn how to use bindings, to communicate property changes between attached objects.
---

# Bindings

> {@include abstract}

## Overview {#overview}

In a Desk app, bindings are used to handle changes to property data — for example to update the UI when the state of an activity changes, or when a property of a view model is updated.

**Why?** — Bindings are a powerful tool for keeping the UI in sync with the rest of the application, while keeping business logic out of the view. Bindings also have their place in other parts of a complex app, such as services and data or view models, as a means to _decouple_ different parts of the application.

This way, it's easier to distinguish between objects that contain business logic, _providing_ data (properties), and objects that _consume_ this data (using bindings), such as views. As an application grows, this separation of concerns becomes increasingly important.

**Implementation** — Bindings are applied to {@link objects managed objects}, and watch for changes to attached 'parent' objects and their properties. When an object is attached, and a property with a specified name is available on a parent (or parent's parent, and so on), the binding starts to observe the source property. From there, the binding typically updates a bound target property directly.

Hence, the source object is always the _first parent in the managed object hierarchy that provides a property with the specified name_. If the target object is not attached yet, or none of the parents have a property with the specified name then the binding is 'unbound', and will be reevaluated each time a _new_ parent is attached further up the hierarchy.

In addition, bindings provide the following features:

- **Source paths** instead of single property names can be used to watch _nested_ properties instead of a single property.
- **Filters** can be added to manipulate or combine bound values.
- **Callback** functions can be used to handle source updates, rather than setting a target property directly.

## Creating a binding {#create}

To create a binding, you can use the {@link bound()} function (or one of the specific functions for the type of value you want to bind to, see below). This function returns a {@link Binding} object that you can use to configure the binding further, if needed.

- {@link bound +}
- {@link Binding +}

Bindings are commonly used to set view properties dynamically — keeping business logic and calculations out of the view. View properties can be bound simply by passing the result of the {@link bound} function directly to the `ui` method. In JSX code, you can use the `bound` function directly in the JSX expression, or use the text binding syntax (see below).

```tsx
// bind to the text property of a label
ui.label({ text: bound("name") });
// ... or
ui.label(bound("name"));

// same in JSX, using a property
<label text={bound("name")} />

// ... or using text syntax
<label>%{name}</label>
```

> **One-way only**
>
> It's important to understand that bindings only update data **one-way**. After applying a binding, changing the source property immediately updates the target property — however, setting the target property to another value doesn't affect the source property in any way.
>
> The Desk framework doesn't include a facility for two-way bindings, on purpose. To communicate data back to the source object (e.g. user input) you can use events. For form input (a very specific would-be use case for two-way bindings) Desk provides the {@link form-context form context} view model.

## Setting the binding source {#source}

The first argument to the {@link bound} function(s) is the binding **source**.

**Single property** — In most cases, the binding source is the name of a single property that will be observed on the source object.

For example, `bound("name")` represents a binding that looks for a `name` property on one of the target's parent object(s), takes its value, and watches for changes.

Under the hood, this upgrades the source property with a JavaScript _getter and setter_ that allow the binding (as well as any other bindings and/or observers) to handle changes transparently to the rest of the application.

**Nested properties** — You can use the dot notation to bind to nested properties.

```ts
bound("customer.name");
bound("items.count");
bound("p.foo.bar");
```

- Each property is observed individually, where possible, but only the first property is used to find the source object (i.e. the first parent object that includes a `customer` property in the first example).
- If any of the properties along the path is undefined, null, or an object that doesn't include the next specified property, then the bound value itself becomes `undefined` — i.e. any binding for a source that can't be found resolves to undefined until _all_ properties along the source path are defined.
- If a property references a managed object, the next property in the path is observed for changes. The managed object itself is also observed to handle change events (see {@link ManagedChangeEvent}).
- On other objects, the bound value only updates when the previous property changes or when a change event is emitted. E.g. if `p` is a managed object, but `foo` refers to a plain JavaScript object, then the value of the `p.foo.bar` binding is only updated when `p` is set, `p.foo` is set, or a change event is emitted on the `p` object — since `bar` itself can't be observed on a non-managed object.

Note that nested property bindings also work with any of the methods described in the next sections, e.g. `bound.not("customer.isQualified)` and `bound.string("p.foo.bar").matches("X")` work as expected.

## Specifying bound value types {#bound}

You can use the following functions to explicitly convert bound values to a particular type. E.g. `bound.number("x")` represents a binding for a number value (or NaN) even if the source property is undefined or of another type.

- {@link bound.number}
- {@link bound.string}
- {@link bound.boolean}

In the same vein, you can use the {@link bound.not()} function to create bindings that **negate** a particular value, using JavaScript boolean logic (i.e. the resulting binding is _true_ if the source value is false, undefined, the number zero, or an empty string).

- {@link bound.not}

In practice, boolean bindings are useful for hiding and showing views based on a particular condition. Apply a (negated) binding to the `hidden` property of a UI container, or the `state` property of a {@link UIConditionalView} view composite, and that part of your view will be shown or hidden depending on the value of an Activity property.

{@import :hidden}

> **Tip:** You don't need to bind to a boolean value to be able to show or hide a section of your view. Any value that's 'falsy' or 'truethy' will do — which includes strings, numbers, and references to objects. For example, you can hide a section with customer details when the `customer` property of your activity is undefined, rather than having to add an explicit `showCustomerDetails` property.

You can also convert bound values using the following methods of the {@link Binding} class if needed.

- {@link Binding.asNumber}
- {@link Binding.asString}
- {@link Binding.asBoolean}

To declare a _type_ in your code that represents either a value or a binding of the same type, you can use the `BindingOrValue<T>` type. This is mostly useful for {@link views view composite preset types}, and is often used by {@link UIComponent} subclasses themselves that use the {@link View.applyViewPreset()} method.

- {@link BindingOrValue +}

## Binding to list data {#list}

To bind _explicitly_ to list data — i.e. an array, Map, or {@link ManagedList} object — you can use the {@link bound.list()} function. This returns a {@link Binding} that's guaranteed to be _iterable_ using a JavaScript iterator, which is especially helpful for use with {@link list-views list views}. If the source value isn't iterable, the value of the resulting binding is set to `undefined` instead.

- {@link bound.list}

### Managed list property bindings

As a special case, you can refer to the first and last items in a **managed list** (see {@link ManagedList}), as well as the number of items in a list using the dot notation in the source path.

- `bound("someList.count")` — binds to the number of items in the list referenced by `someList`, updated whenever the list is changed.
- `bound("someList.#first")` — binds to the first item in the list (also allows for nested properties by continuing the path after `#first`, e.g. `someList.#first.name`).
- `bound("someList.#last")` — binds to the last item (and nested properties).

The following example view uses a binding to populate a list, as well as a binding for `count` to show an alternative view when the list is empty. Also note that within the `<list>` view (i.e. {@link UIListView} view) the item itself and its properties can be bound using the `item` property.

{@import :list}

## Setting default values {#default}

You may have noticed that the `bound` function, as well as e.g. `bound.number` accepts a second argument that's called `defaultValue`. Use this argument to specify a value that's used instead of `undefined` — whenever the bound value would be undefined **or** null (under the hood, the `??` operator is used to determine the final value).

- {@link bound}

```ts
bound("totalQuantity", 0);
bound("userName", "?");
```

> **Note:** Some view properties don't need to be initialized with a default value rather than undefined. For example, if the {@link UILabel.text} property is set to undefined or null, the label is just rendered as 'empty', which is the same as if this property was set to an empty string.

Alternatively, use one of the following methods to supply a different value based on the boolean equivalent of the bound value.

- {@link Binding.else}
- {@link Binding.select}

With these methods, you can set a default value that's used when the bound value is undefined as well as false, zero, an empty string, etc — or the opposite (i.e. override the value when it's not 'falsy'). Some examples:

```ts
bound.number("total").else("-");
bound.string("name").else(strf("(Untitled)")); // use strf for i18n
bound.boolean("inactive").select(ui.icon("x"), ui.icon("check"));
```

## Using boolean logic on bound values {#boolean}

With the below methods, you can **combine** multiple bindings into a single value. Internally, this creates two separate bindings that independently observe their source properties. Whenever one or both of these bindings change their values, the resulting binding is also updated; using either the `&&` or `||` operator to derive the result. Note that the resulting bound value isn't a boolean, since `&&` and `||` may return one of their operands.

- {@link Binding.and}
- {@link Binding.or}

These methods can also be further combined with the {@link Binding.not not()} method for more advanced boolean logic.

```ts
// combine `showDetails` and `item.detail` bindings:
bound("showDetails").and("item.detail");

// this also works with non-boolean values, e.g. lists:
bound("filteredItems").or("allItems");

// you can provide an explicit binding:
bound.not("showDetails").or(bound.not("item.detail"));
// ... and sometimes you can simplify:
bound("showDetails").and("item.detail").not();
```

## Comparing bound values {#compare}

For direct comparisons, you can use the following {@link Binding} methods. While {@link Binding.matches matches()} compares a bound value with one or more _literal_ values, the {@link Binding.equals equals()} method creates (or uses) a second binding and compares the values of both bindings each time one or both of the bound values are updated. The result is always a boolean value in either case.

- {@link Binding.matches}
- {@link Binding.equals}

> **Note:** These methods only support _direct_ comparisons using the `===` operator, and there are no further methods for other comparisons like greater-than, less-than, etc. These are left out on purpose, to avoid adding business logic in the wrong place. If it seems like it would be useful to have comparative bindings, this is usually an indication that business logic is leaking into the view — consider adding such code to the activity (or view composite) instead, or use a dedicated view model.

## Binding to text values and formatted strings {#text}

There are several ways to produce bindings that observe or produce text values. Each of these different options add some functionality on top of a basic `bound("textProperty")` call.

**Single string value with empty string fallback** — If you're binding to a property that should be a string or a value that can be converted to a string, but which may sometimes be undefined, you can avoid the conversion to `"undefined"` (as a string) by using {@link bound.string()}. The bound value of the resulting {@link Binding} will always be a string, and is set to an empty string if the source value is undefined or null.

- {@link bound.string}

**String value conversion, with optional format** — You can also convert a value to a string, changing undefined or null to an empty string, using the {@link Binding.asString()} method. This method can be used as a 'filter' on top of an existing binding, e.g. the result of {@link Binding.and()}.

This method takes an optional second parameter, which is used as a formatter. The format string (placeholder) can be one of the common C-style `sprintf` placeholders or a custom one — refer to {@LazyString.format} for details. Note that the `%` sign should _not_ be included in the format string.

- {@link Binding.asString}

```ts
bound("item.name").asString("uc"); // uppercase
bound("totalValue").or("value").asString(".2f"); // float
```

**Single value included in a format string** — If you need to _include_ a single bound value in a string, you can use the {@link Binding.strf()} method.

- {@link Binding.strf}

```ts
bound("userName").strf("Hello, %s");
bound("item.name").strf("Name: %{uc}");
bound("totalValue").or("value").strf("Total %.2f");
```

> **Note:** This method, as well as the other methods below result in a {@link LazyString} instance. This class provides localization and translation features, allowing the resulting string to be translated and formatted for use with other locales. Refer to the documentation about {@link internationalization} for more information.

**String-formatted binding** — To create a binding that uses a format string together with one or more dynamic (bound) values, without having to use a 'filter' like with the {@link Binding.strf()} method, you can create a {@link StringFormatBinding} instance directly. This class is a subclass of {@link Binding}, but relies on one or more other {@link Binding} instances to observe and update the resulting string value.

The syntax of the format string is the same as for the argument of {@link Binding.strf()}, since string-formatted bindings also use {@link LazyString} to insert all bound values into a string. The other arguments can be either binding source paths, {@link Binding} instances themselves, or an object with multiple bindings for use with the `%[property]` syntax.

- {@link bound.strf}
- {@link StringFormatBinding +}

```ts
// using binding source paths:
bound.strf("Today is %s", "dayOfTheWeek");

// using an object argument and property syntax:
bound.strf("%[user] is %[age] years old", {
	user: bound("user.name", strf("Unknown user")),
	age: bound.number("user.age").else(99),
});
```

## Binding text using JSX syntax {#jsx}

Within views that use JSX syntax, text that's passed to e.g. labels and buttons is scanned for `%[...]` placeholders. If one is found, a string-formatted binding is created automatically with the text as the format string (to include bindings with the specified source paths).

For more information, refer to the documentation for JSX views.

- {@link views}
- {@link ui.jsx}

{@import bindings:jsx}

## Binding properties outside of views {#bindTo}

Many of the above examples have been focused on bindings that are applied to view properties. However, bindings also work outside of views, and have many use cases in e.g. activities and services.

To apply a binding to any managed object, use the {@link Binding.bindTo()} method. Using this method, you can either update a specific property or invoke a callback function with each update.

- {@link Binding.bindTo}

This method is usually called from the target object's constructor.

```ts
class MySubActivity extends Activity {
	constructor() {
		super();

		// bind to a property of the parent activity
		const binding = bound("selectedCustomer");
		binding.bindTo(this, (value) => {
			// ... handle (new) value of parent property
		});
	}

	// ...
}
```

## Debugging bindings {#debug}

Bindings are meant to do their work _automatically_ and _transparently_ to the rest of the application. However, this makes it difficult to see whether the right values are being applied at the right time, or even if a binding is working at all.

To debug a particular binding, you can use the {@link Binding.debug()} method, which adds a 'filter' to a binding that doesn't change its value, but instead logs its current state to a global event emitter.

- {@link Binding.debug}

Before you can see any debug output or set a breakpoint, you'll need to add a listener to the {@link Binding.debugEmitter} global event emitter. Refer to the following code for an example implementation.

{@import bindings:debug}
