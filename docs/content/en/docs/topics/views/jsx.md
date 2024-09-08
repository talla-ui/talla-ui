---
folder: topics
abstract: Use JSX to define views using HTML-like syntax.
---

# JSX syntax

## Overview <!--{#overview}-->

## Using JSX syntax <!--{#jsx}-->

While views can be defined using the `ui` functions mentioned above, some developers may prefer to use JSX syntax to define views. JSX is a syntax extension for JavaScript (and TypeScript) that looks similar to XML or HTML, and can also be used to define a preset view hierarchy.

In general, properties that are preset using an object that's passed to a `ui` function can be set as attributes on the corresponding JSX element. The JSX element corresponds to a _class_, not a view object.

```ts
// {@sample :jsx}
```

Under the hood, JSX is rewritten to a series of nested function calls to `ui.jsx(...)`. At runtime, this function in turn calls the corresponding `ui` function for each element (returning the preset class).

- {@link ui.jsx}

> **Note:** There's no need to call `ui.jsx()` yourself, ever. However, this function is critical to transform JSX code into a preset class, and you'll need to configure your build toolchain to support this transformation.

**Setting up TypeScript** — To use JSX in your Desk application with TypeScript, apply the following changes:

- In your `tsconfig.json` file, set the `jsx` property to `react`. This allows TypeScript to deduce the correct types for JSX attributes.
- Also in your `tsconfig.json` file, set the `jsxFactory` property to `ui.jsx`. This tells TypeScript to use the `ui.jsx` function to transform JSX code.
- Make sure all view files that use JSX have the `.tsx` extension.
- In your view files, import the `ui` object from the `@desk-framework/frame-core` package (this is also used for other functions such as {@link ui.color()}).

Typically, views are defined in separate files (with a `.tsx` extension if using TypeScript and JSX) which export a single preset view class as `default`. This class can then be imported and used in your application, for examply by an activity.

```ts
// {@sample :jsx-export}
```

### Boolean attributes

### Text attributes as content
