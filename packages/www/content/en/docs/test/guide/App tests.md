---
title: Desk app tests
abstract: Learn how to use the Desk test package to validate your activities and views
nav_parent: "test_api"
breadcrumb_uplink: "[Test library](../)"
breadcrumb_name: Getting started
applies_to:
  - TestCase.expectOutputAsync
  - TestCase.expectPathAsync
  - TestRenderer.expectOutput
  - TestRenderer.expectOutputAsync
  - OutputAssertion
  - OutputSelectFilter
  - useTestContext
---

## Overview {#overview}

The Desk framework test package can be used to test interactive user interfaces even from the command line. The {@link useTestContext()} initialization function registers an in-memory renderer and simulated navigation path, allowing tests to validate the behavior of regular application code.

- {@ref useTestContext}

Given the following example activity, we'd want to test that the view shows correctly when the path is set to `"count"`, and that the counter goes up when the button is pressed.

```ts
class CountActivity extends PageViewActivity {
	// show the current count, and a plus button:
	static override BodyView = UICell.with(
		UILabel.withText(bound.number("counter")),
		UIOutlineButton.withLabel("+", "CountUp"),
	);

	// activate on path /count
	override path = "count";

	// start at 0, go up every time the button is pressed
	counter = 0;
	onCountUp() {
		this.counter++;
	}
}
```

We can use the following tests to achieve this. Note that we use {@link TestScope.beforeEach()} to set up a clean {@link app `app`} context before each test, and activate a `CountActivity`.

```js
describe("Count activity", (scope) => {
	scope.beforeEach(() => {
		useTestContext((options) => {
			options.path = "count";
		});
		app.addActivity(new CountActivity());
	});

	test("Activity shows view when active", async (t) => {
		// wait for a cell, look for label and button
		let expectCell = await t.expectOutputAsync(100, { type: "cell" });
		expectCell.containing({ text: "0" }).toBeRendered();
		expectCell.containing({ type: "button" }).toBeRendered();
	});

	test("Button increases count", async (t) => {
		// wait for the view, then click the button twice
		(await t.expectOutputAsync(100, { type: "button" }))
			.getSingle()
			.click()
			.click();

		// look for counter label, which should go up to 2
		await t.expectOutputAsync(100, { text: "2" });
	});
});
```

## Test app setup {#usetestcontext}

A fresh test app environment is created with each call to `useTestContext()`. This function clears the existing global context (using {@link GlobalContext.clear clear()}) and then initializes the following:

- A simulated navigation path, instance of {@link TestNavigationPath};
- An in-memory test renderer, instance of {@link TestRenderer};
- A theme with some empty styles;
- An empty viewport context.

This function accepts a configuration function, to set {@link TestContextOptions} with the following properties:

- {@ref TestContextOptions.path}
- {@ref TestContextOptions.pathDelay}
- {@ref TestContextOptions.renderFrequency}

```js
useTestContext((options) => {
	options.path = "some/path";
	options.pathDelay = 1;
	options.renderFrequency = 5;
});
```

## TestCase methods {#testcase-methods}

The following methods of the {@link TestCase} class can be used to validate application output, even without actually rendering to the screen. Refer to the sections below for more details.

- {@ref TestCase.expectPathAsync}
- {@ref TestCase.expectOutputAsync}

## Matching activity paths {#matching-path}

The test activity context included in the `test` library simulates user navigation using a history 'stack', similar to a browser.

Programmatic navigation (e.g. using {@link GlobalContext.navigate app.navigate()}, or a button click) is handled automatically. Note that paths are set asynchronously — just like they would in a browser.

Use the {@link TestCase.expectPathAsync expectPathAsync()} method to wait for changes to take effect. Alternatively, use the `path` option in a call to {@link useTestContext()} to set an initial path without having to wait.

```js
describe("My app", () => {
	test("Navigation paths", async (t) => {
		useTestContext((options) => {
			options.path = "foo";
		});
		expect(app.getPath()).toBe("foo");

		// set another path asynchronously
		app.navigate("/bar");
		await t.expectPathAsync(100, "bar");
	});
});
```

Furthermore, you can use the following methods to simulate user navigation — changing the URL in the address bar, or pressing the Back button. These methods also update the navigation path immediately, rather than asynchronously, just like they would in a browser.

- {@ref TestNavigationPath.userNavigation}
- {@ref TestNavigationPath.userBack}

## Matching view elements {#matching-view}

The test renderer included in the `test` library allows for querying the rendered output, and simulating user interactions: clicks, key presses, and other events.

> **Note:** Since view output is rendered asynchronously, you'll need to test the UI in an asynchronous test function.

Initially, the `expectOutputAsync()` method can be used to wait for output to appear, using a set of selection filters. If multiple objects are passed to this method, _nested_ elements are matched — e.g. a cell, containing a row, containing a button with a particular label.

- {@ref TestCase.expectOutputAsync}
- {@ref OutputSelectFilter}

```js
await test.expectOutputAsync(
	100,
	{ type: "cell" },
	{ type: "row" },
	{ type: "button", text: "Click me" },
);
```

The resulting {@link OutputAssertion} object may refer to _multiple_ matching elements, similar to the result of the `querySelectorAll()` DOM method. Use the {@link OutputAssertion.elements elements} property and methods to validate an output assertion:

- {@ref OutputAssertion.elements}
- {@ref OutputAssertion.containing}
- {@ref OutputAssertion.getSingle}
- {@ref OutputAssertion.getSingleComponent}
- {@ref OutputAssertion.toBeRendered}
- {@ref OutputAssertion.toBeEmpty}

Each element represents a part of the output, similar to a DOM node. Refer to the {@link TestOutputElement} class for a list of properties and methods available.

- {@ref TestOutputElement}

## Simulating UI interactions {#interaction}

In particular, the {@link TestOutputElement} class allows you to simulate user interaction.

Once you've selected one or more output elements through an {@link OutputAssertion} object (see above), you can interact with each element using the following methods:

- {@ref TestOutputElement.click}
- {@ref TestOutputElement.setValue}
- {@ref TestOutputElement.focus}
- {@ref TestOutputElement.blur}

Combining output assertions and simulated interactions allows you to test your views as they would appear on screen, and validate effects on both the UI and the state of your activities afterwards.

## Related {#related}

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/index"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/Writing tests"}}-->
- <!--{{pagerefblock path="content/en/docs/test/guide/Assertions"}}-->
