# Tälla UI

[![npm](https://img.shields.io/npm/v/talla-ui.svg)](https://www.npmjs.com/package/talla-ui)

**A TypeScript UI framework for maintainable front-end applications, with strict separation between application logic, UI definition, and platform rendering.**

## Overview

Tälla UI structures your application as separate layers with clear boundaries. UI elements define what should appear, without taking on application logic or rendering concerns. Activities handle state and lifecycle, while a platform-specific handler renders the result — currently for the web, though the core framework itself is not browser-dependent.

That separation also makes testing straightforward. The test handler renders the full UI tree in memory, so you can test the same application code that runs in production, without relying on a browser or the DOM.

Tälla UI deliberately avoids server-side rendering, a virtual DOM, and external runtime dependencies beyond the framework itself. Instead of diffing a virtual tree, the renderer observes UI elements and updates the DOM directly.

## Example

```typescript
import { Activity, UI } from "talla-ui";

// An Activity defines application state and logic,
// along with a view that's rendered when active.
class MainActivity extends Activity {
	static override View() {
		// Views are composed declaratively using builder functions.
		// No JSX, no templates — just TypeScript.
		return UI.Column(UI.Text("Hello, world!").center()).grow().centerContent();
	}
}

// The web handler connects the framework to the browser.
// Swap in useTestContext() to run the same app in memory for testing.
import { useWebContext } from "@talla-ui/web-handler";
const app = useWebContext();
app.addActivity(new MainActivity(), true);
```

## Learn more

Visit [talla-ui.dev](https://talla-ui.dev) to learn more and get started.

## Development

Source code for all packages is in the [`packages`](./packages/) folder. Run the following from the repository root:

- `npm ci` — install all dependencies (including subpackages)
- `npm run build` — build all packages
- `npm test` — run tests (uses [Vitest](https://vitest.dev/))
- `npm run www-build` — build the documentation site (requires a prior build)
- `npm run www-serve` — serve the documentation site locally
- `npm run check-format` — check formatting with Prettier

For notes on writing and maintaining documentation, refer to [DOCS.md](./DOCS.md).

## License

This code is free and open source. Copyright and [MIT](https://opensource.org/licenses/MIT) license terms still apply.

Copyright &copy; 2026 Jelmer Cormont
