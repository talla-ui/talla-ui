---
folder: topics
abstract: Learn how to use activities to define the behavior and state of each part of your application.
---

# Activities

## Overview <!--{#overview}-->

While _views_ define the visual appearance of your application UI, _activities_ define the **behavior** and **state** of a particular part of your UI — usually (but not always) an entire screen or a dialog.

- Activities create and manage views, showing and hiding them as needed.
- Activities contain event handlers for responding to user input.
- Activities expose the current state of the application to views (or nested activities), using properties, by referencing data, view models, or services.
- Activities can be _activated_ and _deactivated_ as the user navigates through the application, and new instances can be created and unlinked as needed.

> **Activities vs. Composite views:** As you learn about {@link views}, you'll notice that 'composite' views can also contain other views, and can be used to define the behavior and state of a (smaller) part of your application. However, view composites are not meant to contain _business logic_ or _state management_ — they're meant to be _reusable_ and only concerned with visual appearance. All business logic should be contained in activities, or (for more complex applications) in services or data models.

## Creating an activity <!--{#creating}-->

Activities are represented by classes that extend the {@link Activity} class.

- {@link Activity +}

```ts
class MyActivity extends Activity {
	// ... your code goes here
	someProperty = "";

	onSomeEvent(e: ViewEvent) {
		// ... handle an event
	}
}
```

Within the activity class, you can add properties and methods to define the activity's behavior and state.

- Public properties to expose and manage the current state
- Public methods to handle user input and other events (e.g. `onSubmit`, `onCancel`)
- Private methods to manage the activity's internal state, if necessary
- A `ready` method to initialize the activity's view
- Lifecycle methods to handle the activity's state transitions (e.g. `beforeActiveAsync`, `afterInactiveAsync`)
- A navigation page ID and navigation event handlers, for automatic routing

> **Always assign initial property values**
>
> To ensure that properties can be {@link bindings bound}, you should always assign an initial value to each (bound) property in the class definition, or in the constructor. Depending on the version of TypeScript or JavaScript you're using, declaring a property on a class without an initial value may not actually add the property to the activity object — making it impossible to bind to it.

## Registering an activity <!--{#adding}-->

The application context keeps track of all activities in the application, and ensures that they are activated and deactivated using the navigation path if needed.

To add an activity instance to the application, use the `app.addActivity()` method. If the second argument is set to `true`, the activity will also be activated immediately.

The application conmtext adds the activity to its _activity context_, available as `app.activities`, an instance of {@link ActivityContext}. The activity context ensures that activities are activated and deactivated based on the _navigation path_ (see below).

- {@link AppContext.addActivity}
- {@link ActivityContext +}

Normally, you'll add activities to the application context immediately after the app context has been initialized.

```ts
useWebContext();
app.addActivity(new MyActivity(), true);
```

## Showing views <!--{#showing-views}-->

Activities and views are both {@link objects managed objects}, and view objects are automatically _attached_ to the activity when assigned to the activity's `view` property. This ensures that each activity has at most a single view, and views are automatically unlinked — cleaning up any bindings and event handlers.

- Views should be created and assigned to `view` by the activity's `ready` method. This method is called when the activity is activated (see below), or when the renderer is updated (e.g. when the {@link themes theme} changes).
- After the view object is attached to the activity, all {@link bindings} are updated automatically, and the activity is ready to handle {@link event-handling events} from the view.
- To show the view, use the {@link AppContext.showPage showPage()} or {@link AppContext.showDialog showDialog()} methods of the app context.
- Views are unlinked automatically when the activity is unlinked **or** deactivated.

```ts
// {@sample :showing-views}
```

- {@link AppContext.showPage}
- {@link AppContext.showDialog}

> **Note:** The `ready` method may be called multiple times while the activity is active. You typically don't need to perform any additional checks to ensure that the view is shown only once, since creating the view object shouldn't have any side effects, and both of the above methods only ever render a single view once.

Under the hood, these methods use the {@link AppContext.render()} method, which in turn uses the platform-specific renderer (an instance of {@link RenderContext}) to update the application's UI. In practice, both of these are rarely used directly from application code.

- {@link AppContext.render}
- {@link RenderContext +}

## Activating and deactivating an activity <!--{#activating-deactivating}-->

