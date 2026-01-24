import { app, View } from "@talla-ui/core";
import {
	useAnimationEffects,
	useContainerEffects,
	useDragEffects,
	useWebContext,
	WebRenderer,
} from "../dist/index.js";

/**
 * Initialize web context with cleanup
 * Registers all effects by default for testing
 * @param configure Optional configuration callback
 */
export function setupWebContext(configure?: (opts: any) => void) {
	document.body.innerHTML = "";
	document.head.innerHTML = "";
	const ctx = useWebContext(configure);
	useAnimationEffects();
	useDragEffects();
	useContainerEffects();
	return ctx;
}

/**
 * Flush the WebRenderer queue and wait for completion
 * Waits for microtasks and timers to allow event propagation and deferred operations
 */
export async function waitForRender(): Promise<void> {
	// ...allow pending microtasks (event handlers, scheduled renders) to complete
	await Promise.resolve();
	// ...allow setTimeout(0) callbacks to run (used by CSS debouncing)
	await new Promise((r) => setTimeout(r, 0));
	await Promise.resolve();
	// ..run pending queue tasks
	await app.queue.waitAsync();
	await Promise.resolve();
}

/**
 * Simulate a click event on an element
 */
export function simulateClick(element?: HTMLElement | null) {
	if (!element) return;
	element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

/**
 * Simulate text input on an input element
 */
export function simulateInput(input?: HTMLInputElement | null, value?: string) {
	if (!input) return;
	input.value = value || "";
	input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Render a view directly (like renderTestView in test-handler)
 * Clears previous output and renders the view as a page
 */
export async function renderView(view: View): Promise<void> {
	if (!(app.renderer instanceof WebRenderer)) {
		throw Error("Web renderer not found, run `setupWebContext()` first");
	}
	app.renderer.clear();
	app.renderer.render(view, { mode: "page" });
	await waitForRender();
}
