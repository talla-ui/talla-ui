---
title: Text formatting
folder: topics
abstract: Learn how text and data can be formatted, combined, and translated using Desk functions and classes.
---

# Text formatting

> {@include abstract}

## Overview {#overview}

Text formatting is a core concept in Desk, that's tightly integrated with many other parts of the framework.

**Why?** — Once an application grows in complexity, it becomes difficult to add features such as translation (including pluralization), internationalization (e.g. number formatting), and structured logging in a consistent way. Using the framework's core features from the start can help to avoid these issues.

**Implementation** — Rather than passing around 'raw' strings, different functions expect or return values that are either a string or an object that _represents_ a formatted string — including the original format and data. These values are then converted using JavaScript's native `String()` method **at the last moment**, applying internationalization and formatting lazily — e.g. when rendering a UI label to the screen.

User-facing text is therefore typically represented using the {@link StringConvertible} type: either a string, or any object that has a `toString()` method, such as the 'lazily evaluated' result of the {@link strf()} method described below.

- {@link StringConvertible +}

## Creating a formatted string {#strf}

To create an object that represents a formatted and translatable string, with or without placeholders (see below), you can use the {@link strf()} function. This function returns a {@link LazyString} object, with its own `toString()` method.

- {@link strf +}
- {@link LazyString +}

```ts
let lazyString = strf("Hello, world");
console.log(String(lazyString)); // "Hello, world"
```

The `toString()` method of the lazily evaluated string returned by `strf(...)` —

- Uses {@link internationalization} features to translate the string itself, if possible
- Uses {@link LazyString.format()} to fill in any placeholders with formatted values, if any
- Uses {@link LazyString.cache()} to retain the result (typically, until the current {@link I18nProvider} is changed)

## Using placeholders {#placeholders}

The string that's passed to `strf()` can contain placeholders for data that should be filled in when the string is evaluated. Placeholders are loosely based on the syntax of the `printf()` function in C, starting with a `%` character.

Data can be provided directly to the `strf()` function, as arguments, or as an object with named properties. Alternatively, you can call the {@link LazyString.format()} method on the result of `strf()` to fill in placeholder data at a later time.

```ts
let msg1 = strf("Hello %s", user.fullName);
let msg2 = strf("You have %i new message#{/s}", nMessages);
let msg3 = strf(
	"Hello %[name], you have %[count] %[count:plural|message|messages]",
	{
		name: user.fullName,
		count: user.messages.length,
	},
);
```

> **Note:** Combine as much as possible of your user-facing text into a single `strf()` call, where possible. This makes it easier for translators to reformat the text, since languages may have different word orders, pluralization rules, or even punctuation characters. Avoid combining formatted strings or data using the `+` operator, as this will make it more difficult to translate the resulting string.

For more information on available placeholders and formatting options, refer to the documentation for the {@link LazyString.format format()} method.

- {@link LazyString.format}

Some useful placeholders include:

- `%s` — A string value
- `%i` — An integer value
- `%f` — A floating-point number
- `%.2f` — A floating-point number with 2 decimal places
- `%04i` — An integer value, padded with leading zeros to 4 digits
- `%[name]` — A named placeholder, where `name` is a property of the object passed to `format()`
- `%[name:i]` — A named placeholder with an integer value
- `%[name:local|date]` — A named placeholder with a value that should be formatted as a date, using the current i18n provider (see {@link internationalization})

## Creating a formatted string binding {#bound-strf}

The same features that make `strf()` useful for creating internationalized and formatted strings can be used to create a **binding** that represents a lazily formatted string. Using a string-formatted binding, you can automatically update text properties based on the value of _multiple_ other properties, combined into a single string.

To create a string-formatted binding, use the `bound.strf()` method. This method returns a {@link StringFormatBinding} object.

- {@link bound.strf}
- {@link StringFormatBinding}

```ts
// using binding source paths:
bound.strf("Today is %s", "dayOfTheWeek");

// using an object argument and property syntax:
bound.strf("%[user] is %[age] years old", {
	user: bound("user.name", strf("Unknown user")),
	age: bound.number("user.age").else(99),
});
```

The syntax of the format string is the same as for `strf()`, and the placeholders are filled in using the current values of the individual bindings.

> **Note:** The resulting string is only initialized when _all_ individual bindings are bound. For example, a string-formatted binding that depends on bindings `user.name` and `dayOfTheWeek` only takes a (string) value when both `user` and `dayOfTheWeek` are found on any attached parent. Bindings may be bound to different containing objects, and the resulting string will be updated whenever _any_ of the individual bound values change.

## Displaying formatted text {#ui}

You can assign the result of `strf()` directly to a property any UI component that displays text, such as a label, button, or text field (for its placeholder text).

Additionally, plain text within JSX code is **automatically** passed to `strf()` (making it localizable).

```tsx
// using static methods
const view = ui.column(
	{ padding: 16 },
	ui.label(strf("Enter your name:")),
	ui.textField({ placeholder: strf("Your name") }),
);

// using JSX
export default (
	<column padding={16}>
		<label>Enter your name:</label>
		<textfield placeholder={strf("Your name")} />
	</column>
);
```

### Using string-formatted bindings

You can assign the result of `bound.strf()` directly to a property of a UI component — wherever a binding is valid, and the property is typed as {@link StringConvertible}. The result of `bound.strf()` is a {@link StringFormatBinding}, not a {@link LazyString}.

```ts
const view = ui.cell(ui.label(bound.strf("Hello, %s!", "name")));
```

**JSX text bindings** — In addition, you can use `%[...]` placeholders in JSX text. Text content will be scanned for these placeholders automatically, inserting string-formatted bindings at runtime.

```tsx
export default (
	<column>
		<label>Hello, %[name]</label>
		<label>New messages: %[messages.count]</label>
	</column>
);
```

For more information on bindings and JSX syntax, refer to the following articles:

- {@link bindings}
- {@link views}

### Formatting dialog message text

Message dialogs are a common way to display _formatted_ text to the user. To make it easier to define all text in your application away from business logic, Desk provides a way to group this text together in a single object.

Use the {@link MessageDialogOptions} class to store text and options for an alert or confirmation dialog, including placeholders for data that should be filled in _when displaying_ the dialog. Instances of this class can be passed to the {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()} methods, and can be formatted with data using the {@link MessageDialogOptions.format format()} method.

- {@link MessageDialogOptions}

```ts
// messages.ts
export default {
	CONFIRM_DELETE_ITEMS: new MessageDialogOptions(
		[strf("Delete %i item#{/s}?"), strf("This action cannot be undone.")],
		strf("Yes, delete"),
		strf("Cancel"),
	),
	// ...
};

// elsewhere:
let nItems = toBeDeleted.length;
let confirmed = app.showConfirmDialogAsync(
	messages.CONFIRM_DELETE_ITEMS.format(nItems),
);
```

For more information, refer to the following article:

- {@link message-dialogs}

## Formatting log messages {#logs}

Log messages can also be formatted using the `strf()` function. When the result is passed to a {@link LogWriter} method, the log message is formatted **and** any data that was passed to `strf()` can be stored in a structured format (if supported by the log output sink).

```ts
// Write a formatted log message
app.log.verbose(strf("Logged in as %[name]", userData));
```

For more information about logging and error messages, refer to the following article:

- {@link errors-logging}
