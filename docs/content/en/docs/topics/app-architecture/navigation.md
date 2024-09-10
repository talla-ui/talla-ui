---
folder: topics
abstract: An overview of the functionality available for navigation and routing.
---

# Navigation

## Overview <!--{#overview}-->

Desk applications use a global navigation context, like a single-page web application that runs in a browser — even if the app is _not_ running in a browser (e.g. while testing, or in a native runtime environment).

The **navigation controller** encapsulates a simplified version of the browser's history API, with methods that can be called to navigate between paths, and to go back within the navigation history. Synchronous (non-blocking) versions of these methods are also available on the global `app` object.

- {@link AppContext.navigate()}
- {@link AppContext.goBack()}

The navigation controller itself is available as {@link ActivityContext.navigationController app.activities.navigationController}, and is overridden automatically depending on the runtime platform (e.g. the browser DOM) with a specific subclass of the {@link NavigationController} class.

- {@link NavigationController +}
