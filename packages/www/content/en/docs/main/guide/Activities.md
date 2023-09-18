---
title: Activities
abstract: Learn how to use activities for event handling, application logic, and routing
breadcrumb_name: Guide
nav_parent: using
sort: -20
applies_to:
  - GlobalContext
  - GlobalContext.activities
  - GlobalContext.addActivity
  - ActivationContext
  - Activity
  - ViewActivity
  - PageViewActivity
  - DialogViewActivity
  - ActivationPath
  - ActivationPath.Match
  - Activity.path
  - Activity.pathMatch
  - NavigationTarget
---

## Choosing an activity type {#activity-classes}

Activities are the primary way to handle events and implement application logic in an app. Each part of the application that represents a 'screen', 'page', or 'dialog' for the user to complete a task is typically implemented as an activity.

Most activities include a _view_, which is displayed when the activity is active, but this is not required — for example when an activity is used to contain several other related activities.

The following activity classes are included in the Desk framework.

- {@ref Activity}
- {@ref ViewActivity}
- {@ref PageViewActivity}
- {@ref DialogViewActivity}

Use a {@link DialogViewActivity} class to contain modal views, and a {@link PageViewActivity} class to contain page views. Other views, such as those that are displayed as part of page or dialog views, can be managed using a base {@link ViewActivity} class. For other activities, use the base {@link Activity} class and implement custom activation and deactivation logic.

## Creating an activity {#creating}

**Writing an activity class** — To create an activity, write a class that extends one of the activity classes listed above. The class may override any of the base class methods, and include a reference to the view constructor (see below).

```ts
class MyActivity extends ViewActivity {
	// ...
}
```

**Adding an activity to the application context** — In order to use an activity, it must be added to the application context hierarchy. This is done by calling the {@link GlobalContext.addActivity()} method, which adds the activity at the root level. Otherwise, you can attach the activity to another activity at runtime to 'nest' activities, using the methods provided by {@link ManagedObject}.

The {@link GlobalContext.addActivity()} method includes a parameter that, when set to true, automatically activates the activity when it is added to the context. Otherwise, you can activate the activity manually (see below).

- {@ref GlobalContext.addActivity}

```ts
// ... add this to your main app file
app.addActivity(new MyActivity(), true);
```

**Manually activating and deactivating an activity** — If an activity is not initially activated, and also not automatically activated using a path (routing; see below), you can activate it manually using the {@link Activity.activateAsync} method. Similarly, you can deactivate an activity manually using the {@link Activity.deactivateAsync} method. These methods return a promise that resolves when the activation or deactivation is complete.

- {@ref Activity.activateAsync}
- {@ref Activity.deactivateAsync}

Use the following methods to determine the current state of an activity.

- {@ref Activity.isActive}
- {@ref Activity.isActivating}
- {@ref Activity.isDeactivating}
- {@ref ManagedObject.isUnlinked}

**Handling lifecycle states** — The {@link Activity} class handles activation and deactivation asynchronously. As part of this process, it calls the following methods, which can be overridden to implement custom logic. These methods can be used to perform initialization and cleanup tasks, such as sorting or processing data before showing the view.

- {@ref Activity.beforeActiveAsync}
- {@ref Activity.afterActiveAsync}
- {@ref Activity.beforeInactiveAsync}
- {@ref Activity.afterInactiveAsync}

> **Note:** These methods may be used by base activity classes for their own purposes. When overriding these methods, always make sure to call the base class method using `super` before or after your own code.

In addition, you can use the {@link ManagedObject.beforeUnlink()} method to implement custom logic that runs when the activity is unlinked. Note that this method is called synchronously, unlike the methods listed above.

- {@ref ManagedObject.beforeUnlink}

## Nesting activities {#nesting}

Activities can be nested by attaching one activity to another using the {@link ManagedObject.attach} or {@link ManagedObject.observeAttach} methods. No particular behavior is enforced for nested activities, and nested activities can be activated and deactivated independently. Nested activities simply provide a way to organize activities into a hierarchy instead of having to add them all at the root level.

Only paths for automatic activation and deactivation (routing) are treated specially for nested activities, and they can also be used to implement navigation patterns — see below.

#### Example

The following code shows a nested activity, that in turn attaches a dialog view activity to itself.

```ts
class ParentActivity extends Activity {
	// ...

	// a (fixed) nested activity, activated independently
	readonly myActivity = this.attach(new MyActivity());
}

class MyActivity extends PageViewActivity {
	// ...

	async onSomeButtonClick() {
		// create and show a dialog view (defined elsewhere)
		let dialog = this.attach(new MyDialogViewActivity());
		await dialog.activateAsync();
		// ...
	}
}
```

## Working with views {#views}

