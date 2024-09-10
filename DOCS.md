# Maintaining documentation

The documentation for the Tälla UI framework is located at https://talla-ui.dev

This file is about _writing and building documentation_. For general help, refer to the website or see [`README.md`](./README.md).

For general contribution guidelines, also see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Building and previewing docs

The content for the website is generated from this repository.

- Source content for the home page and all documentation is located in [`docs`](./docs/).
- Content for reference documentation (for each function, class, method, etc.) is taken from JSDoc-style source code comments.

A build step is required to generate, format, and cross-reference all of this content. The build step uses a stand-alone documentation generator (located in the [`docgen`](./packages/docgen/) package folder). For details, refer to the documentation in the source code of this package.

To build the website from source code and `docs` content, run the `npm run www-build` command from the _root_ folder of this repository.

Afterwards, preview the website using the `npm run www-serve` command.

## Writing docs

When writing documentation, take note of the following stylistic guidelines.

- For function/method abstracts, start with a third-person verb where possible: _creates_ something, _adds_ a widget, _returns_ a list.
- For class/property/variable abstracts, use the prompt "This is/these are..." (but do not include it), e.g. _a representation of ..., an interface that describes ..., a set of ..., a class that provides access to / manages ..., the superclass for all..._, etc.
- Use active voice as much as possible.
- Address the user where appropriate (as 'you') in order to avoid passive voice. Use phrases such as _You can also ..., because ... you must ..._, etc.
- API reference docs are not tutorials: avoid first person plural: 'we', 'us', 'let's', etc. especially in source code comments and overview documents.
- Do **not** use the word 'please'. This is a specification, not a conversation.
- It's fine to use contractions like it's, hasn't, doesn't, etc., except for emphasis: 'these are **not** otherwise required'.

The [Microsoft writing style guide](https://learn.microsoft.com/en-us/style-guide/welcome/) is a helpful resource when in doubt about spelling or grammar.

## Writing reference content

Reference content (pages for all functions, classes, methods, etc.) is generated automatically from JSDoc comments in the source code for all packages.

The first line of a JSDoc comment is considered the item's _abstract_, i.e. a short description. Lines that directly follow the abstract are considered _notes_, and must generally be in the form of an unordered list.

Everything after the first blank line is added to the _description_, except where preceded by a tag. The following tags are understood by the documentation generator.

1. `@deprecated` — Deprecation warnings (must be followed by an explanation and version number).
2. `@summary` — Summary section, which is inserted _before_ parameters and return types of a function.
3. `@note` — A single note, which is turned into a 'Note' blockquote (see below).
4. `@see` followed by a `{@link ...}` reference, on a single line.
5. `@param` followed by a parameter name and description (no type).
6. `@returns` followed by a description of the return value.
7. `@error` followed by a description of possible errors that may be thrown.
8. `@description` (not necessary, but could be used as a clarification in JSDoc code)
9. `@example` on a single line, followed by a block of example code.

### Blockquotes

To call out important parts of the documentation, the documentation generator and HTML templates turn both `@note` tags in the JSDoc comment and blockquotes in Markdown that start with a single word directly followed by a colon (e.g. `> Note: ...`) into larger stylized blocks, similar to the below.

> **Example**\
> This is an example block quote that could be generated from a simple blockquote in markdown or JSDoc.

### Using JSDoc links

Use the `{@link ...}` inline JSDoc tag for cross-referencing: `{@link SomeThing}` or `{@link Some.method()}`, optionally with a title as `{@link X.yz yz(...)}`.

Use the `@see` JSDoc block tag _with_ a `{@link ...}` tag for page-level references.

### Headings

Do **not** use headings within JSDoc comments. Note that headings are automatically inserted, including for notes, parameters, return values, errors, summary, and description (i.e. `@summary` and `@description` JSDoc tags).

To add sub sections in a long Description section, use bold style followed by two dashes (an em dash) and continue on the same line. E.g.:

**Sub heading** -- This paragraph is about a separate topic. It stands out from the rest of the text using the sub heading in bold. don't use real headings (`### Heading`) in JSDoc comments.

Where JSDoc descriptions get too long, consider moving content to a separate article.

## Translating documentation

The docgen system has been created with translation in mind, however there's no way to add other languages yet.

In particular, the `docgen` package is able to output pre-processed Markdown files for translation. Additional build steps can be added to generate another website section using translated Markdown.

(TODO: Need a way to translate just the top of a pre-processed Markdown file without considering references, since those might change dynamically even if the general description of e.g. a class stays the same.)
