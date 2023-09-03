# Maintaining documentation

The documentation for the Desk framework is located at https://desk-framework.com.

## Building docs

The content for the Desk framework website is generated from this repository.

- Source content for the website home page and all documentation is located in [`packages/www/content/`](./packages/www/content/)
- Content for reference documentation (for each function, class, method, etc.) is taken from source code (JSDoc) comments.

A build step is required to generate, format, and cross-reference all of this content. The build step is based on [markdown-pipeline](https://github.com/jcormont/markdown-pipeline), in addition to a purpose-built parser for `.d.ts` files.

To view website output for the content in the current repository branch, take the following steps:

1. Install NPM package dependencies
2. Build all packages
3. Generate website content
4. Start a web server to host the generated output

Use the following commands from the **repository root** folder:

```sh
npm install
npm run build
npm run www
npx http-server _site
```

After making a change to markdown content _only_, repeat the `npm run www` command. If you've also changed the pipeline or docgen code, run the `npm run www-build` command instead.

## Writing docs

### Information architecture

The information in the Desk docs is arranged by _task_, as much as possible.

- Getting started — _Top-down exploration_
  - Introduction — **Task:** initial exploration, getting to know the framework from scratch. This article discusses goals, and high-level architecture.
  - Building an app — **Task:** initial exploration of the build process. This article shows what's required to get to a working app. (Includes _tutorial_ for a simple web app only, the article isn't meant to discuss all possible setups; examples work better for that)
  - Examples — **Task:** browsing more example materials for inspiration, or finding a working build setup using a specific tool/platform. This article refers to the examples repo on GitHub.
- Guides — *Exploration by topic*
  - **Task:** Finding out how to get started with a particular feature, e.g. handling events, creating activities, creating views, etc.
  - These guides provide context, but don't duplicate specific information that's already in the reference docs (where possible). This way, the developer can read through the article for an overview to understand what's going on, but may need to dip into reference docs for details.
  - Guides may include _tutorials_ (TBD), but only where it makes sense.
- Reference — _Bottom-up information_
  - **Task:** Finding out more information about a specific API symbol.
  - These docs provide direct information to answer a question, if the developer already knows what they're looking for, AND
  - These docs link back to relevant guides, to provide more context or alternative solutions.
  - These docs do NOT describe context outside of the current symbol (but may include further links), and do NOT include tutorials (but may include simple examples).

> **Note:** the docs for this project have been through a massive evolution over the years, and it's likely that some of the information would be better placed elsewhere. Feel free to open an issue in GitHub if you have an idea for such an improvement; avoid a large PR to move docs around.

### Voice

Some general notes on writing style:

- Use active voice as much as possible.
- You can address the user where appropriate (as 'you'), generally in phrases such as _You can also ..., because ... you must ..._ or to avoid passive tone.
- API docs are not tutorials: avoid first person plural: 'we', 'us', 'let's', etc.; these are reserved for tutorials.
- Do **not** use the word 'please'. This is a specification, not a conversation.
- It's fine to use it's, hasn't, doesn't, etc., except for emphasis where needed; 'these are **not** otherwise required'.
- For function/method abstracts, start with a third-person verb where possible: _creates_ something, _adds_ a widget, _returns_ a list.
- For class/property/variable abstracts, use the prompt "This is/these are..." (but do not include it), e.g. _a representation of ..., an interface that describes ..., a set of ..., a class that provides access to / manages ..., the superclass for all..._, etc.

