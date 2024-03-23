---
title: Test context
folder: topics
abstract: Understand how the Desk test library simulates an interactive runtime environment for testing, including UI interaction and navigation.
---

# Test context

> {@include abstract}

## Overview {#overview}

The Desk framework test library is designed to run both unit and integration tests from the command line, including tests for UI interaction and navigation. The component that facilitates this is the _test context_, which simulates an interactive runtime environment.

The test context works entirely in-memory, without running an actual browser, native shell, or even a partial API such as the Document Object Model (DOM). Instead, it only implements the APIs that are part of the Desk framework itself, and then allows your code to 'query' and validate the resulting state (including UI).

The following example demonstrates how a test could activate a regular activity, interact with the simulated UI, and verify that the expected output is rendered.

{@import introduction:sample-test}

## Initializing the test context {#initialize}

To start testing your application using the test context, you'll need to register both the simulated renderer and navigation controller with the global application context. You can use the {@link useTestContext()} function from the test library package, which sets up the global context using the necessary classes.

Afterwards, the global context (i.e. `app`) conforms to the {@link TestContext} type, which in turn refers to the {@link TestRenderer} and {@link TestNavigationController} classes.

To specify additional options for the test context, you can pass a configuration object or a callback that modifies the default test context options (an object of type {@link TestContextOptions}).

- {@link useTestContext +}
- {@link TestContext +}
- {@link TestContextOptions +}

```ts
// use the test context with additional options:
let app = useTestContext((options) => {
	options.captureLogs = true;
	options.navigationPageId = "home";
});
app.renderer; // => instance of TestRenderer
```

## Testing user navigation {#navigation}

After registering the test context, all navigation actions are handled by the {@link TestNavigationController} class. The test navigation controller behaves similarly to a 'real' navigation controller, i.e. it manages its own navigation stack and allows you to route between activities using e.g. {@link GlobalContext.navigate app.navigate()}.

- {@link TestNavigationController +}

You can validate that your app has navigated to an expected path (page ID and detail), using the following method on the {@link TestCase} object. This method is asynchronous, and waits for a specified amount of time to check that the current page ID and detail match the expected values.

- {@link TestCase.expectNavAsync}

```ts
// in a test case, navigate (async) and wait for it to complete:
app.navigate("home");
await expectNavAsync(100, "home");
// ... now, the current page is "home",
// or the test case would have failed after 100ms
```

To simulate _user navigation_ instead (i.e. a user using the URL bar or clicking the back button in a browser), you'll need to use the following methods of the test navigation controller directly. These methods change the current location synchronously, and allow the activity context to respond in turn (asynchronously).

- {@link TestNavigationController.userBack}
- {@link TestNavigationController.userNavigation}

## Testing UI rendering {#rendering}

The test context simulates the rendering of UI components using the {@link TestRenderer} class. The renderer manages its own in-memory UI element tree (similar to the DOM — but with a minimal API), while no graphical rendering is actually performed.

- {@link TestRenderer +}

The 'rendered' elements are instances of the {@link TestOutputElement} class. These elements can be queried using {@link TestCase} methods (see below), and a full JSON representation of the rendered tree can be obtained using the {@link TestRenderer.getOutputDump()} method.

- {@link TestOutputElement +}
- {@link TestRenderer.getOutputDump}

### Querying rendered elements

In order to test your application's UI, you can query the rendered elements using the {@link TestCase.expectOutputAsync()} method.

This method waits for element(s) to be rendered (or fails after a specified timeout), and then returns an {@link OutputAssertion} object that allows you to validate the rendered output. The elements are matched using one or more objects with properties of the {@link OutputSelectFilter} type, each representing a filter — the first filter is applied, then the second one on all _content_ of matching elements, and so on. This way, multiple elements may be found, which may not be part of the same container.

- {@link TestCase.expectOutputAsync}
- {@link OutputSelectFilter +}
- {@link OutputAssertion +}

```ts
// in a test case:
let out = await test.expectOutputAsync(100, {
	type: "button",
	text: "Click me",
});
out.elements; // => array of TestOutputElement objects
let buttonOut = out.getSingle(); // one button, or throws
buttonOut.text; // => "Click me"
```

### Interacting with rendered elements

You can use {@link TestOutputElement} objects to simulate user interaction. Actions are typically limited to clicks and text input, but you can emit any DOM-like event on any element if needed. All events are emitted immediately, and are handled **synchronously** (e.g. invoking an activity method for a button click, before the `.click()` method returns).

- {@link TestOutputElement.click}
- {@link TestOutputElement.setValue}
- {@link TestOutputElement.sendPlatformEvent}

```ts
// ... after finding a button element:
buttonOut.click();

// ... after finding a text field element:
textFieldOut.setValue("Hello, world!");
```

> **Note:** As much as possible, mouse button, focus, and click event sequences are simulated by the test context as if the user had interacted with the UI using a mouse. The `.click()` and `.setValue()` methods therefore emit several events in sequence.

### Interacting with message dialogs

To make it easier to interact with message dialogs (i.e. dialogs rendered using {@link GlobalContext.showAlertDialogAsync app.showAlertDialogAsync()} and {@link GlobalContext.showConfirmDialogAsync app.showConfirmDialogAsync()}), rather than querying for nested labels and buttons you can use the {@link TestCase.expectMessageDialogAsync()} method.

This method waits for a message dialog to be rendered (or fails after a specified timeout), and then allows you to validate the dialog's content and interact with it using a {@link RenderedTestMessageDialog} object.

- {@link TestCase.expectMessageDialogAsync}
- {@link RenderedTestMessageDialog +}

The returned {@link RenderedTestMessageDialog} object encapsulates the rendered dialog, including its {@link RenderedTestMessageDialog.labels labels} and {@link RenderedTestMessageDialog.buttons buttons} (as {@link TestOutputElement} objects). You can then simulate user interaction using its (asynchronous) methods, to click one of the buttons and wait for the dialog to disappear.

- {@link RenderedTestMessageDialog.confirmAsync}
- {@link RenderedTestMessageDialog.cancelAsync}
- {@link RenderedTestMessageDialog.clickAsync}

```ts
// in a test case:
let p = app.showConfirmDialog("Are you sure?");
let dialog = await expectMessageDialogAsync(100);
await dialog.cancelAsync();

// with the dialog closed, the promise resolves to false
let result = await p;
expect(result).toBe(false);
```
