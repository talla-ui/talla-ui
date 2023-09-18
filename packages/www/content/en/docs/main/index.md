---
title: Framework API (frame-core)
nav_id: api
nav_parent: ""
abstract: The `frame-core` package provides a platform-independent API that can be used to build front-end applications with the Desk framework.
---

## Getting started {#getting-started}

This package contains most of the classes and functions that are used by application code. In particular, it provides the infrastructure for activities, views, services.

However, this package doesn't include code for 'rendering' output, for example to a web page — you'll also need to import `@desk-framework/frame-web` for that ([reference](../webcontext/)). For more information, refer to [Building an app](../build.html).

Refer to the following articles to get started.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/introduction"}}-->
- <!--{{pagerefblock path="content/en/docs/using"}}-->

At a high level, this package defines the following groups of classes and functions:

- Basic infrastructure, for example {@link ManagedObject}, {@link Binding}, {@link bound()}, and {@link strf()}.
- Application infrastructure, such as {@link app} itself, {@link ServiceContext}, and {@link Activity}.
- UI components, most of which derive from {@link UIComponent}, such as {@link UICell}, {@link UIRow}, {@link UILabel}, and {@link UIButton}.
- View composite classes, such as {@link UIConditional} and {@link UIList}.

## All exports (A-Z) {#exports}

<!--{{docgentoc}}-->
