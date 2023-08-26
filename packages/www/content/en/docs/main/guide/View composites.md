---
title: Reusable view components
abstract: Learn how to create reusable views using presets or composites
breadcrumb_name: Guide
nav_parent: using
sort: -15
applies_to:
  - View
  - View.compose
  - ViewComposite
  - JSX
---

## Activities {#activities}

When breaking up an application into reusable parts, consider using view _activities_ rather than single view components. View activities encapsulate a view, along with data that can be bound to (nested) properties, and event handlers that are called automatically by name.

Note that view activities can also be included for display _within_ other views, using the {@link UIViewRenderer} component (or JSX `<view>` tag). This is the recommended method for creating reusable view components that _include business logic_ and need to refer to other application components.

- {@ref ViewActivity}
- {@ref UIViewRenderer}

## View composites {#composites}

To define reusable view components with their own (typed) `.with(...)` method, and without using a view activity, use the {@link View.compose()} method.

- {@ref View.compose}

The preset properties that can be passed to the resulting composite `.with(...)` method are made available to the function passed to {@link View.compose()}. Note that this function is usually still only called during the static initialization phase of the application, since it returns another _constructor_, not an object.

This method is particularly useful for defining complex reusable view components that display and/or manipulate a single value or simple data structure, without any business logic that interfaces with the rest of the application — such as a date picker or interactive containers (e.g. accordion, tab, split views).

```ts
const MyCard = View.compose(
	(p: { title: StringConvertible }, ...content: ViewClass[]) =>
		UICell.with(
			// use preset properties in the composed view:
			UIRow.with(UILabel.withText(p.title)),
			UIColumn.with(...content)
		)
);
```

View composites may also include event handlers and initialization methods. For more information and several examples, refer to the documentation for the {@link View.compose} method.

## Preset view classes {#presets}

For much simpler scenarios, where reusable view components just consist of a single UI component, you may also consider preset view classes.

The static `.with(...)` method is used to create a _preset_ view constructor. This constructor creates an instance of the view component with the specified properties and content.

```ts
const myView = UICell.with(
	{ background: UIColor.Yellow },
	UIRow.with(UILabel.withText("Hello, world!"))
);
```

Since the result of `.with(...)` is of the same class type, the resulting constructor can be used to define reusable view components.

```ts
const YellowCell = UICell.with({ background: UIColor.Yellow });

const myView = YellowCell.with(
	// content can only be preset once,
	// but properties can be added multiple times
	UIRow.with(UILabel.withText("Hello, world!"))
);
```

Preset constructors can be used as an alternative to styles and themes, or they can be _combined_ with styles to create constructors for components that have a specific style preset.

> **Note:** This pattern is not compatible with JSX syntax, since the necessary typing information isn't available on constructors defined using `.with(...)`.
