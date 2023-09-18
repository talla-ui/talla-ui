---
title: Visibility
abstract: Understand how to show and hide UI containers and controls
sort: -3
breadcrumb_name: Guide
nav_parent: using
applies_to:
  - UIComponent
  - UIComponent.hidden
  - UIConditional
  - UIViewRenderer
  - UIContainer
  - UICell
  - UIRow
  - UIColumn
  - UIForm
  - UIScrollContainer
  - UISeparator
  - UISpacer
  - UIButton
  - UILabel
  - UIImage
  - UITextField
  - UIToggle
  - UIViewActivity.findViewContent
  - View.findViewContent
  - JSX
---

## Showing UI elements {#showing}

The recommended way to show (a tree structure of) UI components, is to use the UI component class as part of a view activity — refer to {@link ViewActivity} for an example implementation. UI components are usually defined statically, using the `.with(...)` method of any class that extends the abstract {@link UIComponent} or {@link View} classes.

- {@ref ViewActivity}
- {@ref UIComponent}
- {@ref View}

By utilizing a view activity class, you can easily initialize data (as properties of the view activity instance) and handle events emitted by the view using methods of your view activity class. View activities automatically show their associated views when activated.

Alternatively, it's possible to render UI components directly. This method is only recommended for very small applications. In these cases, use the {@link GlobalContext.render app.render()} method to render a view object, and handle any events on the view object itself using an {@link Observer} or {@link ManagedObject.listen()}.

## Hiding UI elements {#hiding}

To hide individual elements from view after rendering, you can make use of the {@link UIComponent.hidden} property.

In most cases, this property is _preset_ to bind it to a view activity property. For example, consider a {@link UICell} container defined using the following code:

```ts
UICell.with(
	{ hidden: bound.not("showFoo") },
	// ... cell content here
);
```

or using the following JSX code:

```jsx
<cell hidden={bound.not("showFoo")}>{/* cell content here */}</cell>
```

The resulting cell can be shown and hidden by manipulating the `showFoo` property on the containing view activity instance. Note the use of the `.not` filter on the {@link Binding} — you can also use any other filter to change the binding's logic or combine multiple values.

Note that UI elements may still be rendered to their platform-dependent representation (e.g. a DOM element) while they're hidden.

- Single UI elements such as controls will likely be rendered anyway, but hidden from view.
- Containers will likely be rendered, but their contents won't be rendered or updated.

## Using conditional views {#conditional}

To remove part of your UI conditionally, you can also wrap it inside of a {@link UIConditional} component.

The {@link UIConditional} component _creates and unlinks_ a preset view (instead of just showing and hiding it) depending on the current value of its {@link UIConditional.state state} property. When the state property is true, the encapsulated view is created and rendered; when the state property is false, the current encapsulated view (if any) is unlinked and removed from the on-screen output.

Of course, the encapsulated view is not displayed if the {@link UIConditional} object _itself_ is not part of a view that's currently rendered as well. Unlinking the {@link UIConditional} object also unlinks its contents, if any.

The recommended way to manipulate the `state` property is by binding it, for example to a property of the containing view activity.

```ts
const MyView = UICell.with(
	// ...
	UIConditional.with(
		{ state: bound.boolean("showFoo") },
		// ... UI components here
		UIColumn.with(UILabel.withText("Exists when showFoo is true")),
	),
);
```

## Finding nested view components {#finding}

After creating and showing a hierarchy of UI components, it's sometimes useful to find a _nested_ component. This may reduce the number of bindings and event handlers required to keep track of, or modify, properties of deeply nested components.

> **Note:** It's always recommended to use bindings and event handlers, or forms (see {@link UIFormContext}) to access UI component properties — for example, the input value of a {@link UITextField} component within your view. However, performance may be a concern (especially when dealing with long lists or very complex layouts), or code may become overly complex with bindings and event handlers for many different components. In such cases, finding nested components using the method below may be a good solution.

It's only possible to find nested view components by type. This may be a direct constructor (e.g. a preset constructor, the result of `.with(...)` on a UI component class) or a parent class, such as {@link UITextField}.

To get a list of all matching view components for a view activity, use the following method on the {@link ViewActivity} class:

- {@ref ViewActivity.findViewContent}

On any view component itself, for example the source of a UI event, you can also use the method provided by the {@link View} class:

- {@ref View.findViewContent}

Both methods are illustrated below.

```ts
class MyActivity extends PageViewActivity {
	// ...

	someMethod() {
		// find the current text input value
		let textField = this.findViewContent(UITextField)[0];
		let value = textField?.value;
		// ...
	}

	onHandleContainerClick(e: ViewEvent<UIColumn>) {
		// find the current input value
		// for a text field within the clicked column
		let textField = e.source.findViewContent(UITextField)[0];
		let value = textField?.value;
		// ...
	}
}
```

## Showing views attached elsewhere {#uiviewrenderer}

UI components are usually part of a strict component hierarchy: a view activity contains a single view component, such as a {@link UICell} object, which contains further containers and control component objects. These components are all attached to their parent component to form a single tree structure.

However, sometimes it may be useful to include views that aren't attached to a parent container. Instead, these view components may be attached directly to the same view activity, or even another activity. As long as they're only displayed once, views can be rendered and displayed using the {@link UIViewRenderer} component.

- {@ref UIViewRenderer}

You can also reference view _activities_ directly using a {@link UIViewRenderer} component. Note that the view activity still needs to be activated for its own view to be created. As long as the activity is active, the {@link UIViewRenderer} component will display the referenced activity's view, without needing to be attached to the parent UI component.

This pattern makes it possible to switch between multiple views dynamically, using a single binding for the {@link UIViewRenderer.view view} property of a {@link UIViewRenderer} instance; or to include view content that's managed outside of the current view activity.

To remove the view, clear the {@link UIViewRenderer.view} property by setting it to undefined.

```ts
const separateView = UICell.with(
	UIRow.with(UILabel.withText("Attached separately")),
);

const body = UICell.with(
	UIViewRenderer.with({
		// display view from 'separate' property
		view: bound("separate"),
	}),
);

class MyView extends PageViewActivity {
	static override ViewBody = body;

	// attach other view separately
	// (changing this property updates the view)
	separate = this.attach(new separateView());

	// ...
}
```
