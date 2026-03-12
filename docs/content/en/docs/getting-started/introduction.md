---
title: Introduction
abstract: An overview of the Tälla UI framework and its core concepts.
---

# Introduction

Tälla UI is a TypeScript framework for building maintainable client-side applications. It structures your code into separate layers with clear boundaries between them.

## Core concepts

**Activities** manage application state and lifecycle. Each activity represents a place in your application that can be activated or deactivated, typically in response to navigation.

**Views** define the UI declaratively using builder functions. A view describes what should appear on screen without any knowledge of how it will be rendered.

**Handlers** connect the framework to a specific platform. The web handler renders to the browser DOM. The test handler renders in memory for unit testing. Both implement the same interface, so your application code works with either.

## A minimal application

```typescript
import { Activity, UI } from "talla-ui";
import { useWebContext } from "@talla-ui/web-handler";

class MainActivity extends Activity {
	static override View() {
		return UI.Column(UI.Text("Hello, world!").center()).flex().centerContent();
	}
}

const app = useWebContext();
app.addActivity(new MainActivity(), true);
```

`Activity` defines the application logic. The static `View()` method returns a declarative UI tree built from `UI.Column`, `UI.Text`, and other builder functions. `useWebContext()` initializes the web handler and returns the application context, which is used to add activities and start the application.

## What's included

The framework provides built-in support for:

- **UI elements** — buttons, text, text fields, toggles, images, containers, lists, and more
- **Reactive state** — observable objects and one-way data binding
- **Routing** — path-based navigation with automatic activity lifecycle management
- **Forms** — form state with schema-based validation
- **Styling** — colors (with OKLCH support), gradients, style overrides, and theming
- **Modals** — dialogs, message dialogs, and dropdown menus
- **Internationalization** — localization and string formatting

There are no external runtime dependencies beyond the framework itself.