In a Desk application, views are attached to view activities. The view activity is responsible for creating and managing the view, and for handling events emitted by the view. This functionality is provided by the {@link ViewActivity} class by default.

**Adding a view to an activity** — Since the view _instance_ is created automatically by a view activity, you need to provide a reference to the view _constructor_. This is done using the {@link ViewActivity.ViewBody} property. Afterwards, the view activity populates the {@link ViewActivity.view} property with the view instance, and renders the view automatically.

View constructors can be created using static `.with()` method calls or using JSX syntax. Refer to the {@link View} documentation for more information.

- {@ref ViewActivity.ViewBody}
- {@ref ViewActivity.view}

```ts
const page = UICell
	.with
	// ...
	();

class MyActivity extends PageViewActivity {
	static ViewBody = page;
}
```

In practice, the view constructor is imported from a separate file. Usually, full-page views are named `page` (as above, e.g. when imported from `page.tsx`), dialog views are named `dialog`, and other views are named after their purpose, or simply `body`. This is to distinguish view body constructors from _partial_ views that may be imported and included in other views.

**Defining placement options** — The {@link ViewActivity.renderPlacement} property is set by default only on {@link PageViewActivity} and {@link DialogViewActivity} classes. For custom view placement, this property should be set to an object with options that determine how the view is rendered by the (platform-specific) rendering context, e.g. using an ID using the DOM on a browser page, or as a modal layer. The object type is defined by {@link RenderContext.PlacementOptions}.

- {@ref RenderContext.PlacementOptions}

```ts
class DrawerActivity extends ViewActivity {
	// ...

	constructor() {
		super();

		// render to a modal layer
		// (position within layer is set by the view itself)
		this.renderPlacement = {
			mode: "modal",
			shade: UITheme.getModalDialogShadeOpacity(),
			transform: {
				show: "fade-in-right",
				hide: "fade-out-left",
			},
		};
	}
}
```

**Using view content** — After rendering, view components are available through the {@link ViewActivity.view} property. You can also use the {@link ViewActivity.findViewContent} method to find a component by type. For restoring focus, use the {@link ViewActivity.requestFocus} method.

- {@ref ViewActivity.findViewContent}
- {@ref ViewActivity.requestFocus}

## Writing event handlers {#event-handlers}

Since view objects are _attached_ to activities, events that are emitted by the view can be handled by the containing activity class.

To handle a particular event, create a method that starts with `on` and ends with the name of the event, and add it to the activity class. The method can be marked as `async` if needed, but don't append `Async` to the method name. The method is called with the event object as the first and only parameter.

> **Note:** The default event handling behavior based on method names is implemented by {@link ViewActivity.delegateViewEvent}. This method can be overridden to implement custom behavior.

#### Example

The following code shows an activity that handles a button click event. The event object is passed to the handler method as the first parameter.

```tsx
const view = (
	<cell>
		<primarybutton onClick="TestButtonClick">Click me</primarybutton>
	</cell>
);

class MyActivity extends PageViewActivity {
	// ...

	// Event handler, called when the user clicks the button
	onTestButtonClick(event: ViewEvent<UIButton>) {
		// ... handle the event
	}
}
```

## Using paths for automatic activation (routing) {#routing}

Activities can be activated and deactivated automatically using _paths_. Paths are compared against the application's _current_ path (platform-dependent, e.g. the browser's current URL path). As soon as the activity's path matches the current path, the activity is activated; when the path no longer matches, the activity is deactivated.

- {@ref Activity.path}

If the path starts with `./`, it is treated as a _relative_ path. Relative paths are added to the end of the attached parent activity's path (which may also be relative) to form the full path. Otherwise, the path is treated as an _absolute_ path, and is compared against the current path in full.

If the path ends with `/`, it matches both the path itself and any sub-paths. Otherwise, the path must match exactly.

#### Example

In the following example, the full path of the `MyActivity` activity becomes `one/two`. The path of the `ParentActivity` activity is `one`. Therefore, only one activity is active at a time. If the path for `ParentActivity` is changed to `one/`, both activities are active when the path is `one/two` — however since only one page view can be rendered at a time, this scenario would only make sense if either `ParentActivity` would not have a view, or if the view for `MyActivity` would be rendered inside the view for `ParentActivity` (e.g. using {@link UIViewRenderer}).

```ts
class ParentActivity extends PageViewActivity {
	path = "one";
	myActivity = this.attach(new MyActivity());
	// ...
}

class MyActivity extends PageViewActivity {
	path = "./two";
	// ...
}
```

## Handling complex path matches {#complex-paths}

**Path captures** — Path captures are used to extract values from the current path. They are defined within the path string using the `:` or `*` characters, followed by the name of the capture. For example:

