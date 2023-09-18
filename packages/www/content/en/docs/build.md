---
title: Building an app
abstract: Learn how to create and run a new project using the Desk framework
template: en/docpage
nav_id: build
---

<!--{{breadcrumb uplink="[Docs](/en/docs/)" name="Getting started"}}-->

# Building an app

<!--{{html-attr class="style--pageintro"}}-->

Learn how to create and run a new project using the Desk framework.

## Overview {#overview}

The Desk framework has no dependencies. You could write an app using just the code provided by Desk, and your own code.

However, to **build** your app you'll likely need some external tools, such as Node and NPM, the TypeScript compiler, and a _bundler_.

> **Note:** Bundlers combine your source code into a single file, improving performance and making it easier to deploy. Desk apps can be built using most popular bundlers out of the box, including Webpack, Parcel, and ES Build. If you've never used any of these tools, it's a good idea to familiarize yourself with one of these before continuing.

First, let's explore ways to structure your code and setup build tooling. Afterwards, we'll put all of this information together to create an example app.

## Planning your app {#planning}

Creating an app using the Desk framework doesn't require a fixed directory structure. You can consolidate all code into a single file, or split it across many. However, it's a good idea to start with the following setup, which will help you scale the application efficiently when needed.

- **Project specific files.** To start, you'll need to keep readme, license, and other documentation files at the root level of your project.
- **Configuration files.** Also at the root folder of your project, you'll need several configuration files.
  - `.gitignore` — If your project is version controlled using Git, this file is necessary to ignore build artifacts and log files in your commits.
  - `package.json` — This file turns your project directory into an NPM package, allowing you to install dependencies into the `node_modules` folder, and add build scripts. Refer to the section below for specific instructions.
  - `tsconfig.json` — This file contains configuration settings for the TypeScript compiler.
  - Bundler configuration or scripts, if any — while some bundlers (notably Parcel) will work without any configuration, some setup may be required. Webpack typically uses a `webpack.config.js` file, and the easiest way to use ES Build is using a build script, e.g. `esbuild.js`. Refer to the sections below for pointers on configuring each of these bundlers.
- **Source code folder.** As a convention, the `src` folder is used to store all source code. It may also contain other assets that are needed, such as HTML files or images. Within this folder, it's a good idea to organize code by function.
  - `app.ts` — This file functions as the starting point for your application, setting up the Desk framework and adding your activities.
  - `app.test.ts` — This file functions as the starting point for your tests, if any.
  - Activities — If your app includes only one or two activities, just keep their code in a folder within `src`. However, as your app grows, you'll want to create an `activities` folder that contains a separate _folder_ for each activity, along with their accompanying views. Since activities often represent different high-level features of your application, this method separates new features into folders, and allows you to further split activities into sub-activities when they become too large.
  - Services — If your app includes services, keep those in a `services` folder: one file for each service class.
  - Models — Any other classes that don't interact with your UI (which should be everything other than activities, views, and services) should go into a `models` folder.
  - Views — Reusable views (i.e. view _composites_ created using `ViewComposite` or by extending View directly) can go into a `views` folder, so that they can be imported by different activities and their specific views.
  - Styles — If you don't want to keep styles together with views, e.g. if you want to maintain them separately or if your app includes a lot of reusable styles, you can export style classes, icons, and custom colors from files within a `styles` folder.

Your app may not need all of these files and folders. However, when adding new code to your application, you'll want to follow this structure to ensure that the final result is easy to understand for others who may need to work with your code in the future.

## NPM dependencies {#dependencies}

By far the most common approach to building applications using JavaScript and TypeScript involves creating an **NPM package**. A package contains basic information and configuration, as well as _dependencies:_ other NPM packages that are required to be installed, before any code in the package can be built or run.

The Desk framework itself is distributed as an NPM package, which must be referenced as a dependency from your own package.

In general, you'll need to add the following dependencies to your application.

- `@desk-framework/frame-core` — This includes most of the code for Desk itself.
- A _platform-specific_ context package — At this time, only `@desk-framework/frame-web` is supported. This includes all code that sets up the Desk runtime environment for rendering within a browser.
- Optionally, the Desk test library, i.e. `@desk-framework/frame-test` — This package includes functions for running tests, asserting values, and even testing UI output asynchronously.
- Any view components that may be distributed as NPM packages.
- Bundler dependencies — Depending on your choice of tooling, you may need to add one or more packages in order to build your application.

In most cases, all dependencies can be added in as 'regular' dependencies. Alternatively, you can make a distinction between _development_ dependencies and regular dependencies, where development dependencies are those whose code isn't included in the final output (bundle).

## Build setup and bundlers {#building}

