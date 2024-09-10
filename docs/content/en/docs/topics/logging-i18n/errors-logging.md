---
folder: topics
abstract: Understand how errors are handled, and how you can use built-in logging features to help observe and debug your application.
---

# Errors and logging

## Overview <!--{#overview}-->

In a larger application, it's important to monitor and handle application behavior and errors in a consistent way. Errors that are thrown by event handlers or asynchronous code should be caught, and important events can be logged to help with debugging (in development) and monitoring remotely (in production).

- **Error handling** — Desk provides a built-in error handling mechanism, which can be overridden to suit your application's needs.
- **Custom exceptions** — You can create your own exception classes, which can be used to represent different types of errors and other events in your application.
- **Logging** — You can use the built-in logging functions to write messages to the log. These are sent to the console in development, but you can add a log 'sink' to send them to a remote server in production.

Refer to the following sections for more information.

## Error handling <!--{#error-handling}-->

Error handling in asynchronous JavaScript code can be complex. By default, errors that are thrown in `Promise` or `setTimeout` callbacks are ignored. If an error is thrown in an event handler, the application may look like it's not responding to user input.

In a Desk application, your code is often called by the framework itself. Where possible, Desk tries to catch errors that result from these calls (either synchronously or asynchronously) and handle them in a consistent way, using a centralized 'unhandled error' handler. This includes:

- Errors that are thrown by event handlers (either in an activity, composite view, or other {@link ManagedObject.listen listeners})
- Errors that are thrown by observer methods, e.g. in an {@link ManagedObject.attach attach()} callback
- Errors that are thrown within tasks, run by a {@link task-scheduling task queue}
- Miscellaneous errors, from the framework itself or e.g. an {@link I18nProvider} method

By default, the global error handler logs the error using the global logging functions (see below), but you can override this behavior using the static {@link AppContext.setErrorHandler setErrorHandler()} method.

- {@link AppContext.setErrorHandler}

```ts
AppContext.setErrorHandler((err) => {
	// keep track of all errors in a list, maybe?
	myErrors.unshift(err);
	myErrors.splice(MAX_ERRORS);
});
```

> **Note:** Rather than overriding the global error handler, consider adding a log sink (see below). This way, you can handle both unhandled errors and other error logs (e.g. handled or ignored errors) in one go.

## Custom exceptions <!--{#custom-exceptions}-->

For 'intentional' errors, including those that are expected but _exceptional_ conditions in your application (e.g. timeouts, validation errors, empty result sets), it's often a good idea to use custom exception classes.

This way, rather than representing an exception only using an (English or other source language) string, you represent each condition using a unique code, as well as a localizable message and any additional data that's relevant to the error.

To create a custom exception class, use the {@link AppException.type()} method. This method returns a _class_ that extends the native `Error` class, but provides additional features that are useful for logging and internationalization.

- {@link AppException +}
- {@link AppException.type}

After you define a custom exception class, you can throw it using the `throw` statement, or log it using the built-in logging functions.

```ts
// errors.ts
export const MyException = AppException.type(
	"MyException",
	strf("An error occurred"),
);
export const DetailedError = AppException.type(
	"DetailedError",
	strf("The server responded with an error: %[message]"),
);

// ...
throw new MyException(); // => "An error occurred"
throw new DetailedError(serverResponse);
//   => "The server responded with an error: " + serverResponse.message
```

Error messages are lazily evaluated, and can be translated and formatted using the built-in internationalization features. Refer to the following articles for more information:

- {@link text-formatting}
- {@link internationalization}

## Logging <!--{#logging}-->

While most JavaScript runtime environments provide a built-in `console` object, its functionality is limited. Once a message is written to the console in one part of your application, there isn't a (standard) way to collect and send these messages elsewhere for analysis.

For this reason, Desk provides a built-in logging mechanism that can be used from anywhere in your application, and can be extended to send messages to a remote server, to a file, or even a view in your application.

### Writing to the application log

To write to the application log, you can use the methods of the `app.log` object, which is an instance of {@link LogWriter}. This class provides methods that classify logs into different log levels.

All methods accept either a string, an `Error` object, or a lazily formatted string (see {@link text-formatting text formatting}) to include both the resulting string _and_ the source data in the log.

- {@link LogWriter +}
- {@link LogWriter.verbose}
- {@link LogWriter.debug}
- {@link LogWriter.information}
- {@link LogWriter.warning}
- {@link LogWriter.error}
- {@link LogWriter.fatal}

```ts
// log a single debug message
app.log.debug("HERE");

// log an error object
let unhelpfulError = new Error("An error occurred");
app.log.error(unhelpfulError);

// log a formatted message
app.log.information(strf("Loaded %i items", items.length));
app.log.information(strf("Logged in as %[name]", user));

// log a custom error (see above)
let myError = new DetailedError(serverResponse);
app.log.error(myError);
```

### Adding a log sink

To handle log messages in any other way than sending them to the console, you can add a log 'sink' using the {@link LogWriter.addHandler()} method. This method accepts a function that will be called with each log message, as an object of type {@link LogWriter.LogMessageData}.

- {@link LogWriter.addHandler}
- {@link LogWriter.LogMessageData}

> **Note:** After you add _any_ log handler, the default behavior of writing to the console is disabled. If you want to keep the default behavior, you'll need to add a log sink that (also) writes to the console. All subsequent handlers are called in the order they were added.

```ts
// add a log sink that writes all messages to the console
app.log.addHandler(0, (data) => {
	console.log(data.message);
});

// add a log sink for 'information' and above
app.log.addHandler(2, (data) => {
	// ...if prod, send to a remote server
});
```
