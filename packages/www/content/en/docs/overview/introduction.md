---
output: docs/introduction.html
template: doc_article
title: Introduction
description: An introduction to Typescene's architecture
pageintro: Typescene is an object oriented front-end framework for interactive applications that helps to manage both the application state and the user interface.
---

## Application architecture {#architecture}

As an application framework, Typescene provides a collection of building blocks, or ‘components’ for creating interactive applications. You can import these components into your app in the form of JavaScript classes, and _extend_ them with your own application-specific code.

For a small website widget you may only need to define one or two components, whereas a complex enterprise tool may require hundreds. Either way, the resulting components are always based on the same Typescene classes and follow the same consistent structure, generally consisting of *views*, *activities*, and *services*:

* **Views** describe the user interface, as a tree structure of UI elements: buttons, checkboxes, text labels, rows and columns for layout, etc.
* **Activities** represent the underlying state, and define event handlers. A single application may contain one or more activities, reflecting the different ‘places’ within your app, such as different screens or popup dialogs. Activities are _activated_ independently to display their corresponding views automatically.
* **Services** provide access to the global state. You can think of these as objects that hold global variables and methods, accessible from elsewhere in your app. Services usually provide access to data, through Web APIs or a local database, but they may also serve another purpose, for example to provide localizations based on the user's language.

> **Note:** This architecture is designed for _interactive applications or widgets_ such as desktop or mobile ‘app-like’ experiences on a single page (SPA or Electron, for example), or interactive element(s) on a static webpage. In contrast to some of the most popular JavaScript frameworks, Typescene is _not_ a good fit for rendering entire Web pages with lots of content, such as blogs or corporate websites.  

## Components {#components}
Views, activities, services, and other components all play a specific role within an application, and Typescene includes a number of classes to provide this functionality. For example, a text label in the app's user interface is represented by the `UILabel` class, and an activity that displays a full-screen view is an instance of the `PageViewActivity` class. The entire app is an instance of `Application`.

These components work together using features that are defined by their common base class, the `Component` class itself. In particular, this class manages references _between_ components, allowing them to respond to _events_ emitted by other components, and _observe_ property changes. These features are available for all components, but not at the level of individual objects — components are connected at the **class** level.

In order for this to work, relationships between components (such as view elements, view containers, activities, services, and the application itself) are _declared_ at the time their classes are created. While this may seem a bit confusing at first, in practice it allows Typescene to efficiently map out the dependencies between components _upfront_ and reduce the amount of code required. Let’s go through an example to see how this works.

#### Example

In a Typescene application, the user interface (UI) is represented by view components, linked together in a tree structure that includes containers and visible elements — similar to the way HTML elements form a hierarchy on a Web page.

To _declare_ view components, Typescene supports both JSX syntax (which looks like HTML code within JavaScript) as well as ‘plain’ JavaScript syntax using method calls:

```jsx
// declaration using JSX syntax:
const view = (
  <centerrow>
    <label>Hello, world!</label>
  </centerrow>
);

// OR, without JSX syntax:
const view = UICenterRow.with(
  UILabel.with({
    text: "Hello, world!"
  })
);
```

Importantly, because this is a _declaration_, the resulting variable `view` only holds a reference to a **class**, not a component object. This class is created just once, and contains a ‘blueprint’ for creating view components. In Typescene, we call this a _preset_ constructor: a constructor that can be used to create components with predefined properties, as well as its own sub components.

To create an actual `UICenterRow` object (instance) that contains a `UILabel` object as described, we would need to use the `new` keyword with the preset view constructor:

```typescript
let myRow = new view();
```

However, in practice you (almost) never create view components like this, because those are created by an `Activity` component: once the user gets to a certain point in your app, the view is instantiated and displayed automatically. To link the view class to an activity class, we’ll need to declare a _preset_ activity constructor: a constructor that can be used to create an activity component that contains the specified view component.

```typescript
// declare a preset full-page activity:
const presetActivity = PageViewActivity.with(view);
```