Builds need to be configured depending on which bundler you'll use, as well as any other tools or scripts required.

> **Note:** Code that doesn't run in a browser doesn't _need_ to be bundled at all. This includes code that runs within an embedded runtime (e.g. Electron). However, bundlers may still have other advantages, such as facilitating Hot Module Reloading (HMR) during development.

To complete your Desk application project, consider setting up build tools for the following use cases:

- **Production builds** — This includes compiling and/or bundling all of your code into a build output folder, usually `dist`, which can be copied to a production server, hosted by an accompanying back-end application, or included in a native application.
- **Development mode** — Most bundlers include a _watch_ mode, which triggers a re-build as soon as you save one of your source files. Afterwards, Hot Module Reload (HMR) can be used to reload just a single activity, or the entire page.
- **Test builds and runs** — Tests may need to be compiled, too. Tests that run in Node (not in the browser) don't need to be bundled. However, using the same bundler for production, development, and testing has its advantages.

A large range of options is available for the TypeScript compiler as well as bundlers and runtime environments. Usually, the Desk framework works out of the box with any bundler.

### Parcel

Out of all three options described here, Parcel is the easiest to set up. Follow the pointers below to get started.

- Parcel's zero-configuration mode works fine for apps using Desk. You can use the `parcel build` and `parcel serve` commands with a stub HTML file (e.g. `src/index.html`) which references `app.ts` directly.
- You'll only need to include a dependency for the `parcel` package in `package.json`, and Parcel will install any other build dependencies required.
- Parcel maintains a cache folder (i.e. `.parcel-cache`). Be sure to include this in `.gitignore` and clear it after updating any dependencies.
- The `tsconfig.json` file needs to be located in the package root folder for it to work with Parcel. Any other TypeScript configuration (e.g. for back-end code, or tests) can be stored in files with a different name.
- Running tests from Parcel requires significantly more configuration. Compiling tests using the TypeScript compiler (with a different output folder) and running tests using Node requires no further setup, however.

Refer to the Parcel [examples](./examples.html) for a complete setup, including configuration files for production, development, and testing.

### Webpack

Webpack requires more configuration, which is usually contained in a `webpack.config.js` file. Follow the pointers below to get started.

- Refer to the Webpack documentation to find out which packages are required for a basic build. This includes packages such as `webpack` and `webpack-cli`.
- Many different Webpack 'loaders' and plugins are available, which have to be added as NPM dependencies and loaded from within the configuration file. This includes `ts-loader`, a loader that compiles `.ts` and `.tsx` files. Without it, Webpack is not able to build a TypeScript project at all. Other plugins include `html-webpack-plugin`, which generates an HTML file to load the app in a browser.
- The Webpack dev server can be used for HMR support, along with source maps for an excellent development and debugging experience.
- Webpack can also be used to watch and run your tests. While bundling isn't actually required, Webpack's plugin architecture allows for easy inspection of build results from (a separate) configuration file, such as `webpack.config.test.js`. This can be used to spawn a Node process to run tests whenever a change is detected and a new build has completed.

Refer to the Webpack [examples](./examples.html) for a complete setup, including configuration files for production, development, and testing.

### ES Build

ES Build has an excellent API that can be used from a simple script, such as `esbuild.js` or `esbuild.test.js`. Follow the pointers below to get started.

- Use the `buildSync()` method for production builds, along with your desired configuration (e.g. format, target ES version, and output file).
- Use the asynchronous `context()` method, along with the `serve()` method of its result, to power development and test builds. You can use a simple plugin to run test output whenever a change is detected and a new build has completed.
- You can use the `external` value for the `packages` setting to avoid the Desk framework itself from being bundled into your output. This is useful if you'd like to load the Desk IIFE module directly onto an HTML page, e.g. if you have different scripts on various pages and would like the browser to cache the large Desk library JS file efficiently.

Refer to the ES Build [examples](./examples.html) for a complete setup, including configuration files for production, development, and testing.

## Example {#example}

Let's put all of these steps together, and create a simple application from scratch. We'll use Parcel as our bundler, to simplify the initial configuration.

<!--{{html-attr class=tutorial-heading}}-->

### Creating an NPM package

To create an NPM package, follow these steps:

- **Creating a folder:** Create a folder called `my-desk-app`.
- Open the folder in your editor, if you're using a visual editor such as VS Code. If you've created the folder on the command line, make sure to `cd` into this folder.
- **Creating package.json:** Within this folder, create a file called `package.json` and paste the code below into this file. You can use VS Code to do this, or use the command line if you prefer. Save the file when done.

The contents of `package.json` should be as follows:

