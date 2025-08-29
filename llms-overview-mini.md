---
alwaysApply: true
---

# Quick Start

Tälla UI is a TypeScript framework for building client-side applications with separation of concerns and declarative UI, without runtime dependencies.

## Installation

```bash
npm install talla-ui @talla-ui/web-handler @talla-ui/test-handler --save-dev
```

## Usage

```typescript
import { useWebContext } from "@talla-ui/web-handler";
import { FooActivity } from "./foo.js";

const app = useWebContext((options) => {
	// configure options here, e.g. theme colors
});

app.addActivity(new FooActivity(), true);
```

Activity contains application logic:

```typescript
import { Activity } from "talla-ui";
import { fooView } from "./foo.view.js";

export class FooActivity extends Activity {
	count = 0; // state as public properties
	someList = ["Alice", "Bob"];

	protected createView() {
		return fooView.create();
	}

	protected onCountUp() {
		// event handlers as protected 'on...' methods
		this.count++;
	}
}
```

View is declarative, using bindings:

```typescript
import { bind, UI } from "talla-ui";

export default UI.Column.align("center").with(
	UI.Label("Counter").labelStyle("title"),
	UI.Label(bind("count")).fontSize(24),
	UI.Row(
		UI.Button("Up").icon("plus").emit("CountUp"),
		UI.Button("Down").icon("minus").emit("CountDown"),
	),
);
```

## Basic Activities

```typescript
export class MyActivity extends Activity {
	navigationPath = "my/path"; // for routing

	// lifecycle methods:
	protected async beforeActiveAsync() {}
	protected async afterActiveAsync() {} // e.g. load data here
	protected async beforeInactiveAsync() {}
	protected beforeUnlink() {}

	protected async onSomeEvent() {
		await this.navigateAsync("other/path");
	}
}

// managing lifecycle:
await activity.activateAsync();
await activity.deactivateAsync();
activity.unlink();
```

## Nested Activities and Dialogs

```typescript
export class MyActivity extends Activity {
	protected async onShowDialog() {
		let dialog = await this.attachActivityAsync(new DialogActivity());
		for await (let e of dialog.listenAsync()) {
			if (e.name === "Confirm") {
				dialog.unlink();
			}
		}
	}
}

class DialogActivity extends Activity {
	protected createView() {
		// This is a dialog; leave out to render as scrolling page
		this.setRenderMode("dialog");
		return dialogView.create();
	}
	protected onCancel() {
		this.unlink();
	}
	protected onSubmit() {
		this.emit("Confirm", { value: "..." });
	}
}
```

## Bindings

```typescript
// Simple bindings
UI.Label(bind("count"));
UI.Label(bind("customer.name")); // nested properties
UI.Label("Active").hideWhen(bind("isActive"));

// Shortcuts and transformations
UI.Label("Inactive").hideWhen(bind.not("isActive"));
UI.ShowWhen(
	bind.either("customers.length", "newCustomer"),
	UI.Column(/*list*/),
);

UI.Label(bind("foo").map((v) => v.toUpperCase()));
UI.Label(bind("title").else(fmt("Untitled")));
UI.Label("...").hideWhen(bind("foo").equals(5));
UI.Label("...").hideWhen(bind("count").lt(10));

// Formatted text bindings
UI.Label.fmt("Hello {}", bind("name"));
UI.Label.fmt("Items: {:+/item/items}", bind("items.length"));
```

## Observable Lists

Use `ObservableList` for arrays that need UI binding:

```typescript
export class MyActivity extends Activity {
	items = new ObservableList<MyModel>();

	protected onAddItem() {
		this.items.add(new MyModel()); // automatically updates view
	}
}

// Methods: .add(), .remove(), .clear(), .replaceAll(), .toArray(), .length, etc.
```

## Input Validators

```typescript
import { InputValidator } from "talla-ui";

// Simple validator
let validator = new InputValidator((v) => v.string().required());
let { data, error } = validator.safeParse(input);

// Complex object validator
let validator = new InputValidator((v) =>
	v.object({
		name: v
			.string()
			.required()
			.trim()
			.check((s) => s.length > 1)
			.error("Too short"),
		email: v.string().required(),
		age: v.coerce.int().check((n) => n >= 0),
		tags: v.array(v.string()),
		settings: v.object({ theme: v.literal("light", "dark") }).optional(),
	}),
);

let { data, errors } = validator.safeParse(formData);
if (!data) console.log(errors.name); // specific field errors
```

## Form Context and Validation

```typescript
export class MyActivity extends Activity {
	form = new FormContext((f) =>
		f.object({
			userName: f.string().required("User name is required"),
			password: f.string().required(),
			rememberMe: f.boolean(),
		}),
	);

	protected onSubmit() {
		let values = this.form.validate();
		if (!values) return; // validation failed, errors shown in UI
		// ... use values
	}
}

// In view:
UI.Column(
	UI.TextField().bindFormField("userName"),
	UI.Label(bind("form.errors.userName"))
		.labelStyle({ textColor: UI.colors.danger })
		.hideWhen(bind.not("form.errors.userName")),
	UI.Button("Submit").emit("Submit"),
);
```

