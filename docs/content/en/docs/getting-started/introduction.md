---
title: Introduction
abstract: Start here to learn more about the Desk framework.
---

# Introduction

## What is Desk? <!--{#what-is-desk}-->

The Desk framework is a comprehensive JavaScript framework, built with TypeScript, designed for developing **interactive front-end applications**. It includes functionality for managing the application UI and handling user input, as well as common concerns such as internationalization, logging, and testing.

With an API that's inspired by popular desktop and mobile GUI frameworks, it's suitable for building **interactive**, **native-like** apps that run entirely on the **client-side**. This includes web apps, but also apps that are installed on a device, such as mobile apps or desktop apps.

Desk is developed as an open-source project on GitHub, with an MIT license. It's free to use, and doesn't have _any_ external (runtime) dependencies.

> **What is Desk not?**
>
> Unlike many other JavaScript frameworks, Desk is **not** a general-purpose tool for building websites. Even though it can be used to build apps that run in a browser, it doesn't provide a one-size-fits-all solution for rendering and serving arbitrary content.
>
> - It's not a templating engine or static site generator.
> - It doesn't render pages to HTML on the server.
> - It doesn't offer search engine optimization (SEO) features.
> - It doesn't provide a database abstraction layer.
> - It's not the right tool for building a corporate website, a blog, or an online shop.

For use on the web, Desk can still be _combined_ with other tools such as a CMS or static site generator in order to build a complete solution, with interactive client-side components that use the framework at runtime.

Great use cases for the Desk framework include:

- Immersive full-screen apps, as Single-Page Applications (SPAs) e.g. productivity apps, business apps, dashboards, e-learning, and customer portals. These applications usually require login and rely on client-side application logic for a responsive user experience (UX).
- Mobile apps, and mobile-first web applications.
- Complex forms, calculators, and other website components, e.g. support ticket or insurance claim forms, mortgage calculators, and chat widgets.
- Prototypes and MVPs. You can use Desk to quickly test ideas with a focus on user interaction. The framework provides good UI defaults with a minimal amount of setup. Static content can be moved to the server later, if needed.

## Architecture <!--{#architecture}-->

Just like other frameworks, Desk helps to break down application code into smaller pieces and remove boilerplate code for common tasks.

The architecture of a Desk application includes the following main parts:

- **Views** represent your user interface (UI), defining the layout, content, and appearance of your app. Views may be composed of other views, and can be nested to any depth. Desk includes several basic UI components out of the box, with configurable styles.
- **Activities** represent the logic behind different screens, dialogs, or other parts of your app. Each activity contains a view, providing it with data, and handling events.
- **Services** provide functionality that's shared between activities, including business logic, data access, and authentication.

Together, these parts take care of common tasks such as rendering the UI, handling user input, and managing application state while the user moves around your app.

A singleton **app** module is also available at all times, which represents the entire application. This includes methods for adding your activities and services, as well as navigation, logging, and more.

![Desk architecture](/docs/en/assets/desk-architecture.png)

Desk apps are **object-oriented**, and objects are organized into a single hierarchy at runtime (which includes the app itself, activities, views, and services). Within this hierarchy, you can use bindings and events to communicate between **attached** objects.

- **Property bindings** automatically observe and copy property data from a parent object to a contained object (one-way only, e.g. to update views when the activity is updated).
- Objects emit **events** that can be handled by containing objects (the other way, e.g. to handle user input).
- Objects can be **unlinked** from the hierarchy when they're no longer needed. This automatically clears event handlers and bindings, and unlinks further contained objects.

## Example <!--{#example}-->

Let's take a look at a practical example. While it's impossible to show the full power of Desk in just a few lines of code, the example below is a realistic starting point, and illustrates concepts that would also be used for a more complex app.

We'll make an app that shows a counter, and two buttons to increment or decrement the current count. The app should look like this mockup:

![Mockup of a counter app with a number and up and down buttons](/docs/en/assets/introduction-mockup.png)

Refer to the end of this section for a link to the online version of this sample app.

**Creating a view** — First, let's create a view. In a Desk app, views are defined _statically_, as a class that can be instantiated when needed using `new`. However, for basic views we don't use the `class` keyword at all: we can choose between JSX syntax or special `ui` functions.

The example below defines a view using JSX syntax. Note that the result (i.e. the `AppPage` variable) is still a regular JavaScript class.

```ts
// {@sample :sample-view-jsx}
```