```json
{
	"name": "my-desk-app",
	"private": true,
	"type": "module",
	"scripts": {
		"dev": "parcel serve src/index.html --open",
		"build": "parcel build src/index.html --no-source-maps",
		"test": "tsc -p tsconfig.test.json && node .test-run/app.test.js"
	},
	"dependencies": {
		"@desk-framework/frame-core": "file:../../desk/packages/frame-core",
		"@desk-framework/frame-web": "file:../../desk/packages/frame-web"
	},
	"devDependencies": {
		"@types/node": "latest",
		"@desk-framework/frame-test": "file:../../desk/packages/frame-test",
		"parcel": "2",
		"typescript": "5.1"
	}
}
```

Next, we'll **install dependencies** using the command line.

- If you're not already using the command line, open a terminal in the `my-desk-app` folder (in VS Code, use the <code>Ctrl-`</code> shortcut to open the terminal in your current project).
- Run the `npm install` command to install dependencies.

Finally, we can **set up git** for version control.

- If you want to track changes using git, run the following commands one by one to create your first commit. Also create a file called `.gitignore` with the contents listed below.
  - `git init`
  - `git add .`
  - `git commit -m "First commit"`

The contents of `.gitignore` should be as follows:

```
dist
.test-run
.parcel-cache
node_modules
*.log
npm-debug.log*
```

At this stage, you can also add a `README.md` file and any other documentastion files you may need.

<!--{{html-attr class=tutorial-heading}}-->

### Configuring TypeScript

We'll need to let the TypeScript compiler (and editors such as VS Code) know how our code should be compiled. For this, we'll use a `tsconfig.json` file.

Add a file called `tsconfig.json` with the following content:

```json
{
	"compilerOptions": {
		"outDir": "dist",
		"strict": true,
		"jsx": "react",
		"jsxFactory": "JSX",
		"module": "ES2020",
		"target": "ES2020",
		"moduleResolution": "Bundler",
		"types": ["node"]
	}
}
```

<!--{{html-attr class=tutorial-heading}}-->

### Adding source code

Now, let's add a `src` folder to contain all of our source code. You can do this in the terminal, or use an editor such as VS Code.

Within the `src` folder, create a file `index.html` with the following contents:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>My Desk app</title>
	</head>
	<body>
		<script src="app.ts" type="module"></script>
	</body>
</html>
```

This file will be used as a starting point by Parcel, and references our main TypeScript file.

In the same folder, create `app.ts` with the following contents:

```ts
// app.ts
import { useWebContext, app } from "@desk-framework/frame-web";
import { CountActivity } from "./counter/CountActivity.js";

useWebContext((options) => {
	// ...set options here if needed
});
app.addActivity(new CountActivity(), true);
```

This file calls `useWebContext()` and adds a single activity, which we'll define next.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/webcontext/useWebContext"}}-->
- <!--{{pagerefblock path="content/en/docs/main/GlobalContext.addActivity"}}-->

Now, within the `src` folder, create a `counter` folder to contain our first (and only) activity.

In the `src/counter` folder, add `CountActivity.ts` with the following content:

```ts
// CountActivity.ts
import { PageViewActivity } from "@desk-framework/frame-core";
import page from "./page.js";

export class CountActivity extends PageViewActivity {
	static ViewBody = page;

	/** The current count */
	count = 0;

	/** Event handler: called when Up is clicked */
	onCountUp() {
		this.count++;
	}

	/** Event handler: called when Down is clicked */
	onCountDown() {
		if (this.count > 0) this.count--;
	}
}
```

The `CountActivity` class contains a `count` property as well as two event handlers that increase and decrease this property. The static property `ViewBody` references our view, imported from `page`, i.e. a new file `page.tsx`.

For more information, refer to the following documentation:

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/guide/Activities"}}-->
- <!--{{pagerefblock path="content/en/docs/main/PageViewActivity"}}-->

Still within the `src/counter` folder, create `page.tsx` with the following content:

```tsx
// page.tsx
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

This file uses [JSX](./main/JSX) syntax to define our view: a large label, and two buttons. When clicked, these buttons emit `CountDown` and `CountUp` events, which are handled by the activity.

That's all for now. You should have created the following files:

- `package.json`
- `.gitignore`
- `src/index.html`
- `src/app.ts`
- `src/count/CountActivity.ts`
- `src/count/page.tsx`

<!--{{html-attr class=tutorial-heading}}-->

### Running in development mode

To run the application in development mode, we'll use the `dev` script that's configured in `package.json`.

- In your terminal window, or in your editor's embedded terminal panel, run the following command: `npm run dev`
- A browser window should appear, showing our simple application.
- Use the browser's development tools to inspect the original source code (you may need to look for the Parcel 'source root' entry). You can try adding a breakpoint within the `onCountUp()` method, and clicking the 'Up' button.