## Custom Views

```typescript
// Define a custom view to store view state
export class CollapsibleView extends CustomView {
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
		...CustomViewBuilder(CollapsibleView, () =>
			UI.Column(
				UI.Label(title)
					.icon(bind("expanded").then("chevronDown", "chevronNext"))
					.cursor("pointer")
					.intercept("Click", "Toggle"),
				UI.ShowWhen(bind("expanded"), UI.Column(...content)),
			),
		),
		expand(expanded = true) {
			this.initializer.set("expanded", expanded);
			return this;
		},
	};
}
```

## Modal Dialogs

```typescript
// Simple alerts and confirmations
await app.showAlertDialogAsync("Hello, world!");
let choice = await app.showConfirmDialogAsync("Are you sure?");
// choice: true = confirm, false = cancel
```

## Text Formatting and Logging

```typescript
import { app, fmt } from "talla-ui";

// String formatting
console.log(fmt("Hello, {}!", "world"));
console.log(fmt("Count: {}", count));
console.log(fmt("Price: {:.2f}", price));
console.log(fmt("You have {:+/item/items}", count));

// Logging
app.log.error("Error occurred", data);
app.log.information("Info message");
```

## Local Data

```typescript
// Write/read local storage with validation
await app.localData.writeAsync("settings", { theme: "dark" });
let { data } = await app.localData.readAsync("settings", (v) =>
	v.object({ theme: v.string().optional() }),
);
```

## UI Elements

```typescript
// Containers
UI.Row(UI.Label("1"), UI.Label("2")).gap(8);
UI.Column().align("center").with(/*content*/);
UI.Cell().allowFocus(); // interactive container

// Controls
UI.Button("Click").icon("plus").buttonStyle("primary").emit("Click");
UI.Label("Text").labelStyle("title").wrap();
UI.TextField("Placeholder").bindFormField("field").type("email");
UI.Toggle("Enable").bindFormField("enabled").type("switch");
UI.Image("url").allowFocus();

// Layout
UI.Spacer(8); // fixed spacer
UI.Spacer(); // flexible spacer
UI.Divider(); // horizontal line
UI.Divider().vertical(); // vertical line

// Common styling
.padding(8) // or .padding({x: 8, y: 4})
.margin(8)
.width(100).height(50)
.grow().shrink()
.bg("primary").fg("white")
.bold().italic()
.hideWhen(bind("hidden"))
```

## Lists

```typescript
UI.List(bind("items"))
	.outer(UI.Column().scroll().height(300))
	.emptyState(UI.Label("No items"))
	.with(
		UI.Row()
			.cursor("pointer")
			.intercept("Click", "SelectItem")
			.with(
				UI.Label(bind("item.name")),
				UI.Spacer(),
				UI.Button().icon("chevronNext").buttonStyle("text").minWidth(24),
			),
	);

// Handle list events in activity/custom view
protected onSelectItem(event: UIListViewEvent<Item>) {
	let item = event.data.listViewItem;
}
```

## Conditional Rendering

```typescript
// Hide/show elements
UI.Label("Hidden").hideWhen(bind("condition"));
UI.ShowWhen(bind("showContent"), UI.Column(/*content*/));
UI.ShowUnless(bind("loading"), UI.Column(/*loaded content*/));

// Render nested views
UI.Show(bind("selectedActivity.view")); // render activity view
```

## Themes and Styling

```typescript
// Use predefined colors and styles
UI.Button("Primary").buttonStyle("primary");
UI.Label("Title").labelStyle("title");
UI.TextField().textfieldStyle("transparent");

// Theme colors: background, text, primary, danger, success, etc.
UI.Row().bg(UI.colors.background);
UI.Label("Error").fg(UI.colors.danger);

// Theme icons: plus, minus, close, check, chevronNext, etc.
UI.Button().icon(UI.icons.plus);
```

## Testing

```typescript
import { beforeEach } from "vitest";
import { app, useTestContext } from "@talla-ui/test-handler";

beforeEach(() => {
	useTestContext({ navigationPath: "test" });
	app.addActivity(new TestActivity(), true);
});

test("button click increments counter", async () => {
	await expectOutputAsync({ type: "label", text: "0" });
	await clickOutputAsync({ text: "Up" });
	await expectOutputAsync({ type: "label", text: "1" });
});
```

## Web Setup

```typescript
useWebContext((options) => {
	options.colors = { primary: new UIColor("#007bff") };
	options.darkColors = { background: new UIColor("#111") };
	options.basePath = "/app";
});
```
