# Contributing

Welcome, and thanks for considering to help! There are a number of ways you can get started:

- **Getting the word out:** Promote the framework to your friends and colleagues, and use social media to tell others about why you like it.
- **Make cool stuff:** Make demos and examples that others can use for inspiration. If you're proud of what you've made, [Reddit](https://www.reddit.com/r/talla_ui/) is probably the best place to share it, along with social media or your personal blog of course.
- **Writing or translating documentation:** Producing quality documentation takes _a lot_ of work. You can help! Refer to the Documentation section below to get started.
- **Writing code:** Read the Development section below to get started.

## Questions

👉 If you have a question, please don't file a GitHub issue. Use a platform such as [Reddit](https://www.reddit.com/r/talla_ui/) or other social media instead.

## Issues

👉 If you believe you've found an issue, create a [GitHub issue](https://github.com/talla-ui/talla/issues) — make sure you include all necessary details including a minimal test case.

## Writing documentation

The project documentation is primarily located on [the website](https://talla-ui.dev), which is generated using source code comments as well as content from the [`docs`](./docs/) folder.

👉 Refer to [DOCS.md](./DOCS.md) for instructions on writing and building documentation.

## Development

Development of most of the published packages happens in this repository, with all of the code located in the [`packages`](./packages/) folder. This includes:

- [`core`](./packages/core/) — Source code for the `talla-ui` package, which provides the core API.
- [`test-handler`](./packages/test-handler/) — The `@talla-ui/test-handler` package, for the test handler and library APIs.
- [`run-tests-esbuild`](./packages/run-tests-esbuild/) — The `@talla-ui/run-tests-esbuild` command-line test runner.
- [`web-handler`](./packages/web-handler/) — The `@talla-ui/web-handler` package, which provides the plumbing for using the framework as part of a Web application.
- [`docgen`](./packages/docgen/) — The `@talla-ui/docgen` package, which is used to generate documentation in the `docs` folder, but can also be used on its own from other packages outside of this repository.

## Building and testing

Run the following commands from the _root_ repository folder to build and test the source code.

- `npm install` — this will also install and link up dependencies in package folders.
- `npm run build` — this will build all packages in one go (but not documentation).
- `npm run www-build` — this will build the documentation (in the `docs` folder), can only be run after the above commands.
- `npm run www-serve` — after running the `www-build` script, this serves the website locally.
- `npm run check-format` — this is automatically run for new PRs, and checks source code formatting using Prettier.
- `npm run check-docs` — this is also run for new PRs, and checks source code comments (especially links).
- `npm test` — the final test for new PRs, this tests both the test handler itself as well as the core package.
- `npm test-c8` — this creates a code coverage report (as HTML, serve using e.g. `npx http-server .coverage`).
- `npm buildtest-...` — these commands (see `package.json`) run and start sanity checks for several build tools. This isn't a complete test suite, but ensures that framework code can actually be compiled as part of an application.

## Project management, issues, and PRs

All development happens on GitHub, using issues and pull requests.

> **NOTE:** One of the key features of Tälla UI is a stable API. At this point, you'll find that feature requests and new ideas are usually not accepted at all while we focus on quality of both code and documentation.

To create a PR:

- Fixing a bug? Reproduce the issue first in a minimal code sample, or (if the bug is present in the core API or test handler) in a new test that you add to a fork of this repository. Then, file a clear issue and create a PR to close it. Please allow maintainers to access your fork using the appropriate GitHub setting.
- Fixing a typo, documentation, or dependency issue? Read the considerations in [`DOCS.md`](./DOCS.md) and create a PR, clearly labeling it as a 'Docs' or 'Chore' PR.

In general, you should create a PR against the `main` branch which contains the production version of the framework and website.
