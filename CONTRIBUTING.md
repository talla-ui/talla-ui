# Contributing

Welcome, and thanks for considering contributing to the Desk framework! There are a number of ways to help out:

- **Getting the word out:** Promote the Desk framework to your friends and colleagues, and use social media to tell others about why you like it.
- **Using the framework to make cool stuff:** Make demos and examples that others can use for inspiration. If you're proud of what you've made, [Reddit](https://www.reddit.com/r/desk_framework/) is probably the best place to share it, along with Twitter, Mastodon, and a personal blog.
- **Writing or translating documentation:** Producing quality docs takes _a lot_ of work. Refer to the Documentation section below to get started.
- **Writing code:** Read the Development section below to get started.

## Questions

👉 If you have a question, please don't file a GitHub issue. That's **not** the right way to get a helpful response. Use a platform such as [Reddit](https://www.reddit.com/r/desk_framework/), Twitter, or Mastodon instead.

## Issues

👉 If you believe you've found an issue, create a [GitHub issue](https://github.com/desk-framework/desk/issues) — make sure you include all necessary details including a minimal test case.

## Writing documentation

Desk framework docs are primarily located on [the Desk framework website](https://desk-framework.com). This is a static website, maintained using this same repository, in the [`packages/www`](./packages/www/) folder.

The website is generated from static content in **Markdown files**, in addition to content from **JSDoc comments** in the source code.

👉 Refer to [DOCS.md](./DOCS.md) for instructions on building documentation and writing JSDoc comments.

## Development

So you want to build and run the framework yourself? You'll only need a recent version of **Node.js** (and NPM) to get started. Before making any changes, ensure that you can build and run the development version from the `main` branch first.

### Packages

This repository includes several packages, in 'monorepo' fashion.

The `desk-frame` package provides the core API, which is also used by other packages. The `test` package (i.e. NPM module `@desk-framework/test`) is used by the `desk-frame` package for automated testing, hence both need to be built before running any tests.

Building and running tests involves the following steps:

- Installing dependencies and cross-linking packages
- Compiling the `desk-frame` package
- Compiling the `test` package
- Running tests for the `test` package
- Running tests for the `desk-frame` package
- Compiling and testing other packages

### Installing dependencies

The Desk framework has no external runtime dependencies — only `devDependencies`. These are referenced by the repository root package file.

You must install these dependencies before getting started. Use the following command from the repository **root folder** to install dependencies _and_ set up cross-references between packages.

```sh
npm install
```

### Cleaning build artifacts

Use the following command from the root repository folder OR any of the package folders to remove all build artifacts. This command is run automatically before new builds.

```sh
npm run clean
```

### Compiling

All packages include a build step to compile TypeScript source code to JavaScript.

**Output folders** — Code is compiled for multiple EcmaScript version targets, starting with ES2015. The output for ES2015 target is stored in the `dist-es2015` folder, while ESNext (latest version) output is stored in the `dist` folder itself, along with `.d.ts` type definition files.

**Web formats** — The `webcontext` package also bundles several versions of all Desk framework code into specific output files. These files are stored in the `lib` folder and published along with the `dist` folder on NPM.

- IIFE format: `*.iife.min.js`, `*.iife.min.js.map`, and `*.iife.d.ts` with type definitions for the global `desk` variable.
- ESM format: `*.esm.min.js`, `*.esm.min.js.map`, and `*.esm.min.d.ts` for direct import using ES Modules.

To compile a particular package, run the following command from the **package folder**, or run it from the repository root folder to build _all_ packages.

```sh
npm run build
```

### Tests

All packages (except for `www`) include tests.

`test` package — tests include basic checks for the test library itself. Use the following command from the `test` package folder.

```sh
npm test
```

`desk-frame` package — the full test suite should cover nearly 100% of all source code. Use the following command from the `desk-frame` package folder.

```sh
npm test
```

To generate and view a coverage report (using the C8 tool), use the following commands:

```sh
npm run test-c8
npx http-server coverage
```

`webcontext` package — there are currently no automated tests for this package. However, several different output formats can be tested using the following commands.

```sh
npm run test-iife
npm run test-esbuild
npm run test-esm
npm run test-parcel
```

## Repository branches

The Desk framework repository is set up as a 'monorepo' containing several NPM packages that are versioned together.

Branches and GitHub pull requests are used for tracking features, fixes, and version updates. The following branches are used.

- `main` — development branch, PR target
  - Packages do **not** include a version number, versions in `package.json` are set to `0.0.0` and packages are made private.
  - This branch should **not** include breaking changes compared to the latest version, until a major release is being prepared.
- `fix/*`, `feature/*`, `docs/*`
  - Branched off from `main`, rebased periodically if needed
  - Linked to a (draft) PR that merges back into `main`
  - To close:
    1. Update `CHANGELOG.md`
    2. Merge the PR into main; delete branch
- `release/x.y` — prepare a next release (beta)
  - Branched off from main branch, rebased periodically
  - Versions set to `x.y.0-dev*`, tag set to `next`
  - Linked to a (draft) PR that merges into `latest`
  - To close:
    1. Update `CHANGELOG.md`, move Development items to Release
    2. Update NPM versions to final version numbers, set publish tag to `latest`, add git tag
    3. Merge the PR into `latest`; delete branch
  - Any further changes should go into a new minor release, or hotfixes/docfixes in `latest`.
- `latest` — last published branch, with patches
  - Version updates are merged as PRs from `release/x.y`
  - Patches are applied when not part of a release
  - NPM publish should be run from this branch only
- `hotfix/*`, `docfix/*`
  - Branched off from `latest` branch, rebased before merging PR
  - Include cherry picked commits and/or hotfixes
  - To close:
    1. Update `CHANGELOG.md`
    2. Create PR to merge back to `latest`; delete branch
- `www` — published website (push user-protected)
  - Branched off from `main`
  - To update website:
    1. Rebase from `main`
    2. Build docs (writes to `/_site` folder)
    3. Commit and push
