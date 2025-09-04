---
alwaysApply: true
---

# Quick Start

Tälla UI is a client-side framework for building interactive applications using JavaScript or TypeScript with a focus on scalability and separation of concerns, featuring a declarative UI builder approach. It has no runtime dependencies, and uses Vite/Vitest tooling, with an in-memory test renderer.

Use this guide to get started. For more details, refer to JSDoc comments from Tälla UI type definitions.

## Installation

```bash
npm install talla-ui @talla-ui/web-handler @talla-ui/test-handler --save-dev
```

Install a bundler such as Vite to configure development, testing, and bundling scripts. Follow the instructions for your bundler to get started.

## Usage

Start and configure the application in `main.ts`.

```typescript
import { useWebContext } from "@talla-ui/web-handler";
import { FooActivity } from "./activities/foo/FooActivity.js";

// Create and configure the app
const app = useWebContext((options) => {
	// ... configure options here, e.g. theme colors
});

// Add an activity to the app, activate it right away (see below)
app.addActivity(new FooActivity(), true);
```

Create a first activity to contain application logic.

```typescript
import { Activity } from "talla-ui";
import { FooView } from "./FooView.js";

export class FooActivity extends Activity {
	// A view for displaying the activity's screen
	static View = FooView;

	// State goes here, using public properties
	count = 0;

	// Event handlers go here, as protected 'on...' methods (optional argument)
	protected onCountUp(e: ViewEvent) {
		// ... update state, which automatically updates view bindings
		this.count++;
	}

	// Other logic can go here using private methods
}
```

The view is written declaratively, using a fluent API, and coupled to the activity using _bindings_ that refer to properties by name. The result is a _view builder_, not a view itself. Because of their static nature and special status, functions returning view builders are named with a capital letter, even if they're not classes/constructors.

Since this code runs only once, it _does not_ include any runtime logic, including event handlers. The application state is reflected using bindings, and user events are emitted to the activity to invoke the appropriately named method.

```typescript
import { Binding, UI } from "talla-ui";
import type { FooActivity } from "./FooActivity.js";

export function FooView(v: Binding<FooActivity>) {
	return UI.Column.align("center").with(
		UI.Label("Counter").labelStyle("title"),
		UI.Label(v.bind("count")).fontSize(24),
		UI.Row(
			// Don't include complex event handling in the view, emit named events instead
			UI.Button("Up").icon("plus").onClick("CountUp"),
			UI.Button("Down").icon("minus").onClick("CountDown"),
		),
	);
}
```

## Application Architecture

Apply the following strategy when writing code for Tälla UI. Do NOT think of the application as a React-like collection of components: the architecture is much shallower to keep _all_ business logic in activities, and avoid early optimization.

- Think of views and activities as 'what the user sees' and 'what the app does' for a particular screen, dialog, or other part of the UI.
- With the view in mind, design the required state including raw data and derived values (e.g. `user` record, `items` list, `allCompleted` boolean property). Prefer exposing pre-computed or filtered state in the activity, over mapped bindings in the view.
- Scaffold the activity class with the expected properties, methods to initialize/update the state, and event handlers.
- Create the view builder hierarchy. To break up the view, export partial view builders in separate files. For layout, stick with a basic column/row hierarchy, closer to native app design (SwiftUI, WPF, JFX, etc.) than web design (HTML, React, etc.). AVOID premature optimization, it's fine to repeat view sections a few times if needed.
- Use further architecture tiers where appropriate, e.g. interface layer to centralize network requests.
- Use a single entry point for code related to application startup, configuration, and resource initialization (e.g. icons).

Example file structure:

- `main.ts` - entry point
- `activities/settings/SettingsActivity.ts` - activity (`export class SettingsActivity`...)
- `activities/settings/SettingsView.ts` - main view (`export function`... returning a view builder)
- `activities/settings/SettingsView_Profile.ts` - partial view (`export function`...)
- `shared/widgets/SectionCard.ts` - reusable view (`export function`...)
- `shared/layouts/MainPage.ts` - reusable layout view (`export function`...)
- `resources/icons.ts` - icon resources (e.g. re-export from package)
- Other folders for models, services, infrastructure layer, etc.

## Basic Activities

Activities represent a single screen, dialog, or other 'place' in the application.

```typescript
export class MyActivity extends Activity {
	// ... View, state, event handlers, etc.

	// lifecycle methods, if needed:
	protected async beforeActiveAsync() {}
	protected async afterActiveAsync() {}
	protected async beforeInactiveAsync() {}
	protected async afterInactiveAsync() {}
	protected beforeUnlink() {}
}

// managing the activity lifecycle:
await activity.activateAsync();
await activity.deactivateAsync();
activity.unlink(); // synchronous
activity.isActive();
activity.isActivating();
activity.isDeactivating();
activity.isUnlinked();
```

Activities can be activated immediately when added to the application context, or later using the `activateAsync` method. They are also automatically activated when the navigation path matches the activity's path.

```typescript
export class MyActivity extends Activity {
	navigationPath = "my/path";

	protected async onSomeEvent() {
		await this.navigateAsync("my/other/path"); // navigate to another activity
		// or app.navigate("...") from outside activity
		// or use UI.Button("...").navigateTo("...")
	}
}
```

## State Management

Application state is managed by activities, similar to a view model in MVVM architectures. The activity exposes its state using public properties, observed through bindings.

```typescript
class MyActivity extends Activity {
	constructor(public readonly messageService: MessageService) {
		super();
	}

	// Properties are observable (but not getters)
	count = 0;

	// Computed state (object with the returned properties)
	messages = this.createActiveState(
		[
			bind("filter"), // binds to an activity property
			bind("messageService"), // listens for change events
			bind("messageService.messages"), // nested property changes
		],
		(service, filter, messages) => {
			// Return the computed state object
			return {
				visible: service.filterMessages(filter),
				numMessages: messages.length,
				hasMessages: messages.length > 0,
			};
		},
	);

	// ...
}
```

## Events

Activities receive all events from views. This way, the activity typically updates the state, which automatically updates view bindings.

Views listen for events and emit then using a specific name (and optionally data), e.g. `UI.Button("Up").onClick("CountUp")`, `UI.Button("Home").onClick((_, button) => button.onClick("SelectTab", { tab: "home" }))` or `UI.Cell().allowFocus().onFocusIn("SelectItem")`.

```typescript
import { Activity, UITextField, ViewEvent } from "talla-ui";

export class MyActivity extends Activity {
	// ...

	protected onSelectTab(e: ViewEvent) {
		let tab = e.data.tab;
		// ...
	}

	protected onTextInput(e: ViewEvent<UITextField>) {
		let tf = e.source; // typed as UITextField
		let value = e.data.value;
		// ...
	}
}
```