In an application with a single activity, the easiest way to activate an activity is using the {@link AppContext.addActivity addActivity()} method of the app context, with the second argument set to `true`.

If there are multiple activities in your application, you can activate and deactivate them manually, **or** you can use navigation paths for automatic routing (see below). Activating an activity ensures that its view is shown (using the `ready` method), and deactivating an activity automatically removes its view.

The following methods are available to set the activity's state manually. These methods are `async` and return a promise that resolves only when the state transition is complete.

- {@link Activity.activateAsync}
- {@link Activity.deactivateAsync}

To check the current state of an activity, use the following methods.

- {@link Activity.isActive}
- {@link Activity.isActivating}
- {@link Activity.isDeactivating}
- {@link ManagedObject.isUnlinked}

### Handling lifecycle states

You can override the activity's _lifecycle methods_ to handle state transitions (asynchronously), and to perform any additional setup or cleanup as needed. These methods are called automatically when the activity is activated or deactivated, and the operation only completes when the promise returned by the 'before' methods is resolved.

- {@link Activity.beforeActiveAsync}
- {@link Activity.afterActiveAsync}
- {@link Activity.beforeInactiveAsync}
- {@link Activity.afterInactiveAsync}
- {@link ManagedObject.beforeUnlink}

```ts
// {@sample :lifecycle}
```

## Using paths for automatic routing <!--{#routing}-->

Desk provides a simple path-based routing mechanism that can be used to activate and deactivate activities automatically. Rather than providing full pattern matching and route parameters, the {@link NavigationController} class provides a simple abstraction that breaks down the current path into a single _page ID_ and a _detail_ string.

- The page ID is used to match the current path to a specific activity, using the activity's `navigationPageId` property.
- After activation, or while the activity is still active, the detail string is passed to the activity's `handleNavigationDetailAsync()` method, which can be used to handle additional routing logic.

Note that the detail string doesn't include the page ID itself, and may be empty or contain multiple parts depending on the platform. For specifics on the DOM platform, refer to the {@link web-navigation Web navigation} article.

- {@link Activity.navigationPageId}
- {@link Activity.handleNavigationDetailAsync}

```ts
// {@sample :routing}
```

## Handling navigation events <!--{#navigation-events}-->

In addition to reacting to external navigation changes (i.e. using the navigation path), activities may also be interested in navigation events that are triggered by the user from _within_ the current view. These `Navigate` events are emitted by buttons (links) with a special `navigateTo` property.

Navigation events are automatically handled by the default {@link Activity.onNavigate} method. The {@link Activity} class's implementation of this method calls the activity's own `navigateAsync` method with the intended target. You can override this method to handle navigation events differently (e.g. _replace_ the current page instead of pushing it on the navigation stack), or to prevent navigation from occurring.

- {@link Activity.navigateAsync}

```ts
// {@sample :navigate}
```

Note that the navigation _target_ is a {@link NavigationTarget} object which includes the intended page ID and detail to navigate to, and title text for the destination. This object can be retrieved using the {@link Activity.getNavigationTarget()} method (which uses the {@link Activity.title} property), or constructed manually to include a localized title for any page ID, detail, and title.

- {@link NavigationTarget +}
- {@link Activity.getNavigationTarget}
- {@link Activity.title}

> **Note:** The `title` property can be used to provide a localized title for the activity when the navigation target is passed to e.g. {@link UIButton.navigateTo}, and the platform renderer may also use this title to update the window or browser's title bar (if applicable).

## Scheduling background tasks <!--{#background-tasks}-->

Since activities are activated and deactivated as the user navigates through the application, they have a well-defined _lifecycle_. If you want to perform any tasks during the activity's lifecycle, you can use the following method to create a **task queue**.

- {@link Activity.createActiveTaskQueue}

A task queue provides a way to safely run asynchronous and synchronous tasks, in parallel, in sequence, or at a specific rate, handling and accumulating errors if needed. This is useful for tasks such as loading data using multiple requests, or submitting data in the background, while the activity is active. Synchronizing the task queue with the activity's lifecycle ensures that pending tasks are paused or stopped when needed.

```ts
// {@sample :schedule}
```

For more information about task queues, refer to the following article.

- {@link task-scheduling}
