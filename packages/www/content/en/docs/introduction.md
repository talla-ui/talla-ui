---
title: Introduction
abstract: Start here for an introduction to the Desk framework
template: en/docpage
nav_id: introduction
---

<!--{{breadcrumb uplink="[Docs](/en/docs/)" name="Getting started"}}-->

# Introduction

<!--{{html-attr class="style--pageintro"}}-->

Start here to get an overview of the Desk framework and its high-level architecture.

## What is Desk? {#what-is-desk}

The Desk framework provides a comprehensive starting point for developing interactive front-end applications using TypeScript or JavaScript.

**Distribution** — The framework is distributed as a set of packages on the NPM registry. These packages can be included in an application by _bundling_ their code, or by including a compiled JavaScript file on an existing HTML page.

The application can then use the provided functionality on multiple platforms, to display and update UI elements, respond to user input, and perform other tasks such as managing application state and formatting text.

**Goals** — As a framework for interactive client-side or 'native-like' applications, Desk's main goals include _maintainability_ and _scalability_ of application code, rather than optimizing for benchmarks such as first-render performance, or the number of lines it takes to output 'Hello, world'.

- **Clear separation of concerns** — With an architecture that's inspired by mature (native) UI frameworks, the Desk framework encourages clear separation of concerns, keeping code organized even as your application grows.
- **Self-contained** — A lack of dependencies (other than build tooling) ensures that your applications can be updated long into the future without running into compatibility issues.
- **Strongly typed** — Thanks to TypeScript, Desk offers a better developer experience with accurate auto-completion and documentation.

## Architecture overview {#architecture}

At a high level, Desk provides a way to split your application into smaller parts, while taking on basic functionality such as rendering content and handling events. Rather than using HTML and CSS to describe the content of a 'page' or component, you'll build an application using _views_, _activities_, and _services_.

**Object oriented** — The Desk framework is object oriented, meaning that every part of your application is defined using classes and objects — from a single button (an instance of [`UIButton`](./main/UIButton.html)), to every view, activity, and service, as well as the application _itself_ (the [`app`](./main/app.html) object).

**Hierarchy** — Within this collection of objects, Desk makes effective use of _encapsulation_ to keep everything organized. At runtime, every object that's managed by Desk can be 'attached' only to a single parent, making the app a simple tree structure of objects. This enables consistent **event handling** (bottom-up) and one-way **data binding** (top-down) without any extra effort.

- The `app` object contains a list of services and activities
- Activities may contain other activities, and views
- Views may contain other views, and UI components.

Let's take a look at how views, activities, and services are defined in your code.

**Views** — At the lowest level of the app hierarchy are views. These consist of UI components such as buttons, labels, and text fields, arranged in groups such as rows, columns, and cells. Together, these are rendered to the screen when the user uses your application.

You can define views using regular JavaScript syntax, by calling static `.with` methods:

```ts
// view.ts
import {
	bound, UICell, UILabel, UISpacer, UICenterRow, UIOutlineButton
} from "@desk-framework/frame-core";

export default UICell.with(
	UILabel.with(
		text: bound.number("count"),
		textStyle: { fontSize: 36, bold: true }
	),
	UISpacer.withHeight(32),
	UICenterRow.with(
		UIOutlineButton.withLabel("Down", "CountDown"),
		UIOutlineButton.withLabel("Up", "CountUp")
	)
);
```

Or, you can define views using JSX-style syntax:

```tsx
// view.tsx
import { JSX } from "@desk-framework/frame-core";

export default (
	<cell>
		<label textStyle={{ fontSize: 36, bold: true }}>%[count]</label>
		<spacer height={32} />
		<centerrow>
			<outlinebutton onClick="CountDown">Down</outlinebutton>
			<outlinebutton onClick="CountUp">Up</outlinebutton>
		</centerrow>
	</cell>
);
```

> **Note:** For a step-by-step guide that includes the code above, refer to [Building an app](./build.html).

**Activities** — Since views only determine what your app _looks like_, you'll need to add activities to determine how it _behaves_.

Each activity represents a 'place' in an application — this could be a full page, a popup dialog, or any other part of the UI. An activity can be _active_ or _inactive_; while active, the attached view (if any) is rendered to the screen. Together, the activity's properties determine its _state_, which can be used by the view through bindings; in turn, the view emits events that are handled by the activity.

In our example, we define an activity by extending the [`PageViewActivity`](./main/PageViewActivity.html) class. The current count (our state) is exposed as the `count` property, which is _bound_ by the view above. Both the `CountUp` and `CountDown` events (emitted by either button in the view) are handled using specially named methods.