## Nested Activities

Activities don't always need to be added to the application context directly. New activities can be attached manually (e.g. dialogs) or automatically to facilitate routing.

```typescript
export class BooksActivity extends Activity {
	navigationPath = "books";

	// ...

	// Called when the navigation path matches, with remainder of path if any
	matchNavigationPath(remainder: string) {
		// return true to activate this activity
		// return false to not activate, or deactivate
		// return an activity to activate both this and the nested activity
		return new BookActivity(remainder);
	}
}
```

Note that the `matchNavigationPath` is synchronous, and the nested activity should handle loading states and errors (e.g. if the remainder passed here as an ID is invalid).

Normally, all activities are rendered as scrollable 'pages'. However, the 'none' render mode should be used if the parent activity is going to render the nested activity's view instead, i.e. for list-detail views.

```typescript
export class BooksListActivity extends Activity {
	static View = BooksListView;

	navigationPath = "books";

	// The nested activity is rendered by the parent view
	// i.e. UI.Show(bind("detail.view"))
	detail?: BookActivity;

	matchNavigationPath(remainder: string) {
		this.detail = new BookActivity(remainder);
		this.detail.setRenderMode("none");
		return this.detail;
	}

	// Override navigation mode to replace, not push on stack
	protected async navigateAsync(target: StringConvertible) {
		if (!String(target).startsWith("books/")) {
			return super.navigateAsync(target);
		}
		await app.navigation.navigateAsync(target, { mode: "replace" });
	}
}
```

The 'dialog' render mode can be used to display the view inside of a modal dialog wrapper. Dialogs should be encapsulated by activities, and shouldn't be created outside of other activities.

```typescript
export class MyActivity extends Activity {
	// ...

	protected async onSomeEvent() {
		let dialog = await this.attachActivityAsync(new DialogActivity());
		for await (let e of dialog.listenAsync()) {
			// ... handle events from the dialog
			if (e.name === "Confirm") {
				// ...
				dialog.unlink(); // or do this in the activity itself
			}
		}
	}
}

class DialogActivity extends Activity {
	static View = DialogView; // inner dialog view (with min/max width)

	constructor() {
		super();
		this.setRenderMode("dialog");
	}

	protected onCancel() {
		this.unlink(); // breaks out of event loop above
	}

	protected onSubmit() {
		this.emit("Confirm", { value: "..." });
	}
}
```

Summary:

- For simple apps, add (all) activities to the app context and activate them manually.
- For routed navigation, set `navigationPath`.
- For complex routing, use `matchNavigationPath` in a view-less activity.
- For list-detail routing, use `matchNavigationPath` with render mode 'none' on sub activities.
- Use `attachActivityAsync` to display another activity (no routing).
- Use `attachActivityAsync` with render mode 'dialog' to display a dialog.

## Task Queues

An application task queue is available to schedule background tasks. Tasks are automatically deferred to the next frame if necessary.

```typescript
app.schedule(() => {
	// ...
});
app.schedule(() => {}, 1); // LOWER priority
```

Typically, background tasks need to run in the context of the current activity, while it is active. The activity class provides a way to create a queue that is started, paused, and resumed automatically.

```typescript
export class MyActivity extends Activity {
	// ...

	backgroundLoadQueue = this.createActiveTaskQueue({ parallel: 5 });
	throttleQueue = this.createActiveTaskQueue();
	debounceQueue = this.createActiveTaskQueue();

	protected async afterActiveAsync() {
		let chunks = getChunks();
		for (let chunk of chunks) {
			for (let item of chunk) {
				this.backgroundLoadQueue.add((t) => {
					if (t.cancelled) return;
					// ... load item
				});
			}

			// wait until there are at most 5 items in the queue
			await this.backgroundLoadQueue.waitAsync(5);
		}
	}

	protected async beforeInactiveAsync() {
		this.backgroundLoadQueue.stop();
	}

	protected onSomeEvent() {
		this.throttleQueue.throttle((t) => {
			if (t.cancelled) return;
			// ... runs at most once every 100ms
		}, 100);
		this.debounceQueue.debounce((t) => {
			if (t.cancelled) return;
			// ... runs after 100ms of inactivity
		}, 100);
	}
}
```

## Basic Text Output

To write text to the console, you can use `console.log`, `app.log`, and `fmt`.

```typescript
import { app, fmt } from "talla-ui";

// Use the fmt function to format strings
console.log(fmt("Hello, {}!", "world"));
console.log(fmt("Hello, {0:s}!", "world")); // (same as above)
console.log(fmt("Time: {:.2f}s", 1.23456789)); // 2 decimals
console.log(fmt("{:d}", 1.23456789)); // at most 6 decimals
console.log(fmt("{:2d}", 1.23456789)); // at most 2 decimals
console.log(fmt("{:i}", 1.23456789)); // rounded integer
console.log(fmt("Customer {id}: {name}", { id: 123, name: "John Doe" }));
console.log(fmt("Date: {:Ldate}", new Date())); // uses app.i18n

// fmt also supports boolean checks, pluralization, and i18n
let s = fmt("You have {:?/{0}/no} {0:+/message/messages}", 0);
console.log(s); // "You have no messages"

// Use the app.log object for more robust logging
app.log.error("This is an error", someData);
app.log.information(fmt("Hello, {}!", "world"));
app.log.dump(someData); // debug level

// Add a log sink, e.g. to send logs to a server
app.log.addHandler(
	2, // min level: 0 = verbose, ... 5 = fatal
	(message) => {
		// ... send message to server
	},
	true, // or false to disable default console output
);
```

The `fmt` function translates the input string, and formats the arguments using the `I18nContext` object (see below for I18n details). The result is a `DeferredString` object, with the appropriate `toString` method. To match all types of strings and deferred strings, `StringConvertible` is commonly used as the type for function parameters.

## Modal Message Dialogs

The application context also includes methods to display default alerts and confirmation dialogs.

```typescript
import { app } from "talla-ui";

// Display an alert dialog
await app.showAlertDialogAsync("Hello, world!");
await app.showAlertDialogAsync(
	[fmt("..."), fmt("...") /* ... more text */],
	fmt("Dismiss"),
);
await app.showAlertDialogAsync(alertOptions);
// ... after await, the dialog is dismissed

// Display a confirmation dialog
let choice = await app.showConfirmDialogAsync("Are you sure?");
let choice = await app.showConfirmDialogAsync(
	[fmt("..."), fmt("...") /* ... more text */],
	fmt("Confirm"),
	fmt("Cancel"),
	fmt("Other"),
);
let choice = await app.showConfirmDialogAsync(confirmOptions);
// ... choice: true = confirm, false = cancel, 0 = other
```