The code below is functionally the same, using `ui` functions to create our view classes rather than JSX syntax.

```ts
// {@sample :sample-view}
```

In the example code, note the following:

- The view consists of UI elements (a text label and two buttons), and containers to arrange them. These view classes are included with the framework, and use default styles that are also included.
- The text for the `label` view depends on a **binding**. Therefore, the text will be updated automatically when the value of `count` changes in the containing object (see below).
- The `button` objects define _aliases_ for their Click event, which will allow us to handle both of these events using a unique name (see below).
- The label element has a **style** applied to it, which we'll need to define along with the view.

**Styling UI elements** — There are various ways to define a custom style, and you can also change the overall look of your app using a **theme**, discussed elsewhere in this documentation. Here, we _extend_ a default style and assign it to a new variable. The result is also a class (although we never need to instantiate it ourselves, it's only passed to `ui.label()` or `<label>`).

```ts
// {@sample :sample-style}
```

For simple styles that aren't reused, you can also use an inline style object. In this example, we could have just set the `style` attribute as below.

```ts
// {@sample :sample-inline-style-jsx}
```

**More complex views** — As your app increases in complexity, you'll likely break up your views into multiple files (sometimes called _partials_). Since views are defined as classes, you can combine them using standard JavaScript module imports.

For groups of UI elements that are reused throughout your app, you can also define **composite views**, or use activities to group views and business logic together. You can then display these views in different parts of your app.

**Creating the activity** — Next, we'll create an activity that contains the view above, and matches its bindings and events. To do this, we'll create a class that extends the `Activity` class, with a `ready()` method that shows our view, and event handlers to handle button clicks.

```ts
// {@sample :sample-activity}
```

This activity performs three main tasks:

- It contains (and initializes) the current state, i.e. the `count` property.
- It creates and renders the view when ready.
- It handles events from the view, incrementing or decrementing the count. Because the view includes a binding, the view will be updated automatically.

Notice that the code in the activity does **not** need to know what the view looks like — neither does the view code need to know what the activity does with its events. This _separation of concerns_ is an important concept in Desk, which makes the overall application more maintainable and easier to extend.

In our example app, this single activity can be created and _activated_ immediately, invoking its `ready()` method and displaying the view.

**More complex activities** — A larger, more complex app includes multiple activities that are activated and deactivated as the user moves around the application UI. Activities can also be nested, and created dynamically to show parts of the UI or display particular data. They can run background tasks synced to their lifecycle, and observe other parts of the application, including services.

In a web app, activities may respond to changes to the current URL (i.e. routing).

**Initializing the app** — Now that we have an activity and its corresponding view, we'll need to add it to the app when our code runs. The Desk app object itself automatically initializes the renderer (for now, just using the browser DOM — but other renderers may be available in the future).

```ts
// {@sample :sample-app}
```

**Compiling, bundling, and running** — The code above fits in a single file, but most real-world applications would be developed using multiple source code files, assets, dependencies, and configuration files — which all need to be compiled and bundled into a distributable output format.

The Desk framework doesn't depend on a specific build tool or bundler. Refer to the {@link tutorials Tutorials} section for more information on how to set up a complete project and deploy it to the web or a native runtime environment.

> **Run this app:** The finished app is available online HERE.

## Testing <!--{#testing}-->

Desk includes built-in functionality to test your application, including unit tests and integration tests.

By replacing the `useWebContext()` call to `useTestContext()` in the example above, we can _run the app from the command line_, without a browser. Instead of rendering the UI to a browser or other platform, or even simulating the DOM API, Desk simply keeps all view output in memory and allows us to query the result to validate that the output is correct.

The following example shows how to test our counter program, with integration tests that inspect both the activity instance and its view — simulating a button press to invoke one of the event handlers, and checking the new output.

```ts
// {@sample :sample-test}
```

## Other features <!--{#other-features}-->

Desk includes many other features that aren't demonstrated in the example above:

- Navigation and routing
- Modal dialogs and menus
- Form input and data validation
- Logging and error handling
- Task scheduling
- Internationalization (i18n)
- Themes, icons, and colors

For more information about these features, refer to the different sections of the documentation.

Many of these features can be accessed through the global {@link app `app`} object, making them discoverable and easy to use. Once you get started developing a Desk app, you'll also find that your code editor automatically shows inline documentation from the framework's included `.d.ts` files.

## Next steps <!--{#next-steps}-->

Refer to the following sections to continue your journey with Desk.

- {@link tutorials}
- {@link examples}
