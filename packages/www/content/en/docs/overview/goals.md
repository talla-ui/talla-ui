---
output: docs/goals.html
template: doc_article
title: Why Typescene?
description: An introduction to the Typescene framework and an explanation of its design principles.
pageintro: With so many great platforms and tools available today, it's easier than ever to build an interactive Web application. So why do we need yet _another_ framework to choose from?
---

## Maintainability {#maintainability}

Web development has come a long way. But all of this progress has come at a cost. Opening up a years-old project that was written in the favorite framework-du-jour inevitably leads to compatibility problems. It is rarely possible to make a few changes and have the code compile just fine, something that typically works just fine on 'native' platforms such as WinForms and Cocoa.

Sure enough, modern package managers have solved some of these versioning and compatibility issues, but library APIs are constantly in flux. New ideas come in and 'legacy' ones disappear. This adds strain on developers, who will need to remember the (hypothetical) peculiarities of some ‘willUpdate’ method that was changed in version 14.2.132 of framework X.

If constantly upgrading to the latest version is not an option, we're setting ourselves up for trouble down the road.

This might not be an issue for one-offs, personal projects, and big corporate websites that are constantly being worked on, but _maintainability is a major concern for any software that needs to be supported by a business or other organization in the long term_.

Such projects increasingly often leverage the flexibility of JavaScript, but they aren't 'websites'; often these are desktop or mobile app-like experiences. Most of their code isn't updated constantly, nor is it written once and then forgotten -- but rather something in between. Such application code needs to be maintainable in the long run. This is where the design goals of the Typescene framework come in.

## Design Goals {#goals}

* __No runtime dependencies on external libraries, *at all*.__ This makes it possible to re-build your app as long as you can compile TypeScript code (which is probably a very long time).
* __Traditional object-oriented (OO), event-driven approach.__ As developers, we tend to view UI elements as dynamic 'widgets', and OO fits this model perfectly. Event-driven UI programming has been the standard for decades and is easy to understand for new developers, so there's no need to reinvent the wheel here.
* __Strongly typed.__ Your future self (or colleague) will thank you if your text editor can help you figure out what your code means, highlight errors before compiling, and can even suggest ways to refactor your code. Auto-completion and automatic imports should work out of the box in editors such as Visual Studio Code.
* __No revisions to the architecture, *ever*.__ Code shouldn't have to be completely rewritten to be compatible with the next major version of Typescene. We all have better things to do.
* __Not too big, not too small.__ Typescene provides you with a complete runtime environment out of the box, for a consistent foundation that works for apps of any size — you'll only need external modules to import complex UI components or application behaviors that aren't included in the framework itself.

Most importantly, Typescene hasn't been invented overnight, it's _not_ a Minimum Viable Product that introduces some clever new paradigm. It's the result of years of practical experimentation, refactoring, and validation — built to last, and ready to support modern applications in the real world.

---

### Further reading

Learn more about [how Typescene works](/docs/introduction).