Note that `alertOptions` and `confirmOptions` may be provided as instances of `MessageDialogOptions`, which allows all output to be centralized in a single module for larger apps.

## Internationalization

```typescript
// Set the current locale, used by `fmt` and `bind.fmt`, all methods are optional
app.i18n.configure("es-MX", {
	isRTL: () => false, // or true
	getText: (text) => {
		// ... translate text (optional, can use app.i18n.setTranslations)
	},
	getPlural: (n, forms) => {
		// ... return the correct plural form
	},
	format: (value, ...type) => {
		// ... format the value according to the specified type, if any
		if (type[0] === "date") {
			// ...
		}
		if (type[0] === "currency") {
			// ... perhaps type[1] is the currency code
		}
	},
});

// Simple cases can use defaults, and translation dictionary
app.i18n.configure("nl-NL");
app.i18n.setTranslations({
	// either translate using markers (where fmt string starts with {#...})
	HELLO: "Hallo, {#name}!",
	// or format exact matches
	"Length: {:.2f}": "Lengte: {:.2f}",
});

// if set while view is already rendered, remount all views to update them
app.remount();

// afterwards, fmt returns translated strings
fmt("{#HELLO}", "world"); // "Hallo, world!"
fmt("Length: {:.2f}", 1.23456789); // "Lengte: 1.23"
```

The `getText`, `getPlural`, `format`, and `isRTL` methods are exposed by the `app.i18n` object.

## Bindings

Bindings can be used to update views dynamically, using the value of a public property in the activity or component.

Nested properties are resolved using dot notation, e.g. `customer.name`. If the object containing the nested property is an `ObservableObject` (i.e. `customer` is an instance of a class that extends `ObservableObject`), the binding updates when the property changes, or when a change event is emitted by the object. Otherwise, the binding only updates when the last non-observable object property (`customer`) is changed.

Bindings can be created using the `bind` function, which look for properties within the view/activity hierarchy. Bindings are also provided as parameters to main activity view functions, and to the callback to `ComponentViewBuilder`, which can be used to bind to (nested) properties using the `.bind()` method.

```typescript
import { bind, UI } from "talla-ui";

// Simple bindings
UI.Label(bind("count")); // binds the label text
UI.Label(bind("customer.contracts.length")); // nested property
UI.Label("Active").hideWhen(bind("isActive"));
UI.Label("Inactive").hideWhen(bind("isActive").not());

// Binding provided to activity view function
class MyActivity extends Activity {
	static override View(v: Binding<MyActivity>) {
		return UI.Label(v.bind("count"));
	}
	// ...
}

// Binding provided to component view builder
function SomeComponent() {
	class SomeComponentView extends ComponentView {
		// ...
	}
	return ComponentViewBuilder(SomeComponentView, (v) =>
		UI.Label(v.bind("count")),
	);
}

// not, neither, either shortcuts
UI.Label("Inactive").hideWhen(bind.not("isActive"));
UI.ShowWhen(
	bind.neither("customers.length", "newCustomer"),
	UI.Column(/* empty state */),
);
UI.ShowWhen(
	// or explicitly:
	bind.either(bind("customers.length"), bind("newCustomer")),
	UI.Column(/* list */),
);

// and, or, matches methods for multiple bindings
UI.Label("...").hideWhen(bind("foo").and("bar")); // .foo && .bar
UI.Label("...").hideWhen(bind("foo").or("bar")); // .foo || .bar
UI.Label("...").hideWhen(bind("foo").matches("bar")); // .foo === .bar

// map transforms the bound value
UI.Label(bind("foo").map((v) => v.toUpperCase())); // .foo.toUpperCase()
UI.Label("...").labelStyle(
	bind("isActive").map((v) => (v ? undefined : { bold: true })),
);

// equals, lt, gt, then, else are shortcuts for map
UI.Label("...").hideWhen(bind("foo").equals(5)); // .foo === 5
UI.Label("...").hideWhen(bind("foo").lt(5)); // .foo < 5
UI.Label("...").hideWhen(bind("foo").gt(5)); // .foo > 5
UI.Label("...").fontSize(bind("isActive").then(24)); // .isActive ? 24 : undefined
UI.Label("...").labelStyle(bind("isActive").then(undefined, { bold: true }));
UI.Label(bind("title").else(fmt("Untitled"))); // .title || fmt("Untitled")

// string formatting
UI.Label(bind("total").fmt("{:.2f}"));
UI.Label(bind("date").fmt("{:Ldate}"));

// Localizable/dynamically formatted text bindings
UI.Label.fmt("foo {} {}", bind("bar"), bind("baz"));
// ^^ same as UI.Label(bind.fmt("foo {}", bind("bar"), bind("baz")))
UI.Label.fmt("Customer {:?/active/inactive}", bind("customer.isActive"));
UI.Label.fmt("{:Ldate}", bind("date"));
```

## Observable Objects

Bindings and events work because of the `ObservableObject` class, the base class for activities and views. You can also use it for observable models and services. Observable objects provide ways to observe properties, add bindings, and emit events.

Activities and views are 'attached' to each other internally, which enables bindings to find the correct source object. The `unlink()` method clears all observers and listeners, and unlinks attached objects recursively.

```typescript
import { ObservableObject } from "talla-ui";
export class MyModel extends ObservableObject {
	count = 0; // can be observed, bound
	increment() {
		this.count++;
		this.emit("Increment", { value: this.count }); // name, data
	}
	changeSomethingElse() {
		// ... update internal state perhaps, non observable ...
		// This triggers binding updates even for e.g. plain arrays:
		this.emitChange(); // or emitChange("ChangeEventName")
	}
}

// Adding observers and listeners
let model = new MyModel();
model.observe("count", (count) => {
	// ...
});
model.listen((e: ObservableEvent) => {
	if (e.name === "Increment") {
		// ... e.source is model instance here
		console.log(e.data.value);
	}
});

// Async listener, breaks when unlinked
for await (let e of model.listenAsync()) {
	if (e.name === "Increment" && e.data.value > 10) {
		model.unlink();
	}
}
console.log(model.isUnlinked()); // true
```

## Observable Lists

Because arrays in JavaScript are unsuitable for UI work (not easily observed, may contain duplicates, gaps, etc.), Tälla UI provides an `ObservableList` class. This class encapsulates a linked list of observable objects (i.e. instances of `ObservableObject`, `ObservableList` itself, or sub classes such as `Activity` or `UILabel`).

This construct is key to Tälla UI's application model, storing activities and views in a tree structure of (attached) observable objects and lists, propagating events and bindings.

