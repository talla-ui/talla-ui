---
folder: topics
abstract: Start here to learn about views, UI components, and JSX.
---

# Views

## Overview <!--{#overview}-->

In a Desk application, views are represented as hierarchies, with objects of different types. Each view object is responsible for rendering a different part of the user interface (UI).

At runtime, your application may work with these objects directly, such as when handling events — but while developing your application, the view as a whole is is usually defined **statically**, using JSX syntax or functions. This means that the view's structure is defined using a set of classes and properties, evaluated just once, without `if` statements or other logic directly embedded in the view's code.

> **Note:** As you write views for your Desk application, you'll notice that the static nature of views enforces clear separation between the view's structure and its behavior. Keeping application logic separate from the view is one of the key principles of the Desk framework.

![View architecture](/docs/en/assets/views.png)

## Defining views <!--{#define}-->

A complete view is typically a large hierarchy of view objects, or _components_. Each component extends the abstract {@link View} class. This class itself is typed using the {@link ViewClass ViewClass<T>} type.

- {@link View +}
- {@link ViewClass +}

Defining a view hierarchy involves creating classes (i.e. {@link ViewClass} types), which represent 'instant' or _preset_ view objects that will be created when the view is rendered.

- Preset view classes include _preset property values_ that are used to initialize view objects with text, styles, and other visual attributes.
- Preset view classes can be _instantiated_ (or constructed) using the regular `new` operator. Typically this is done in an activity's `ready()` method, or (automatically) in a view composite's `createView()` method.
- After view objects are instantiated, {@link bindings} are used to keep them in sync with the application state. Bindings are also 'preset' on the class and take effect when the view is attached to a parent object (see {@link objects}).
- When the user interacts with UI elements, corresponding view objects emit {@link event-handling events}. On a preset class, you can specify a different event name, which makes it easy to distinguish the source of an event and handle it accordingly.

Preset view classes can be created using 'native' JavaScript syntax and various `ui` functions, or using JSX syntax.

```ts
// {@sample :preset}
```

### UI components

A number of different view components can be used within a view hierarchy:

- UI controls — these are basic building blocks such as buttons, labels, and text fields, that are rendered to the screen as discrete UI elements.
- Containers — these are used to group other components together and arrange them within the available space.
- Built-in view classes that wrap another view with additional behavior, such as for conditional or repeated (list) rendering.
- Custom view composites — similar to activities, composites contain other views and provide event handlers and properties that can be bound to the view's state.

The (statically defined) view hierarchy may contain a mix of these components, and may itself be broken up into partial views across multiple files.

## Controls <!--{#controls}-->

Controls represent individual UI elements, such as buttons, text fields, and labels. Once constructed, these are instances of classes such as {@link UIButton}, {@link UITextField}, and {@link UILabel}. These classes all extend the abstract {@link UIComponent} class.

- {@link UIComponent +}
- {@link controls}

Rather than constructing each view object individually, like `new UIButton()` or `new UILabel()`, we get help from several {@link ui} functions to create preset view classes (the `ui` object also provides many other functions that create view-related objects, such as colors and icons).

> **Note:** While the `ui` object is always available, you can also set up your project to use JSX syntax instead, replacing the `ui` function calls with JSX elements. For more information, see _Using JSX syntax_ below.

- {@link ui +}

```ts
// {@sample :controls}
```

## Containers <!--{#containers}-->

Containers place UI elements within the available screen space, either directly or by _nesting_ multiple containers. Containers are instances of classes such as {@link UIRow} and {@link UIColumn}. These classes extend the {@link UIContainer} class, which itself also extends the {@link UIComponent} class.

- {@link UIContainer +}
- {@link containers}

Just like with controls, we can use the `ui` object to create preset view classes for containers (or JSX, see below).

```ts
// {@sample :containers}
```

## Conditional rendering <!--{#conditional}-->

The _conditional_ view class wraps another (single) view, and renders it only when its `state` property is true. This means that you can bind this property to your activity, view composite, or view model, and change the view's visibility based on the application state.

A preset {@link UIConditionalView} class can be created using {@link ui.conditional()}.

- {@link UIConditionalView +}

```ts
// {@sample :conditional}
```

**Hiding views, or using conditional views** — Note that UI components (both controls and containers) also include a `hidden` property that can be set to `true` to hide the view. Instead of using a (preset) conditional view, you can bind this property to a value in your application state, e.g. using {@link bound.boolean()}.

Compared to conditional views (i.e. {@link UIConditionalView}), the difference is that conditional views _only create_ the encapsulated view object(s) when their state is true, whereas the `hidden` property exists on view objects that are _already created_. Especially for complex views with many subviews, that are not shown and hidden frequently, using a conditional view can be more efficient.

```ts
// {@sample :hidden}
```

## Repeating views <!--{#list}-->

The _list_ view class dynamically creates instances of a specific view for each item in a list, and inserts them into a container.

The list data is often bound (to an array, or a {@link ManagedList} object), and the list view in turn allows each _list item content view_ to bind to the list item for which they've been created (or a path, e.g. `bound("item.someProperty")`).

A preset {@link UIListView} class can be created using {@link ui.list()}.

- {@link UIListView}

```ts
// {@sample :list}
```

For more information on list views, refer to the following article.

- {@link list-views}

## Referencing other views <!--{#view-renderer}-->

The _view renderer_ view class references a non-attached view object, and renders it in place. A non-attached view is _not owned_ by the view renderer itself, and is therefore not directly part of the view hierarchy.

Usually, such views are **bound** from the containing activity or another activity: this is useful if you want to render a secondary view that's maintained by the same activity (but not part of the same view), or if you want to render a view that's owned by another activity — e.g. a sub activity, or a list-detail activity.

The view renderer makes it possible to create a 'portal' or use the containing view as a 'template', showing content that's referenced from another part of the application — while still enforcing a strict overall hierarchy.

A preset {@link UIViewRenderer} class can be created using {@link ui.renderView()}.

- {@link UIViewRenderer +}

```ts
// {@sample :view-renderer}
```

## Using bindings <!--{#bindings}-->

## Handling events <!--{#events}-->

## Rendering views <!--{#render}-->

## Finding views <!--{#find}-->