An activity class without methods and properties isn’t very useful though, so we _extend_ the preset constructor directly using the `class` statement, just like you would extend any other class:

```typescript
// a preset activity class, linked to a view:
class MyActivity extends PageViewActivity.with(view) {
  path = "/";

  // ... properties and methods go here
}
```

> **Referencing services:** The activity class is a good place to refer to service components too, if needed. The activity defines the ‘behavior’ of the application, which often depends on the global _state_ (data) or communication with other systems. This can be done by declaring properties as [‘managed’ service references](/docs/concepts/services).  

In more complex applications, preset activity constructors can be linked to other preset activity constructors, creating a hierarchy of activities that represent the possible ‘places’ a user might find themselves in within the app.

Ultimately, all activities are linked back to the `Application` component itself. When the application is instantiated using `new`, it automatically instantiates linked activity components. In this case, there’s just one activity. The activity instantiates its view component, which makes “Hello, world!” appear on the screen.

```typescript
// declare an application that uses this activity:
class MyApplication extends BrowserApplication.with(MyActivity) {
  // ...
}

let app = new MyApplication(someHtmlElement);
app.activate();
```

### Bindings and events

So far, we’ve seen how views, activities, and application components can be connected — at the _class_ level, using the `with(...)` method to create preset constructors that link components to their sub components.

At the _instance_ level, i.e. once components are actually created, Typescene not only connects components in the right order, but also uses this information to provide a way for sub-components (or sub-sub-components such as the “Hello, world!” text label) to refer _back_ to their parent component(s):

- Components can **delegate** event handling to parent components’ methods, and
- Components can **observe** changes to parent components’ properties at runtime through _bindings_.

We can take advantage of this mechanism by adding properties to the component declaration (preset constructor), at the class level. Let’s use bindings and events to make our example a bit more dynamic.

#### Example

```jsx
// using JSX syntax:
const view = (
  <centerrow>
    <label onClick="addCount()">
      Count: {bind("count")}
    </label>
  </centerrow>
);

// OR, without JSX syntax:
const view = UICenterRow.with(
  UILabel.with({
    onClick: "addCount()",
    text: bindf("Count: ${count}")
  })
);
```

In this example, the label text has been replaced with a **binding**. This means that the value of a specified property of the _activity_ is observed, in this case the `count` property, and the value of the `text` property is updated accordingly whenever a change is detected.

Because Typescene ‘knows’ the relationship between the activity and its view components, and the preset view constructor now contains a binding, it automatically adds an _observer_ to the activity class — this exact one, for the exact properties that need to be observed once an instance is created. This reduces overhead, without requiring any further code in either the view or the activity component.

> **Note:** Bindings are not just used by views to refer to data on the activity instance. For example, the ‘activation context’ (which determines when activities should activate and display their views) is created by the Application instance, but since it’s _bound_ by all activities, each activity is able to observe navigation events and properties independently.  

The second change in the example above is the addition of a delegated **event handler**, specifically for the `Click` event on the text label. The `Click` event is emitted whenever the user clicks or taps on a view element.

Here, rather than writing code for an event handler directly in the view declaration, we just specify a method name, i.e. `onClick: "addCount()"`. This _delegates_ the event to the `addCount` method of the activity. This method is then called whenever the `Click` event is emitted, passing the event as a single argument.

Since we’ve added a `count` property and an `addCount` method, the activity might now look like this:

```typescript
// an activity that works with the view above
class MyActivity extends PageViewActivity.with(view) {
  path = "/";
  count = 0;
  addCount() { this.count++ }
}
```

The `addCount` method increments a counter whenever the label is clicked, which immediately gets reflected in the label text.

What’s important to note here, is that the activity never updates the view directly — it only modifies its own properties. Similarly, the view doesn’t contain any program code. This separation of concerns helps to make Typescene apps easier to maintain: the application’s looks and its behavior are mostly independent from one another, making it easier to correct issues on either side.

> **Note:** Sometimes it is necessary to add some ‘behavior’ outside of an activity, for example when creating reusable view components (like custom controls) that need to respond to user input visually, but don’t change any program state other than their own. For this purpose, Typescene provides the `ViewComponent` class, which works like an activity but can be used from within a view.  