```ts
// CountActivity.ts
import { PageViewActivity } from "@desk-framework/frame-core";
import view from "./page.js";

export class CountActivity extends PageViewActivity {
	static ViewBody = page;

	/** The current count */
	count = 0;

	/** Event handler: called when Up is clicked */
	onCountUp() {
		this.count++;
		// ...since count is bound by the view,
		// setting this property automatically updates the view, too
	}

	/** Event handler: called when Down is clicked */
	onCountDown() {
		if (this.count > 0) this.count--;
	}
}
```

Note that the activity code doesn't need to know how the `count` property ends up being displayed, or how UI components are laid out (although it can find out which UI component emitted an event, from the event object that's passed to the handler method). Similarly, the view doesn't need to know how events are handled, or where the bound `count` value comes from.

This allows you to split views and activities into different classes when they get too large, adding another level to the application hierarchy without having to rewrite much of your code.

**Services** — After adding multiple activities, some application data and logic shouldn't 'belong' to the activity anymore. In that case, it's a good idea to move those parts to _services_.

Services are instances of arbitrary classes, which are made available to the rest of your application _by name_. Services can be _observed_, to watch for changes and listen for events.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Views"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/Activities"}}-->
- <!--{{pagerefblock path="content/en/docs/main/guide/Services"}}-->

**Global app context** — The singleton [`app`](./main/app.html) object sits at the root of the application hierarchy. It keeps track of activities and services, and handles other important tasks, including:

- Navigation and routing: activities can be activated and deactivated automatically based on the current path (URL)
- Error handling and logging
- Localization and internationalization (i18n), including text translation
- Rendering (asynchronously) and styling using themes.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/app"}}-->

The app is usually initialized in `app.ts`, the main entry point of the application — adding activities, services, and setting any other options as needed.

```ts
// app.ts
import { useWebContext, app } from "@desk-framework/webcontext";
import { CountActivity } from "./CountActivity.js";
import { MyService } from "./MyService.js";

useWebContext((options) => {
	// ...set options here
});
app.addActivity(new CountActivity(), true);
app.addService("MyService", new MyService());
```

**Test library** — Since Desk takes over the implementation details of rendering and navigating, removing those from your code, it's possible to reuse the same code for unit and integration tests. You can write tests for activities, views, and services that run in Node — on the command line or as part of a CI/CD pipeline — without having to emulate a browser or native app platform.

The Desk `test` library provides a way to define and run tests, and also enables you to control and inspect UI elements as part of your tests without rendering to a 'real' platform:

```ts
// CountActivity.test.ts
describe("Counter", (scope) => {
	let activity: CountActivity;
	scope.beforeEach(() => {
		useTestContext();
		activity = new CountActivity();
		app.addActivity(activity, true);
	});

	test("Button increases count", async (t) => {
		// 1. wait for button to be rendered
		let out = await t.expectOutputAsync(100, { type: "button", text: "Up" });

		// 2. click it twice
		out.getSingle().click().click();

		// 3. check that the activity property is now 2
		expect(activity).toHaveProperty("count").toBe(2);

		// 3. wait for a label with text "2"
		await t.expectOutputAsync(100, { type: "label", text: "2" });
	});
});
```

For more information, refer to the test library reference documentation.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/index"}}-->

## Use cases {#use-cases}

With its object-oriented application/activity/view architecture, the Desk framework is optimized for complete client-side or 'native-like' applications, **or** complex interactive components that are added to an existing website.

_Desk is not a one-size-fits-all solution:_

- Desk is **not** a good choice for _content-first_ web experiences — the framework is only capable of rendering UIs on the client side, limiting what's visible by search engines, and taking time to run on every page. This is intentional.
- Desk is **not** a good choice for very small widgets — its compressed (gzip) bundle adds ~40kB overhead to the initial page load.

**Good** use cases for the Desk framework include —

- Single-page applications (SPAs): immersive full-screen apps, e.g. productivity apps, business apps, dashboards, e-learning, and customer portals. These applications usually require login (removing the need for search engine access), and include lots of client-side application logic.
- Mobile apps, and mobile-first web applications.
- Complex forms, calculators, and other website components, e.g. support tickets, insurance claim forms, mortgage calculators, or chat widgets.
- Prototypes and MVPs: ideal for quickly testing ideas with a focus on user interaction, the Desk framework provides good UI defaults with a minimal amount of setup.

Do you have other ideas for use cases, or great example applications? Share it with the Desk community on our [subreddit](https://www.reddit.com/r/desk_framework/)!

## Next steps

Want to see what an application that's made with the Desk framework looks like? Check out these example projects.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/examples"}}-->

Ready to build with Desk? Get started with your own app, and learn about the basics using the following resources.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/build"}}-->
- <!--{{pagerefblock path="content/en/docs/using"}}-->
