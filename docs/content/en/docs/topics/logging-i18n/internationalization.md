---
folder: topics
abstract: Learn how to make your Desk application adaptable to different languages and regions, using the built-in internationalization features.
---

# Internationalization

## Overview <!--{#overview}-->

To make your application adaptable to different languages and regions, you'll need to prepare your code so that it can be easily localized (i.e. internationalize your application). The Desk framework provides a number of features to help you with this.

In general, the following areas of your application may need to be adapted:

- **Text** — Make sure that all user-facing text is localizable, and that it can be formatted and combined in a way that's suitable for different languages and regions. This includes text in the UI, alert and confirmation dialogs, and error messages.
- **Data formatting** — Make sure that numbers, dates, and other data can be formatted before being displayed to the user.
- **Layout** — Make sure that your application's layout can adapt to different languages, which may have different word orders, text lengths, and other layout requirements such as right-to-left text direction.

While views are typically flexible enough to adapt to different languages, starting off with a good internationalization strategy can help to avoid issues with text and formatting as your app grows in complexity.

## Making text localizable <!--{#text}-->

To make sure that user-facing text is localizable using the Desk framework, avoid handling text in the following ways:

- Do **not** concatenate text and data directly, e.g. using the `+` operator or template strings. This makes it impossible to format values and change the word order for different languages if needed.
- Do **not** generate user-facing text anywhere _other than_ in views, activities, or in specific files that contain error messages, dialog messages, etc. In these places, use the Desk framework's features to create lazily-evaluated strings that can be formatted and translated at the last moment.

Localizing text depends on **translations** being available in the original format used in the code, as well as **formatting** values dynamically based on the current locale. Text that's already converted to a string can't be translated or re-formatted.

The easiest way to create localizable text is to use the {@link strf()} function. This function takes a (translatable) format string and optional data, and returns a lazily-evaluated string that can be formatted and translated at the last moment using the methods described in the following sections.

```ts
// DON'T:
let msg = `Hello, ${user.fullName}`;
throw new Error("Oops, something went wrong: " + err.message);
ui.textField({
	formField: "username",
	placeholder: "Enter your name",
});

// DO:
let msg = strf("Hello, %s", user.fullName);
throw new MyAPIError(err);
ui.textField({
	formField: "username",
	placeholder: strf("Enter your name"),
});
```

For more information about text formatting, refer to the following article:

- {@link text-formatting}

### Using plural forms

In the format string passed to `strf()`, you can use placeholders to include plural forms of a word, or several words. The resulting text will contain one of the provided forms, based on the input value (data).

Note that in a Desk app, the 'pluralizer' doesn't use a dictionary or a set of rules to determine the plural form. Instead, `strf` just chooses one of the provided options based on the current locale (i.e. i18n provider, see below).

```ts
// single number passed as first argument
let msg1 = strf("You have %i #{message/messages}", n);
// ... or message#{/s}

// with named properties, use plural explicitly
let msg2 = strf("%[user] has %[count] %[count:plural|message|messages]", {
	user: user.fullName,
	count: user.messages.length,
});
```

### Using markers

Instead of only relying on English text in your code (or any other original language), you can use markers to add an ID to pieces of text that will be translated. You can also entirely replace the original text with a marker, and use the marker as a key in a string dictionary for _all_ languages.

Using markers instead of (or in addition to) the original text, the original text can be changed without breaking the translation.

- A marker can be added by inserting `##` at the **start** of a string, followed by a unique identifier and a space.
- An optional description can be added after the identifier (instead of a space), starting with a `:` character. The original text can still be added after the description, separated with another `:` character. Descriptions are useful for translators, and can be used to provide context for the translation.
- If a marker appears in translated text (or in the original text, if a translation was not found), it will be removed automatically.

For example, rather than `strf("Hello")`, your code would include one of the below options, and translations can be provided for the marker `GREET` instead of just `Hello`.

- `strf("##GREET")` — No description, no original text (i.e. translation is _required_)
- `strf("##GREET Hello")` — No description, original text without translation is 'Hello'
- `strf("##GREET:Greeting message")` — With description, no original text (translation _required_)
- `strf("##GREET:Greeting message:Hello")` — With description, original text is 'Hello'