**Enabling Hot Module Reloading (HMR):** We can enable HMR while the app is running in development mode.

Change the first line of `CountActivity.ts` to include an import for `app`:

```ts
import { PageViewActivity, app } from "@desk-framework/frame-core";
```

Then, add a line at the end, to link the surrounding module with the exported class (we need to check for `module` here, otherwise this won't work for tests in Node, without Parcel).

```ts
// Enable HMR:
if (typeof module !== "undefined") app.hotReload(module, CountActivity);
```

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/main/GlobalContext.hotReload"}}-->

Now, check that HMR is enabled: increase the counter to any value other than 0, and change the button labels from Up and Down to something else, e.g. Plus and Minus. Note that the counter value stays the same while the button labels are updated.

<!--{{html-attr class=tutorial-heading}}-->

### Adding tests

To run tests, we'll use the `test` script that's configured in `package.json`.

The `npm run test` command runs the TypeScript compiler with the `tsconfig.test.json` configuration file, and then runs the compiled tests using Node.

However, we don't have a `tsconfig.test.json` file yet, nor do we have any test code. Let's fix that.

In the project root folder, create a `tsconfig.test.json` file with the following content:

```json
{
	"extends": "./tsconfig.json",
	"files": ["src/app.test.ts"],
	"compilerOptions": {
		"outDir": ".test-run",
		"moduleResolution": "NodeNext"
	}
}
```

Note that we're telling TypeScript to extend our original configuration, so we only need to specify configuration that's _different_. This includes the main entry point and output directory.

Within the `src` folder, add a new file `app.test.ts` with the following content:

```ts
// app.test.ts
import { formatTestResults, runTestsAsync } from "@desk-framework/frame-test";
import "./counter/CountActivity.test.js";

runTestsAsync().then((result) => {
	console.log(formatTestResults(result));
	if (result.failed) process.exit(1);
});
```

For more information, refer to the following documentation:

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/test/guide/index"}}-->

Now, within the `src/counter` folder, create `CountActivity.test.ts` with the following content:

```ts
// CountActivity.test.ts
import { describe, test, useTestContext } from "@desk-framework/frame-test";
import { CountActivity } from "./CountActivity.js";

describe("Counter", (ctx) => {
	test("View shows 0 initially", async (t) => {
		let app = useTestContext();
		app.addActivity(new CountActivity(), true);
		await t.expectOutputAsync(100, { text: "0" });
	});

	test("View shows 1 when Up clicked", async (t) => {
		let app = useTestContext();
		app.addActivity(new CountActivity(), true);
		let out = await t.expectOutputAsync(100, { text: "Up" });
		out.getSingle().click();
		await t.expectOutputAsync(100, { text: "1" });
	});
});
```

This file imports our CountActivity class, and describes two tests using asynchronous callback functions. These will be run by `runTestsAsync()`, one by one.

The following experiments are useful to show how the Desk library works:

- Make these tests fail, by initializing the counter to a value other than 0.
- Make the second test fail, by incrementing with a value other than 1 in `onCountUp()`.
- Add a test that checks the Down button by setting the `count` property in the test itself.
- Add a test that checks both buttons.
- Add an `accessibleLabel` property to both buttons, and use that instead of the label text.
- Initialize the test context and activity using a `ctx.beforeEach()` call within the `describe()` function, instead of within each test.

<!--{{html-attr class=tutorial-heading}}-->

### Building for production

After setting up development mode and tests, building for production using Parcel is easy.

To build production-ready output, we'll use the `build` script that's configured in `package.json`.

- If a `dist` folder already exists within your project folder, remove it first.
- In your terminal window, or in your editor's embedded terminal panel, run the following command: `npm run build`
- Check that the `dist` folder includes an `index.html` file.

**Hosting the production app:** In reality, you'll want to host your application in the cloud or on a secure web server. That involves copying the contents of the `dist` folder to your server, and setting it up to host the `index.html` file (at least).

However, to test your production output on your own computer, you can use the `http-server` NPM package. Run the following command, and check that the expected output appears when loading one of the displayed URLs: `npx http-server dist`

Congratulations! You've successfully developed, tested, and built your first application using the Desk framework.

## Next steps

Want to see what an application looks like with other bundlers, multiple activities, or a client-server setup? Take a look at these example projects.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/examples"}}-->

Ready to build with Desk? Learn about the basics using the following resources.

<!--{{html-attr class="pagerefblock_list"}}-->

- <!--{{pagerefblock path="content/en/docs/using"}}-->
- <!--{{pagerefblock path="content/en/docs/webcontext/index"}}-->