- `customers/:id` — matches `customers/123`, `customers/456`, etc., with the `id` capture set to e.g. `123`, or `456`.
- `customers/:id/orders` — matches `customers/123/orders`, `customers/456/orders`, etc.
- `customers/*path` — matches `customers/123/orders`, `customers/456/profile`, etc., with the `path` capture set to e.g. `123/orders`, or `456/profile`.
- `customers/*path` does **not** match `customers` since `*` captures must match at least one character.

Captures can be retrieved from the {@link Activity.pathMatch} property, which is set as soon as the activity path property matches the current path. Internally, this is handled using the {@link ActivationPath.match} method, which can also be used to match paths manually.

- {@ref Activity.pathMatch}
- {@ref ActivationPath.match}

**Path match handlers** — Path match handlers are used to handle path matches that are more complex, or which require asynchronous logic. A handler can be added by overriding the {@link Activity.handlePathMatchAsync} method. The method is called with the {@link ActivationPath.Match} object (or undefined) as the first parameter, and should return a promise that resolves when the activity is activated or deactivated.

- {@ref Activity.handlePathMatchAsync}

#### Example

In the following example, the `MyActivity` activity is for paths such as `customers/123`. The `id` capture is extracted from the path and used to load customer data after activation. Note that this example shows a single (persistent) activity that handles all path matches by changing state in response to path changes.

```ts
class MyActivity extends PageViewActivity {
	path = "customers/:id";

	loading = false;
	customer?: Customer = undefined;

	async loadCustomerDataAsync(id: string) {
		// ... load customer data, set this.customer and this.loading
	}

	protected async handlePathMatchAsync(match?: ActivationPath.Match) {
		if (match) {
			if (match.id !== this.customer?.id) {
				this.customer = undefined;
				await this.activateAsync();
				this.loadCustomerDataAsync(match.id);
			}
		} else {
			await this.deactivateAsync();
		}
	}
}
```

In the next example, a single parent activity responds to path changes by instantiating a new child activity for each path match. The child activity is unlinked when the path no longer matches. You could extend this pattern to implement caching of child activities, or to implement a custom navigation stack.

```ts
class ParentActivity extends Activity {
	path = "customers/:id";

	customerActivity?: CustomerActivity = undefined;

	protected async handlePathMatchAsync(match?: ActivationPath.Match) {
		if (match) {
			if (match.id !== this.customerActivity?.customerId) {
				this.customerActivity?.unlink();
				this.customerActivity = this.attach(new CustomerActivity(match.id));
				await this.customerActivity.activateAsync();
			}
		} else {
			this.customerActivity?.unlink();
		}
	}
}

class CustomerActivity extends PageViewActivity {
	constructor(public customerId: string) {
		super();
	}

	loading = true;
	customer?: Customer = undefined;

	protected async afterActiveAsync() {
		// ... load customer data, set this.customer and this.loading
	}
}
```

## Handling navigation events {#navigation-events}

Navigation events provide a way for view components to request navigation to a different path or activity. These events are handled by the containing activity using the {@link ViewActivity.onNavigate} and {@link ViewActivity.handleNavigateAsync} methods, which can be overridden to provide custom navigation logic — e.g. to manipulate the window's history stack in a different way.

Other than custom view components, only the {@link UIButton} control emits navigation events by default: when the user clicks the button, and the button's {@link UIButton.navigateTo} property is set.

- {@ref ViewActivity.onNavigate}
- {@ref ViewActivity.handleNavigateAsync}

The base implementation of {@link ViewActivity.handleNavigateAsync} finds the target path using the `getNavigationTarget` method of the event source object. For {@link UIButton}, this method returns the value of the {@link UIButton.navigateTo} property, which may be set to a string, or an instance of {@link NavigationTarget}.

- {@ref Activity.getNavigationTarget}
- {@ref NavigationTarget}

#### Example

In the following example, the activity overrides the default navigation behavior. When the user clicks a (link) button, the handler uses {@link GlobalContext.navigate app.navigate()} to navigate to the target path, replacing the current history entry instead of adding another one.

```ts
class MyActivity extends PageViewActivity {
	// ...

	protected async handleNavigateAsync(target: NavigationTarget) {
		// replace the current path instead of adding another history entry
		app.navigate(target, { replace: true });
	}
}
```

## Setting the window title {#window-title}

You can set the window title for an activity by setting the {@link Activity.title} property. The title is set on the window (if possible) when the activity is activated, even for nested activities.

- {@ref Activity.title}

## Scheduling background tasks {#background-tasks}

To schedule background tasks that run while an activity is active, use an {@link AsyncTaskQueue} created using the {@link Activity.createActiveTaskQueue} method. The task queue is automatically paused when the activity is deactivated and resumed when the activity is activated.

- {@ref Activity.createActiveTaskQueue}