You should use observable lists yourself, when items and their (nested) properties are bound, e.g. from a view (and it's undesirable to update the entire UI when a single property changes). In that case, store items in an `ObservableList` as a public property of the activity. All items must be instances of `ObservableObject`.

```typescript
import { Activity, ObservableList } from "talla-ui";

export class MyActivity extends Activity {
	array = [1, 2, 3];
	items = new ObservableList<MyModel>();
	// ...
	protected onAddItem() {
		// This automatically updates the view, if `items` is bound
		this.items.add(new MyModel());

		// This also updates the view, but is less efficient
		this.array = [...this.array, 4];

		// ObservableList methods include many array methods:
		this.items.sort((a, b) => a.name.localeCompare(b.name)); // in-place
		let filtered = this.items.filter((item) => item.isActive); // array
		let mapped = this.items.map((item) => item.name); // array
		let allActive = this.items.every((item) => item.isActive); // boolean

		// Iterators work automatically
		for (let item of this.items) {
			// ...
		}
	}
}
```

The `.length` property contains the number of items in the list, and is also observable.

Use these methods to work with observable lists:

- `.toArray()` returns an array (also `.toJSON()`)
- `.first()`, `.last()`, `.get(index)` return items, or undefined
- `.take(n, startingFrom?)`, `.takeLast(n, endingAt?)` return a slice (array)
- `.indexOf(item)`, `.includes(item)`, `.find(predicate)`, `.some(predicate)`, `.every(predicate)`, `.filter(predicate)`, `.forEach(f)`, `.map(f)`, `.sort(f)` are like Array methods
- `.add(...items)` adds to the end of the list
- `.insert(item, before?)` inserts an item before another item
- `.remove(item)` removes an item
- `.splice(item?, removeCount?, ...items)` removes items and adds new ones (returns an array)
- `.clear()` removes all items
- `.reverse()` reverses the list in-place
- `.replaceObject(item, replacement)` replaces an item
- `.replaceAll(items)` replaces all items (efficiently)

## Config options

A utility class `ConfigOptions` is used by `useWebContext` and `useTestContext`, and can be used elsewhere too, e.g. for configuring services on startup, or options for a component view.

```typescript
import { ConfigOptions } from "talla-ui";

class MyOptions extends ConfigOptions {
	foo = "bar"; // this is configurable, "bar" is default
}

function takeOptions(options: ConfOptions.Arg<MyOptions>) {
	let options = MyOptions.init(options);
	console.log(options.foo); // options is always an instance
}

// Call a function/method that takes options (such as useWebContext)
takeOptions({ foo: "baz" }); // partial object
takeOptions((options) => {
	// a function that gets the default instance, and can modify it
	options.foo = "baz";
});
takeOptions(new MyOptions()); // passed straight through
```

## Input Validators

Input validators are used for built-in form validation and locally stored data.

```typescript
import { InputValidator } from "talla-ui";

// Create a validator for a required string
let validator = new InputValidator((v) => v.string().required());
let value = validator.parse(someString); // returns string, or throws an error
let { data, error } = validator.safeParse(someString); // returns data or error

// Create a validator for an object (splits error messages by property)
let validator = new InputValidator((v) =>
	v.object({ foo: v.string(), bar: v.int() }),
);
let { data, errors } = validator.safeParse({ foo: "bar" });
if (!data) console.log(errors.foo);

// Use different types and methods to create complex schemas:
let validator = new InputValidator((v) =>
	v.object({
		foo: v.string(), // must be string
		num: v.number(), // also .int(), or .boolean(), or .date()
		converted: v.coerce.string(), // also coerce.number, .int, .boolean, .date
		arr: v.array(v.string()),
		obj: v.object({ foo: v.string() }), // result only includes specified properties
		maybeObj: v.optional(v.object({ foo: v.string() })), // undefined or object
		nullOrObj: v.nullable(v.object({ foo: v.string() })), // null or object
		zero: v.literal(0), // must be 0
		yesNo: v.literal("yes", "no"),
		boolOrNum: v.union(v.boolean(), v.number()),
		opt: v.string().optional(), // also .nullable(), .default("fallback")
		nonEmpty: v.string().required("Error message"), // if not specified, default message used
		trimmed: v.string().trim(), // also .toLowerCase(), .toUpperCase()

		// Note: max, length, startsWith, etc. DO NOT exist, use check() instead:
		name: v
			.string()
			.error("Name must be a string")
			.trim()
			.check((s) => s.length > 1)
			.error("Name is too short")
			.check((s) => s.length < 10)
			.error("Name is too long"),
	}),
);
```

Input validators can also be used to parse external data, e.g. network responses.

```typescript
const validUser = new InputValidator((v) =>
	v.object({
		id: v.string().required(),
		name: v.string().required(),
		// ...
	}),
);

class MyActivity extends Activity {
	users?: ObservableList<User>;
	loading?: boolean;
	loadError?: boolean;
	// ...
	protected async afterActiveAsync() {
		if (this.users || this.loading) return;
		this.loading = true;
		try {
			// This can go in an infrastructure layer, for complex apps
			const apiResponse = await fetch("...");
			this.users = new ObservableList(
				validUser
					.parse(await apiResponse.json())
					.map((u) => new User().fromJSON(u)),
			);
		} catch (e) {
			app.log.error("Failed to load users", e);
			this.loadError = true;
			app.showAlertDialogAsync([
				"Failed to load users",
				"Please try again later",
			]);
		} finally {
			this.loading = false;
		}
	}
}
```

## Reading and Writing Local Data

Local data is stored using IndexedDB by the web handler. The test handler can be provided with a mock object instead.

```typescript
// Write data to local storage
app.localData.writeAsync("key", { foo: "bar" });

// Read data from local storage
let { data, errors } = await app.localData.readAsync("key", (v) =>
	v.object({ foo: v.string().optional() }),
);
if (data) console.log(data.foo);
```

## Form State and Validation

Since bindings always update the view one-way _only_, a separate construct is used for two-way binding.

The `FormState` class is used to store form data and validation errors. UI input elements (text fields and toggles) can be bound to fields of form state objects using the `.bindFormState()` method.

```typescript
// ... in a view:
UI.Column(
	UI.Label.fmt("User name")
		.labelStyle("secondary")
		.padding({ y: 4 })
		.onClick("RequestFocusNext"),
	UI.TextField().bindFormState(v.bind("form"), "userName"),
	UI.Label(bind("form.errors.userName"))
		.hideWhen(bind.not("form.errors.userName"))
		.fg("danger"),

	UI.Spacer(8),
	UI.Label.fmt("Password")
		.labelStyle("secondary")
		.padding({ y: 4 })
		.onClick("RequestFocusNext"),
	UI.TextField().type("password").bindFormState(v.bind("form"), "password"),
	UI.Label(bind("form.errors.password"))
		.hideWhen(bind.not("form.errors.password"))
		.fg("danger"),

	UI.Spacer(8),
	UI.Toggle.fmt("Remember me").bindFormState(v.bind("form"), "rememberMe"),

	UI.Spacer(8),
	UI.Button("Submit").onClick("Submit"),
);
```

The form data can be validated using an `InputValidator` object schema, provided to the constructor. The `validate()` method returns the validated form data, or undefined otherwise.

The `FormState` class also includes:

- `valid`: true if there are no validation errors, _after_ validation
- `values`: object with current form data
- `errors`: object with validation errors messages, updated when the form data changes, but only _after_ validating at least once

```typescript
import { Activity, FormState } from "talla-ui";

export class MyActivity extends Activity {
	// ...

	form = new FormState((f) =>
		f.object({
			userName: f.string().required("User name is required"),
			rememberMe: f.boolean(),
			// ...
		}),
	);

	protected async afterActiveAsync() {
		// ...
		this.form.set("userName", rememberedUserName);
	}

	protected onClear() {
		this.form.clear();
	}

	protected onSubmit() {
		let values = this.form.validate();
		if (!values) {
			// ... validation failed
			return;
		}
	}
}
```

## Component views

Regular views may be expressed as functions that return a view builder object. The `DeferredViewBuilder` class can be used to create a builder object that's extended with custom methods.

```typescript
export function CardLayout(title: StringConvertible) {
	let content: ViewBuilder[] = [];
	return {
		...new DeferredViewBuilder(() =>
			// This runs only once, before the first view is created
			UI.Column()
				.dropShadow()
				.border(1)
				.borderRadius(16)
				.padding(16)
				.gap()
				.with(UI.Label(title).labelStyle("title"), ...content),
		),
		with(...cardContent: ViewBuilder[]) {
			content = cardContent;
			return this;
		},
	};
}

// Use within a view
CardLayout("Options").with(
	UI.Label("Option 1"),
	// ...
);
```

More complex views may use a `ComponentView` class, which manages a view body, providing state and event handlers to it.

Unlike activities, component views don't have active/inactive states, and should **not** include any business logic. Component views provide a way to implement reusable UI components (e.g. button toggles, tab bars, grouped controls, cards, and layouts). Component views are not required to simply break up a view into smaller parts — use regular view builder functions instead.

```typescript
// Define a view class to store view state
export class CollapsibleView extends ComponentView {
	expanded = false;
	onToggle() {
		this.expanded = !this.expanded;
	}
}

// Export a builder function that uses the class
export function Collapsible(
	title: StringConvertible,
	...content: ViewBuilder[]
) {
	return {
		...ComponentViewBuilder(CollapsibleView, (v) =>
			UI.Column(
				UI.Label(title)
					.icon(v.bind("expanded").then("chevronDown", "chevronNext"))
					.cursor("pointer")
					.onClick("Toggle"),
				UI.ShowWhen(v.bind("expanded"), UI.Column(...content)),
			),
		),
		expand(expanded = true) {
			this.initializer.set("expanded", expanded);
			return this;
		},
	};
}
```

Components that encapsulate input values may provide a fluent interface to bind to form state fields.

```typescript
export function BoundInput() {
	return {
		...ComponentViewBuilder(
			InputViewComponent, // with `value` property
			() => UI.Column(/* ... */), // a complex view
		),
		bindFormState(
			formState: BindingOrValue<FormState | undefined>,
			formField: string,
		) {
			this.initializer.finalize((view) => {
				view.bindFormState(formState, formField, "value");
			});
			return this;
		},
	};
}
```

## Web Handler Setup

Options for the web handler are passed to `useWebContext()`, typically using a `ConfigOptions` callback function.

```typescript
import { useWebContext } from "talla-ui";

useWebContext((options) => {
	options.basePath = "/my-app"; // used before navigation path
	options.useHistoryAPI = false; // default, use "#/..." paths

	// For more app-like back button behavior, insert either
	// "/" or "/foo" into history on startup on "/foo/bar"
	options.insertHistory = false; // default, do nothing
	options.insertHistory = "page"; // base + first segment
	options.insertHistory = "root"; // only base path

	options.importCSS = []; // e.g. CSS files for fonts

	options.colors = {
		background: new UIColor("#111"), // dark theme
	};
	// ... or use automatic dark mode detection
	options.darkColors = {
		background: new UIColor("#111"),
	};

	// ... and more, see `WebContextOptions` for details
});
```

## Custom Rendering (Advanced)

Create custom UI elements ONLY if a component with standard UI element content doesn't suffice.

```typescript
export class CustomComponentView extends ComponentView {
	scene: Shape[] = [];

	render(callback: RenderContext.RenderCallback) {
		// ... encapsulate rendering logic here and observe scene
		callback({ source: this, element: canvas });
	}
}

// Export a function that returns a builder, similar to UI.* functions
export function CustomView() {
	return {
		...ComponentViewBuilder(CustomComponent),
		shape(shape: Shape) {
			this.initializer.finalize((view) => {
				view.scene.push(shape);
			});
		},
	};
}
```

## Development and Testing

Tälla UI supports hot reload at the activity level, copying updated activity prototypes (methods) to running instances. Afterwards, the view is updated using the new view builder returned by the static `View` property.

```typescript
class MyActivity extends Activity {
	static View = MyView; // copied on hot reload

	static {
		import.meta.hot?.accept(); // for Vite
		app.hotReload(import.meta, this);
		// (for other bundlers, supply `module` instead)
		// Tip: use an ad-hoc transformer in vite.config.ts to add this 'static' block
	}

	// Properties are not changed on update, because constructor is not called
	// (i.e. state is preserved after hot reload)
	foo = "bar";

	onSomeEvent() {
		// (updated on hot reload)
	}
}
```

For testing, use Vitest or any other compatible test runner. Tests can run in Node because the test handler 'renders' views in-memory.

Typically, tests are written for a particular activity, and determine if a view with a specific name or text is rendered, then interact with it to validate the result. Activities and views (view builders) may also be tested in isolation.

If using local data, supply mock data when setting up the test context.

```typescript
import { beforeEach } from "vitest";
import { app, useTestContext } from "@talla-ui/test-handler";

beforeEach(() => {
	// Initialize a test context instead of a web context
	useTestContext({
		navigationPath: "foo", // initial path
		navigationDelay: 5, // default, in ms; optional
		localData: { foo: { bar: "baz" } }, // optional
	});

	// ... add (mock) activities here
});

test("...", async () => {
	// Find activities to test if needed
	let activity = app.getActivity(MyActivity);

	// Expect navigation to a path
	await expectNavAsync({
		path: "foo/bar",
		timeout: 200, // default, optional
	});

	// Expect some output to be rendered; all properties optional
	await expectOutputAsync({
		source: someView, // view instance itself
		type: "label", // or "textfield", "button", etc.
		name: "someLabel",
		accessibleRole: "...",
		accessibleLabel: "...",
		text: "Some text",
		imageUrl: "...",
		value: "...", // for text fields
		disabled: false,
		readOnly: false,
		pressed: false,
		focused: false,
		checked: false,
		styles: { bold: true },
	});

	// Multiple levels of nesting supported
	await expectOutputAsync(
		{ type: "row" },
		{ type: "button", text: "Count Up" },
	);

	// Synchronous version
	expectOutput({ type: "button" }).toBeRendered(); // or .toBeEmpty()

	// Expect output and interact with it
	await clickOutputAsync({ text: "Count Up" });
	await enterTextOutputAsync("123", { type: "textfield" });

	// Expect a message dialog and interact with it
	let dialog = await expectMessageDialogAsync(/Are you sure/);
	await dialog.confirmAsync(); // or .cancelAsync()
	await dialog.clickAsync("Ignore");
});
```

## Themes, Styles, Icons, Colors

To style UI elements, instances of specific classes are used to encapsulate dynamic values for colors, icons, and reusable styles.

Note: Tälla UI comes with a good looking platform neutral default theme. Strictly avoid making any style changes other than basic colors until you have a fully working app, then gradually change styles if needed.

```typescript
import { UIColor, UIIconResource, UIStyle } from "talla-ui";

// Colors resolve to CSS color values
let black = new UIColor("#000");
let myColor = black
	.alpha(0.5)
	.mix(otherColor, 0.5)
	.brighten(0.5) // accepts -1 to 1
	.contrast(-0.5) // negative makes light colors lighter, dark darker
	.fg(onLight, onDark) // chooses one of the colors
	.text(); // chooses between black or white

// Icons resolve to SVG, HTML, or plain text
let icon = new UIIconResource("<svg>...</svg>");
icon.setMirrorRTL(); // for e.g. chevron icons
let symbol = new UIIconResource("🔥");

// Reusable styles include CSS-like properties
let style = new UIStyle({ textColor: myColor });
let bolder = style.extend({ bold: true });
let italicOnHover = style.extend({
	[UIStyle.STATE_HOVERED]: true,
	// ...or PRESSED, FOCUSED, READONLY, DISABLED
	italic: true,
});

// Overrides are applied directly to a UI element
let boldOverride = italicOnHover.override({ bold: true });
// ... this is the default if passed as an object
UI.Button("Bolder").buttonStyle({ bold: true });

// Available properties:
let myLabelStyle = UI.styles.label.title.extend({
	width: 100, // or "100%", other CSS values
	height: 100, // or "100%"
	minWidth: 100, // and maxWidth, minHeight, maxHeight
	grow: true, // or number
	shrink: true, // or number
	padding: 8, // OR:
	padding: { top: 8 }, // bottom, left, right, start, end, x, y
	margin: 8, // or object (same as padding)
	opacity: 0.5,
	textDirection: "rtl", // or "ltr"
	textAlign: "center", // CSS values
	fontFamily: "Arial", // CSS values
	fontSize: 16, // or "16px", "1.5em", etc.
	fontWeight: 700, // CSS values
	letterSpacing: 1, // CSS values
	tabularNums: true, // or false
	lineHeight: 1.5, // relative to font size
	lineBreakMode: "ellipsis", // normal, nowrap, pre, pre-wrap, pre-line, ellipsis, clip
	bold: true, // and italic, uppercase, smallCaps, underline, strikeThrough
	userTextSelect: true,
	background: myColor, // or string, for e.g. gradients
	textColor: myColor,
	borderColor: myColor, // or each side (top, etc.)
	borderStyle: "solid", // CSS values
	borderWidth: 1, // or object (same as padding)
	borderRadius: 8, // or object (topLeft, etc.)
	dropShadow: 8, // in pixels, approximate blur; negative for inset
	cursor: "pointer", // CSS values
	css: {
		// ... any other CSS properties, own risk
	},
});
```

Important: always try to use predefined styles, colors, and icons. Most builder methods accept a string argument for these, otherwise use the `UI` object, e.g. to extend styles or mix colors.

The theme can be updated at runtime or as part of the options passed to `useWebContext`. The references from `UI` always resolve to the current theme value.

```typescript
import { UI } from "talla-ui";

// ### Colors:
// transparent, black, white, darkerGray, darkGray, gray, lightGray,
// slate, lightSlate, red, orange, yellow, lime, green, turquoise, cyan, blue,
// violet, purple, magenta
UI.Row().bg(UI.colors.black);
UI.Row().bg("black"); // using theme colors (UI.colors.*)

// Semantic colors:
UI.colors.background; // background color
UI.colors.text; // depends on background color
UI.colors.shade; // for slight contrasting background
UI.colors.divider; // semi-transparent text color
UI.colors.danger; // for error messages, etc.
UI.colors.success; // for success messages, etc.
UI.colors.link; // blue, for links
UI.colors.primary; // defaults to black/white, but often distinctive like blue
UI.colors.brand; // app-specific brand color

// Semantic background colors, if needed:
UI.colors.dangerBackground;
UI.colors.successBackground;
UI.colors.primaryBackground;
UI.colors.brandBackground;

// ### Predefined icons:
// blank, close, check, plus, minus, menu, more, search
// chevronDown, chevronUp, chevronNext, chevronBack
UI.Button("Close").icon(UI.icons.close);
UI.Button("Close").icon("close");

// ### Label styles:
// default, title, large, headline, bold, italic, secondary, small
// badge, successBadge, dangerBadge, toggleLabel
UI.Label("Title").labelStyle(UI.styles.label.title);
UI.Label("Title").labelStyle("title");

// ### Button styles:
// default, primary, success, danger, plain, text, link, small,
// Fixed size: icon, primaryIcon, successIcon, dangerIcon,
// Icon placed above label: iconTop, iconTopStart, iconTopEnd
UI.Button("Click").buttonStyle("primary");
UI.Button("Click").buttonStyle(UI.styles.button.primary);

// ### Textfield styles:
// default, transparent (no border and background)
UI.TextField().textfieldStyle("transparent");
UI.TextField().textfieldStyle(UI.styles.textfield.transparent);

// ### Toggle styles:
// default, danger, success
UI.Toggle().toggleStyle("danger");
UI.Toggle().toggleStyle(UI.styles.toggle.danger);

// ### Divider styles:
// default, dashed, dotted
UI.Divider().dividerStyle("dashed");
UI.Divider().dividerStyle(UI.styles.divider.dashed);
```

## Responsive Design

The renderer maintains a viewport object with information about the current window size, using a grid of columns and rows (defaults to 300×300 pixels).

Simple responsive design can be achieved by binding to properties of this `app.viewport` object.

```typescript
// Switch row to column when viewport is narrow
UI.Row(UI.Label("1"), UI.Label("2")).layout(
	bind("viewport.cols").lt(2).then({ axis: "vertical" }),
);

// Show an element only on wide viewports
UI.ShowWhen(bind("viewport.cols").gt(2), someComplexView);
```

## Positioning and Layout

When specifying style values related to positioning and layout as numbers, these are interpreted as pixel units. However, in the browser, they are applied as `rem` based values so that they scale dynamically with font size.

Always try to stick with pixel values that are divisible by 8 (or 4 for smaller increments), e.g. for padding, border radius, and spacers. By default, the gap between controls in a row is also 8 pixels.

Positioning and layout mostly follow 'flexbox' principles.

Try to position elements using padding and spacers whenever possible, rather than margin. For advanced positioning, use `position`.

```typescript
UI.Label("...")
	.position("start") // align self to 'start' along cross-axis
	.position("stretch") // align 'stretch', default for containers
	.position("start", 8) // same, with top: 8px
	.position({ gravity: "start", top: 8 }) // same
	.position("overlay", 8, 16, 8, 16) // absolute position, with top, end, bottom, start
	.position("cover"); // absolute position with 0 inset
```

## UI Elements

Primary building blocks for UIs are provided by the following classes: `UIElement` (abstract), `UIContainer` (abstract), `UIColumn`, `UIRow`, `UICell`, `UIScrollView`, `UIButton`, `UILabel`, `UITextField`, `UIToggle`, `UIImage`, `UIDivider`, and `UISpacer`. That's all, there are no other UI elements that are rendered directly.

In addition, the `UIShowView` and `UIListView` classes control embedded views.

Functions to create view builders are provided by `UI`, e.g. `UI.Row()`. View builders provide a fluent API for setting properties on each instance that gets created.

All UI builders for containers and controls support basic methods for styling and event handling:

```typescript
UI.Label() // ... or UI.Button, UI.TextField, UI.Row, etc.
	.accessibleRole("listitem") // WAI-ARIA role
	.accessibleLabel("Item 1") // WAI-ARIA label
	.hideWhen(bind("isInactive")) // hide (but still render)
	.position("center") // see above
	.size(100) // width and height, either pixels or CSS value
	.size(w, h) // ...or...
	.width(w)
	.width(w, minWidth, maxWidth)
	.minWidth(minWidth) // and .maxWidth(maxWidth)
	.height(h) // and .height(h, minHeight, maxHeight)
	.minHeight(minHeight) // and .maxHeight(maxHeight)
	.grow() // or grow(true), grow(false), grow(number), or binding
	.shrink() // or shrink(true), shrink(false), shrink(number), or binding
	.padding() // default gap width, i.e. 8
	.padding(8)
	.padding({ top: 8 }) // and bottom, left, right, start, end, x, y
	.margin() // same arguments as padding
	.textColor("primary") // theme color name
	.textColor(myColor) // or UIColor instance, or binding
	.fg(myColor) // alias for textColor
	.background("primary") // same arguments as textColor
	.bg(myColor) // alias for background
	.border(1, "primary", "solid", 8) // width, [color, style, radius]
	.borderRadius(16)
	.dropShadow(16) // in pixels, approximate blur; negative for inset
	.opacity(0.5)
	.dim() // opacity 0.5
	.cursor("pointer") // CSS value
	.fontFamily("Arial")
	.fontSize(16) // or "16px", "1.5em", etc.
	.fontWeight(700)
	.bold() // or bold(true), bold(false), or binding
	.italic() // same
	.underline() // same
	.lineHeight(1.5) // relative to font size
	.textAlign("center")
	.requestFocus() // request focus after render
	.onClick("Close") // intercept Click event, emit Close with same data (including listViewItem)
	.onClick((_, view) => view.emit("SelectTab", { tab: "settings" })) // ... emit event with data
	.handle("SelectTab", "SelectSettingsTab") // handle custom events
	.handleKey("Escape", "CloseTab"); // handle keyboard events
```

Events on UI elements that can be intercepted are `Click`, `DoubleClick`, `ContextMenu`, `Press`, `Release`, `KeyDown`, `KeyUp`, `FocusIn`, `FocusOut`, `Change`, and `Input`.

## Containers

All views should be placed inside rows and columns.

Alternatively use a 'cell', which is an automatically growing container element (with column layout) that's meant to be interactive.

Content in cells is centered in both directions. Columns place items from top to bottom, rows from left to right. Most controls attempt to stretch in the cross-axis. Use spacers to push content, or use `align()`.

```typescript
UI.Row(UI.Label("1"), UI.Label("2")); // includes default gap (8px)
UI.Row(UI.Label("1"), UI.Label("2")).gap(0); // or any other gap, or none
UI.Row()
	.align("center") // or "end", "start", "space-between", "space-around"
	.align("space-between", "center") // second is vertical alignment
	.reverse() // or ...
	.reverse(bind("viewport.cols").equals(1))
	.style(myStyle) // any style or override object
	.wrapContent() // or binding
	.clip(); // or binding
UI.Column()
	.align("center", "center") // horizontal, vertical as well
	.reverse()
	.style(myStyle)
	.divider(1, "red", 8); // width, color, margin
UI.Cell()
	.style(myStyle) // but not align, reverse, wrap, etc.
	.allowFocus() // enable input focus (click)
	.allowKeyboardFocus() // enable focus via keyboard
	.handleKey("Escape", "Close"); // respond to interaction

// Use .with() to turn around method chaining (preferred style)
UI.Row().gap(0).minHeight(64).with(
	// better if content spans multiple lines
	UI.Label("1"),
	UI.Label("2"),
);
UI.Column()
	.gap(8) // columns have no default gap
	.width(480)
	.border(1, "divider")
	.divider()
	.with(UI.Label("1"), UI.Label("2"));
```

## Scroll Containers

To wrap a row or column in a `UIScrollView`, use the `scroll()` method _on the embedded container_.

Scroll views emit `Scroll` and `ScrollEnd` events, with data properties including `yOffset`, `xOffset`, `scrolledDown`, `scrolledUp`, `atTop`, `atBottom`.

```typescript
UI.Row().scroll();
UI.Column()
	.scroll()
	.topThreshold(100) // atTop true within 0-100px
	.bottomThreshold(100); // atBottom true within 100px of bottom
	.verticalScroll(false) // disable vertical scrolling
	.horizontalScroll(false) // disable horizontal scrolling
	.onScroll("ItemListScroll"); // handle scroll events
```

## Controls

Controls in a row stretch/center vertically, but not horizontally. Buttons and text fields have a minimum width (except text/link/icon buttons) but labels don't. Use `minWidth` or `grow` within a row where needed.

```typescript
UI.Button("Label text");
UI.Button.fmt("Localized and formatted {}", bind("text"));
UI.Button()
	.icon("plus") // theme icon name
	.icon(UI.icons.plus) // or UIIconResource instance, or binding
	.icon("plus", { size: 16 }) // size, margin, color
	.chevron("up") // or "down", "next", "back"
	.chevron("up", { size: 16 })
	.chevron(bind("direction").then("up", "down"))
	.disabled() // or disabled(true), disabled(false), or binding
	.pressed() // same
	.value("foo") // arbitrary value, set as `data.value` on events
	.buttonStyle("primary") // theme button style name
	.buttonStyle({ bold: true }) // overrides, or binding
	.buttonStyle(myStyle) // UIStyle instance, or binding
	.navigateTo("foo/bar") // or binding
	.disableKeyboardFocus()
	.onClick("Close"); // intercept Click

UI.Label("...") // or UI.Label.fmt("..." [, bindings])
	.icon("plus") // same as UI.Button.icon()
	.align("center") // alignment within element (useful within column only)
	.center()
	.wrap() // sets lineBreakMode to "pre-wrap"
	.html(bind("description"))
	.selectable() // label text is NOT selectable by default
	.labelStyle("badge") // or UIStyle instance, overrides, or binding
	.allowFocus()
	.allowKeyboardFocus();

UI.TextField("Placeholder") // or UI.TextField.fmt("..." [, bindings])
	.value(bind("text"))
	.bindFormState(v.bind("form"), "text")
	.multiline(true, 100) // or .multiline().height(100)
	.type("password") // e.g. "email", "url", "search", "numeric" (special), "decimal"
	.enterKeyHint("done") // or "enter", "go", etc.
	.disableSpellCheck()
	.trim() // automatically trims whitespace on value
	.selectOnFocus()
	.disabled() // or .disabled(binding)
	.readOnly() // same
	.textfieldStyle("transparent") // or UIStyle instance, overrides, or binding
	.onInput("EmailInput"); // intercept Input

UI.Toggle("Label text") // or UI.Toggle.fmt("..." [, bindings])
	.type("checkbox") // or "switch", or "none"
	.state(true) // or binding
	.bindFormState(v.bind("form"), "isActive")
	.disabled() // or .disabled(binding)
	.toggleStyle("danger") // or UIStyle instance, overrides, or binding
	.labelStyle({ bold: true }) // or binding
	.onChange("Toggle"); // intercept Change

UI.Image("...") // URL or UIIconResource, or binding
	.imageStyle({ padding: 16 }) // or UIStyle instance, or binding
	.allowFocus(); // and .allowKeyboardFocus()

UI.Divider(); // default divider
UI.Divider(1, "divider", 8) // width, color, margin (all optional, or bindings)
	.vertical() // or .vertical(true), or binding
	.fg("red") // or .lineColor("red")
	.margin(8) // or .lineMargin(8)
	.dividerStyle("dashed"); // or UIStyle instance, or binding

UI.Spacer(); // flexible spacer
UI.Spacer(8); // min width, height = 8
UI.Spacer(0, 16); // min width = 0, min height = 16
UI.Spacer().minWidth(8); // same, not recommended
```

Typically, interactivitiy requires combining event handlers and bindings.

```typescript
// ... view -- what the user sees:
UI.Button("Settings")
	.value("settings")
	.pressed(bind("selectedTab").equals("settings"))
	.onClick("SetTab");

// ... activity -- interaction logic:
protected onSetTab(event: UIButtonEvent) {
	this.selectedTab = event.data.value;
}
```

## Showing and Hiding Elements

Use `.hideWhen(binding)` to hide a single element on the fly. Use `UI.ShowWhen(binding, view)` or `UI.ShowUnless(binding, view)` to render conditionally. `UI.Show()` (and when, unless) also include animation options.

Note that `UI.Show(binding)` can also be used to render outside views (nested activities). If the bound value is undefined, the view is simply not rendered.

```typescript
UI.Label(bind("messages.length"))
	.labelStyle("badge")
	.hideWhen(bind.not("messages.length"));

UI.ShowWhen(bind("selectedCustomer"), UI.Column(/* complex view */));
UI.ShowUnless(bind("selectedCustomer"), UI.Column(/* empty state */));

UI.Show(UI.Column(/* animated view */))
	.showAnimation("fadeIn") // theme animation name, e.g. "fadeOutDown"
	.showAnimation("fadeIn", true) // ignore first appearance
	.hideAnimation("fadeOut") // same
	.repeatAnimation(
		new UIAnimation((t) => {
			// for complex animations, see `UIAnimation` class
		}),
	);

UI.Show(bind("customerActivity.view"));
UI.ShowUnless(bind("customerActivity.view"), UI.Cell(/* loading state */));
```

## Lists

The `UIListView` class manages a container, and creates views for each item in a (typically bound) list. Embedded views are wrapped in an item 'controller' view, and can bind to its `item` property.

The outer container defaults to a simple column, but can be changed using `outer()`, e.g. to add items to a row container instead. If the container is a scroll view, the list items are automatically rendered _within_ the embedded container.

```typescript
UI.List(v.bind("customers"))
	.bounds(0, 10) // only show 10 items
	.bounds(bind("firstIndex"), 10) // pagination (can bind both, too)
	.outer(UI.Column().divider().scroll().border(1, "divider").height(240))
	.addSpacer() // this also adds a divider below the last item
	.renderOptions({ async: true, delayEach: 100 }) // animate rendering
	.emptyState(UI.Label("No people").center().padding({ y: 64 }))
	.with((item) =>
		// Evaluated only once, views built for all items
		UI.Row()
			.cursor("pointer")
			.onClick("SelectItem")
			.with(
				UI.Label(item.bind("name")).padding(),
				UI.Label("Inactive")
					.labelStyle("dangerBadge")
					.shrink(false),
					.hideWhen(item.bind("inactive").not()),
				UI.Spacer(),
				UI.Button().icon("chevronNext").buttonStyle("text").minWidth(24),
			),
	);
```

Async rendering can be animated by wrap the content (here `UI.Row()`) with e.g. `UI.Show().showAnimation("fadeIn")`.

List views handle events from embedded views, and add a data property `listViewItem` to the event before propagating. Such events can be typed as `UIListViewEvent<TItem>` for convenience.

```typescript
class CustomersActivity extends Activity {
	static View = CustomersView;

	// List views can bind to arrays or ObservableList instances
	customers = new ObservableList<Customer>();

	protected async afterActiveAsync() {
		// ... good place to initialize the list here
	}

	protected onSelectItem(event: UIListViewEvent<Customer>) {
		let customer = event.data.listViewItem;
		// ... customer is typed Customer
	}
}
```