```tsx
const view = (
	<row>
		<button onClick="CountDown">##T_BUTTON_DOWN Down</button>
		<label>%[count]</label>
		<button onClick="CountUp">##T_BUTTON_UP Up</button>
	</row>
);

class MyActivity extends Activity {
	// ...

	onCountDown() {
		if (this.count <= 0) {
			app.showAlertDialogAsync("##T_ERROR_COUNT_MIN:Dialog msg, count is zero");
		} else {
			this.count--;
		}
	}
}

// In translations:
// "T_ERROR_COUNT_MIN": "Can’t count below zero" (required)
// "T_BUTTON_DOWN": "Down" (optional, falls back to Down)
// "T_BUTTON_UP": "Up" (optional, falls back to Up)
```

> **Note:** Using `strf`, translation occurs before formatting, so as long as the translated text contains placeholders, the resulting string is formatted as needed. However, in JSX text, you'll need to include (binding) placeholders either in the original text or in a description, for bindings to be created in the first place.
>
> - `strf("##GREET")` with a translation of `Hello, %s` or `Hello, %[name]` will result in `Hello, Alice` (depending on input data, of course).
> - `<label>##GREET</label>` cannot be bound to e.g. `name`. Instead, use `<label>##GREET:%[name]</label>` and provide a translation that _also_ includes `%[name]`.

### Storing error messages

Errors are often generated in different parts of your application, and it may be impossible to separate user-facing errors from 'internal' errors. For this reason, the Desk framework includes an error class that can be used to create errors with a translatable message.

- {@link AppException}

Rather than adding user-facing error text in the place where the error is thrown, you can prepare an error class using the {@link AppException.type()} method, and then throw an instance of this error class along with any data that's needed to format the error message.

```ts
const MyAPIError = AppException.type(
	"MyAPIError",
	"The server responded with an error: %[message]",
);

// ... after API call:
if (e instanceof Error) {
	throw new MyAPIError(e);
}
```

For more information on how to create and handle errors, refer to the following article:

- {@link errors-logging}

### Storing dialog messages

Alert and confirmation dialogs are often shown from event handlers, in activities or composite view classes. You can pass the result of `strf()` directly to the {@link AppContext.showAlertDialogAsync showAlertDialogAsync()} and {@link AppContext.showConfirmDialogAsync showConfirmDialogAsync()} methods, but you can also prepare dialog messages — including several messages and button text — as a separate {@link MessageDialogOptions} object.

- {@link MessageDialogOptions}

```ts
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

For more information on message dialogs, refer to the following article:

- {@link message-dialogs}

## Creating an i18n provider <!--{#provider}-->

The mechanism by which Desk translates and formats lazily-evaluated strings includes an **i18n provider**. This provider is responsible for providing translations, pluralizers, and formatters for the current locale.

The provider is an object that conforms to the {@link I18nProvider} interface, that's assigned to the {@link AppContext.i18n} property.

To create your own provider (which you'll need to do to support multiple locales), create your own provider class and implement all of the mandatory interface methods. Then, create an instance at runtime and assign it to `app.i18n`. Refer to the sections below for details.

- {@link I18nProvider +}

> **Note:** If you're changing the locale at runtime, text that's already rendered won't be updated automatically. If needed, re-render all views using `app.renderer.remount()`.

```ts
class MyI18nProvider implements I18nProvider {
	// ... implement the interface, see below
}