### Conditions and lists

Bindings can be used for more than just keeping a text label up to date; when used with other properties and components, they are an incredibly powerful tool. Bindings can be combined using boolean logic, and filtered to transform the resulting value.

Bindings also allow parts of the view to be shown or hidden, and even to create and destroy elements in a list. This leaves _state management_ as a task for the activity, while the view contains just the blueprint for a visual representation of each state. When the activity (or `ViewComponent` in the case of reusable view elements) updates one or more properties to reflect its current state, the view can be updated in the following ways:

- For simply toggling visibility of a view component on and off, the `hidden` view property can be bound to one of the state properties. True means hidden, false or undefined means visible (not hidden).
- For larger view areas with multiple components, the `UIConditional` component can be used as a wrapper, to enable or disable rendering of all contained view components based on the value of a bound property.
- For style-only changes such as colors or font weights, the `UIStyleController` component updates a single view component’s styles on the fly, based on one or more possible states reflected by a single property.
- For lists, the `UIListController` renders its view content (a list 'cell') for _each_ element of a list, taken from a bound property.

View content declarations within a list cell may contain bindings to _both_ the (properties of the) list element as well as the original activity, and events delegated from the list cell itself are encapsulated in a _list cell event_ type that also includes a reference to the associated list element.

Each of these view components are described in detail in the API reference pages, as well as the documentation on [views](/docs/concepts/views).

> **Note:** When building lists, components are usually stored in special 'managed' lists rather than plain Arrays, to avoid issues with duplicates, gaps, and undefined values. Events can be handled for all components in a managed list at once. Refer to the detailed documentation on [components](/docs/concepts/components) for more information.

## Projects {#projects}

While small apps might contain only a single activity and view like the example above, large applications often consist of many activities, backed by complex interlinked data models.

With scalability in mind, it's a good idea to organize Typescene projects by activity (encapsulating the view) and service (encapsulating the data model), to be able to grow the application simply by adding folders for more activities (with views) or services (with models).

On disk, Typescene apps are often organized as follows — although this _isn’t required_ in any way:

* An **Activities** folder, with each activity in a separate sub folder
    * Each activity usually requires only a single class file,
    * Related views should be kept together with the activity, possibly referencing more (partial) view code in a separate subfolder.
* A **Services** folder, with services and model classes;
* A **Shared** folder, with shared classes and functions that are reused throughout the app; notably this includes custom view components as well, if they are used from different activities.

### Widgets

For existing (Web app or website) projects, the use of Typescene might be limited to a separate 'widget' that’s pulled in by one or more pages — as opposed to a Single-Page Application (SPA). Typescene facilitates this as well:

* The main view output of the application can be 'mounted' to a single DOM element on the page if needed, instead of filling the entire screen.
* Modal dialogs (popups) can be displayed e.g. after the user presses a button, which block input to the rest of the page while the app is active.
* Multiple applications may be created at the same time, each with their own set of activities. Each widget could therefore maintain their own state, while still sharing data through services.

### Deployment

To run a Typescene app, it’s necessary to compile and _bundle_ all of the code into a single `.js` file, possibly including the Typescene library code itself. Different bundlers exist to handle this process, many of which are usable out of the box.

The recommended way of getting started with a new Web application is using the [`create-typescene-webapp`](/docs/installation#create) tool, which installs a bundler and configures it appropriately for a new single-page Typescene app. Afterwards, the configuration can be changed to suit the needs of each project.

Alternatively, a pre-compiled [UMD module](/docs/installation#html) (a plain .js-file that works in the browser) is also made available, which may be more suitable for use with apps that are included on existing websites.

---

### Next steps

Now that you're familiar with the basics, you can take the following steps:

* Follow a practical approach and [create an app](/docs/installation) to experiment with.
* Alternatively, learn more about [components](/docs/concepts/components) for a detailed understanding of how they work, before moving on to [activities](/docs/concepts/activities) and [views](/docs/concepts/views).