The [Microsoft writing style guide](https://learn.microsoft.com/en-us/style-guide/welcome/) is a helpful resource when in doubt about spelling or grammar.

## Writing reference content

Reference content (pages for all functions, classes, methods, etc.) is generated automatically from JSDoc comments in the source code for all packages.

### Reference pages

Auto-generated reference documentation pages for each exported item include the following content sections, where defined in JSDoc:

1. Header with title and link to containing item (e.g. class, interface), if any
2. Tags, for e.g. `readonly`, `protected`, and `static` — parsed automatically, not necessary to include these in JSDoc
3. Abstract — **first line of JSDoc comment**
4. Signature — full code from `.d.ts` file, without nested JSDoc comments
5. Deprecation warning if any — **from `@deprecated` JSDoc tag**
6. Summary section — **from `@summary` JSDoc tag**
7. Notes section — **any JSDoc content that's not within a `@description` or `@summary` block**
8. Parameters — **from `@param` JSDoc tags**
9. Return value — **from `@returns` JSDoc tag**
10. Errors — **from `@error` JSDoc tag** (or `@throws`, `@exception` tags)
11. Extended description — **from `@description` JSDoc tag**
12. Guide backreferences — from markdown content, using their `applies_to` fields
13. Structure members (class, interface, namespace) — from `.d.ts` file
14. Examples — **from `@example` JSDoc tags** (code only)
15. Related content — **from `@see` JSDoc tag, plus containing item**

### Using JSDoc links

Use the `{@link ...}` inline JSDoc tag for cross-referencing: `{@link SomeThing}` or `{@link Some.method()}`, optionally with a title as `{@link X.yz yz(...)}`.

Use the `@see` JSDoc block tag _with_ a `{@link ...}` tag for page-level references.

### Headings

Do **not** use headings within JSDoc comments. Note that headings are automatically inserted, including for notes, parameters, return values, errors, summary, and description (i.e. `@summary` and `@description` JSDoc tags).

To add sub sections in a long Description section, use bold style followed by two dashes (an em dash) and continue on the same line. E.g.:

**Sub heading** -- This paragraph is about a separate topic. It stands out from the rest of the text using the sub heading in bold. don't use real headings (`### Heading`) in JSDoc comments.

Where JSDoc descriptions get too long, consider moving content to a separate article.

### Example

The following example shows the use of JSDoc tags to populate the appropriate sections above.

**Note:** Line endings are optional, do NOT wrap lines manually within JSDoc comments. The example below includes hard line wraps only because code within Markdown usually isn't wrapped automatically.

```ts
/**
 * A representation of some model
 *
 * @description
 * This is a lengthy description. It documents what this class
 * is for and how it works.
 *
 * Descriptions may include multiple paragraphs, and Markdown
 * formatting as well as {@link links()}. All sentences should
 * be grammatically correct, and end with a full stop.
 *
 * @note Notes within the description are placed inside the
 * Description section. Otherwise they're added to their own
 * section.
 *
 * @example
 * // Description of this example
 * let here = some.code()
 *
 * @example
 * // Another example
 * 1 + 1
 *
 * @see {@link SomeOtherClass}
 */
class MyClass {
	/**
	 * Performs a task described here
	 *
	 * @summary This summary will be displayed _above_ parameters,
	 * exceptions, and return type. It should not be too long.
	 *
	 * @param num The input for this method
	 * @returns The result of this method
	 * @error Throws an error when the number is too large
	 * @error Throws another error when the number is too small
	 *
	 * @description
	 * This is a longer description that appears below the
	 * param/returns/error sections. It can be used to provide
	 * details about specific conditions.
	 *
	 * @see {@link otherMethod()}
	 */
	myMethod(num: number): string {
		// ...
	}

	/**
	 * Returns a magic number.
	 * This text appears under the Notes section.
	 * @param x The original number
	 * @returns The magic number
	 * @note This note also appears in the Notes section.
	 */
	otherMethod(x: number): number {}

	/**
	 * Creates trouble for the user
	 * @deprecated This method is deprecated in favor of
	 * {@link someOtherMethod()}
	 */
	isDeprecated() {}

	/** Returns a daily quote from the internet */
	dailyQuote(): string {
		// One-liners may be acceptable in some cases,
		// resulting in _only_ an abstract and declaration
	}
}
```