app.i18n = new MyI18nProvider();
```

### Supplying locale information

The {@link I18nProvider} interface includes a method that must be implemented to supply information about the locale that's implemented by the provider.

- {@link I18nProvider.getAttributes}

This method should return an object that includes _at least_ a locale identifier (e.g. `en-US`). The object may have the following properties:

- `locale` — The locale identifier.
- `rtl` — Indicates whether the language follows a right-to-left writing system (optional, defaults to false).
- `decimalSeparator` — The character that's placed before decimals in regular number notation (i.e. decimal point, either `.` or `,`, defaults to `.` if omitted).

### Handling translations

The {@link I18nProvider} interface includes a method that's used to translate text. This method is invoked automatically from {@link LazyString.translate()}, to (lazily) translate all text passed to `strf`, which may include both markers and placeholders.

- {@link I18nProvider.getText}

While Desk doesn't provide a standard way to store and retrieve translations, the `getText` method typically uses a `Map` or a similar data structure to store translations, either indexed by a marker (see above) or by the full text in the source language. If a translation is not found, the method may use a fallback language, or return the original string. Any markers and descriptions still left in the translation will be removed automatically.

**Finding text to translate** — In a simple app, providing translations for all text can be done manually, and translations can be stored within the source code.

For larger applications, external tooling can be used to extract text from your code, and you'll need to manage translations in a separate file or database.

- If you use markers consistently, you can use a tool to extract all markers using a regular expression.
- If you don't use markers, you can still extract text by searching for `strf(...` in your code, and analyze their (first) string arguments.
- If you use JSX without markers, you'll also need to extract text from JSX tag content.

After you've established a process for finding the source text (or markers) in your application code, the steps for providing and storing translations depends entirely on your ops and deployment processes, and are outside the scope of this documentation.

### Handling plural forms

The {@link I18nProvider} interface includes a method that's used to pluralize text. This method is invoked automatically from {@link LazyString.format()}, with a number value (argument to `strf`) and specified plural forms (from the format string).

- {@link I18nProvider.getPlural}

This method should return one of the provided plural forms based on the input number value. For example, a method for the English language would return the first form only if the input value is exactly 1, and the second form otherwise.

### Handling formatting

Finally, the {@link I18nProvider} interface also includes a method that's used to format arbitrary data. This method is invoked automatically from {@link LazyString.format()}.

- {@link I18nProvider.format}

The `format` method can be used to format any kind of data, including dates, times, and money (currency) values. The value to be formatted is passed as the first argument, and the format is passed as the second _and any subsequent_ arguments — which can be used to specify date/time formats, or e.g. currency symbols. Typically, the type is specified within the format string using `%{local|...}` or `%[name:local|...]` placeholders.

> **Note:** Desk doesn't specify minimum requirements for the types of data that can be formatted, or the formats that are supported. The `format` method is intentionally flexible, allows for fallback (sub)types, and can be adapted to your application while maintaining a consistent interface.

### Example

Use the following example as a starting point for your own i18n provider.

```ts
class MyI18nProvider implements I18nProvider {
	getAttributes(): I18nProvider.Attributes {
		return {
			locale: "en-US",
			decimalSeparator: ".",
		};
	}

	getText(text: string) {
		// use either a ##marker or the original text
		let marker = text.match(/^##([^: ]+)/)?.[1];
		return getTranslation(marker || text);
	}

	getPlural(n: number, forms: string[]) {
		// English rules
		return forms[n == 1 ? 0 : 1] || "";
	}

	format(value: any, ...type: string[]) {
		switch (type[0]) {
			case "date":
				return this.formatDate(value, ...type);
			case "currency":
				return this.formatCurrency(value, ...type);
			// ...
		}
		return "???";
	}

	// ...
	// getTranslation(markerOrText: string): string { ... }
	// formatDate(value: any, type = "short"): string { ... }
	// formatCurrency(value: any, symbol = "$", decimals = 2): string { ... }
}
```

## Adjusting views <!--{#views}-->

To accommodate for translated text in your app, your may need to adjust your view layout.

- Some languages produce shorter or longer text. If your views are designed for text in English or an even shorter language such as Chinese, be sure to test your views with longer text.
- Some languages are written from right to left. Not only should text be aligned to the right in this case, but the entire layout may need to be mirrored. Always use the `start` and `end` properties instead of `left` and `right` where possible, to enable view elements to be mirrored automatically.

> **Tip:** You can use a 'fake' i18n provider to test your views with different languages, without having to translate all of your text. For example, you can use a `getText` method that returns the original text with some additional characters to lengthen the text, or reverse text and enable right-to-left text direction.

### Mirrored icons

If your app uses icons, you may need to provide mirrored versions of these icons for right-to-left languages. Be aware that _not all_ icons need to be mirrored (e.g. a clock icon should look the same in RTL text direction), and that some icons may need to be mirrored only in certain contexts (e.g. arrows).

The {@link UIIconResource} class provides some support for mirrored icons, but full support depends on the icon set and platform that's used by your app.

For more information on how to use icons, refer to the following article:

- {@link icons}
