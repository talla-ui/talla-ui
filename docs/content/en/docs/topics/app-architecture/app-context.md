---
title: App context
folder: topics
abstract: An overview of the functionality provided by the global application context.
---

# App context

> {@include abstract}

## Overview {#overview}

Along with all of the important classes and types that make up the Desk framework, the main package also provides the {@link app} object, which is a _singleton_ instance of the {@link GlobalContext} class. This object has two main roles:

- It serves as the _root_ of the application hierarchy, and references several other context objects that affect the application as a whole, such as activities and services.
- It provides commonly used functionality that controls the overall application, e.g. navigation, page and modal rendering, and logging.

The `app` object is created immediately, and is made available as a top-level import from the main Desk package.

- {@link app +}
- {@link GlobalContext +}

## Initializing the global app context {#global-context}

The functionality provided by the application context depends on the runtime platform in which your app is used, and needs to be _initialized_ before use.

- To initialize the app context in a browser (i.e. using the DOM API) you'll need to use the {@link useWebContext} function.
- To initialize a test with full app functionality (activities, rendering, etc.) you'll need to use the {@link useTestContext} function.
- Currently, no other platforms are supported — but with more platforms, each package would have to export an initialization function to set up its own context objects.

The `use..Context` functions take an `options` argument, which may either be an instance of the particular context's options class, or a function. The function is called with a _default_ options object, which can be modified to customize the context. The {@link ConfigOptions} base class of the options object is available for use elsewhere in your code, e.g. to configure a {@link services service} (refer to examples below).

- {@link ConfigOptions +}

After initialization, you can add activities and (optionally) services to the application hierarchy, and customize several other app elements; refer to each of the sections below.

### Initializing activities

To use activities effectively, they need to be added to the application hierarchy. Use the following method to add an activity directly to the app context.

- {@link GlobalContext.addActivity()}

This method adds the provided activity to the _activity context_, available as {@link GlobalContext.activities app.activities}. This object contains a list of activities, as well as a reference to the _navigation controller_ that handles platform-dependent logic for external navigation (see below).

For more information, refer to the documentation for {@link activities}.

### Initializing services

The app context also includes a method to register a service, so that it can be retrieved (or observed) by name — making it available to the rest of the application.

- {@link GlobalContext.addService()}

This method adds the provided service to the _service context_, available as {@link GlobalContext.services app.services}. This object manages the list of currently registered services.

For more information, refer to the documentation for {@link services}.

```ts
// you can chain method calls together:
useWebContext((options) => {
	// ... set up the app context using options
})
	.addService(new MyService())
	.addActivity(new MainActivity(), true);
```

## Using global app navigation {#navigation-controller}

Desk applications use a global navigation context, like a single-page web application that runs in a browser — even if the app is _not_ running in a browser (e.g. while testing, or in a native runtime environment).

The **navigation controller** encapsulates a simplified version of the browser's history API, with methods that can be called to navigate between paths, and to go back within the navigation history. Synchronous (non-blocking) versions of these methods are also available on the global `app` object.

- {@link GlobalContext.navigate()}
- {@link GlobalContext.goBack()}

The navigation controller itself is available as {@link ActivityContext.navigationController app.activities.navigationController}, and is overridden automatically depending on the runtime platform (e.g. the browser DOM) with a specific subclass of the {@link NavigationController} class.

- {@link NavigationController +}

## Rendering views {#rendering}

While the app is running, the `app` object is used to render the application's UI. Most commonly, an activity will render its view when ready (i.e. from the {@link Activity.ready()} method), using one of the methods below.

- {@link GlobalContext.showPage()}
- {@link GlobalContext.showDialog()}

```ts
class MyActivity extends Activity {
	// ...

	ready() {
		this.view = new MyView();
		app.showPage(this.view);
	}
}
```

### Predefined modals

The app context also includes methods to render predefined modal views, which can be used at any time — usually from event handlers within an activity. The alert and confirmation dialogs, as well as modal menus that are displayed, may be rendered using platform-specific UI elements or using a custom view. The {@link GlobalContext.theme app.theme} object includes options for customizing the appearance of these views.

- {@link GlobalContext.showAlertDialogAsync()}
- {@link GlobalContext.showConfirmDialogAsync()}
- {@link GlobalContext.showModalMenuAsync()}

```ts
// simple usage example:
app.showAlertDialogAsync("An error occurred");

// with options and i18n:
const errorDialog = new MessageDialogOptions(
	[
		strf("An error occurred: %[message]"),
		strf("The data could not be saved, please try again."),
	],
	strf("Try again"),
	strf("Cancel"),
	strf("Show details"),
);

app.showAlertDialogAsync(errorDialog.format(err));
```

> **Note:** While these methods can be used from anywhere in the application, they're typically only used from within an activity. Using these rendering methods from within services or models, for example to show error messages or perform data validation, is considered an anti-pattern and should be avoided.

### Custom rendering

To render a view in any other way, e.g. as a modal anywhere else on screen, you can use the following method.

- {@link GlobalContext.render()}

All of the `show` and `render` methods leave the heavy lifting to the platform-specific rendering context, which is referenced as {@link GlobalContext.renderer app.renderer}. This object is initialized automatically, as an instance of the following class.

- {@link RenderContext +}

### Animations

UI elements can be animated using the following method. There are also several other ways to introduce animation into your application — for more information, refer to the documentation for {@link animation animations}.

- {@link GlobalContext.animateAsync()}

## Customizing app behavior and styles {#customizing}

The app context refers to two other objects that are used to customize the application as a whole.

The {@link GlobalContext.theme theme} object is used to customize the appearance of the application. For more information, refer to the documentation for {@link themes-colors Themes and colors} and {@link icons icons}.

- {@link GlobalContext.theme}

Another important aspect of UI presentation beyond its appearance is text handling for internationalization (i18n). The {@link GlobalContext.i18n i18n} property refers to the current {@link I18nProvider} instance, which is used to translate and format strings automatically. For more information, refer to the documentation for {@link internationalization}.

- {@link GlobalContext.i18n}

## Registering log and error handlers {#log-error-handlers}

The app context includes functionality for sending log messages and errors to registered handlers. This functionality is provided by the {@link GlobalContext.log app.log} methods. By default, messages are sent to the console, but you can register a custom handler to send messages to a different destination such as a file or a remote server.

Use the following methods to register a custom log handler and/or error handler.

- {@link GlobalContext.addLogHandler()}
- {@link GlobalContext.setErrorHandler()}

For more information, refer to the documentation for {@link errors-logging errors and logging}.

## Other functionality {#other}

In addition to the methods and properties described above, the app context provides several other commonly used 'global' objects and methods. Refer to the documentation for each of these objects for more information.

- {@link GlobalContext.scheduler}
- {@link GlobalContext.log}
- {@link GlobalEmitter +}
