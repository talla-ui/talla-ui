/** Timeout for all animations */
const FALLBACK_TIMEOUT = 2000;

/** List of elements marked for animated removal */
const pendingRemovals = new WeakMap<HTMLElement, Promise<void>>();

/**
 * @internal Mark an element for delayed removal until animation ends; this stops the element from being removed by UIContainerRenderer or OutputMount.
 * - Animated effect should add the appropriate CSS class BEFORE calling this
 * - Element is removed after animation completes (or 2s timeout)
 */
export function markAnimateRemove(element: HTMLElement) {
	if (pendingRemovals.has(element) || !element.parentNode) return;
	function remove() {
		pendingRemovals.delete(element);
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	}

	// remove immediately if animation/transitionend will never fire
	if (
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
	) {
		Promise.resolve().then(remove);
		return;
	}

	// wait for animation to complete, then remove
	let promise = new Promise<void>((resolve) => {
		let resolved = false;
		const done = (e?: Event) => {
			// don't do anything if event bubbled up; or already done
			if (resolved || (e && e.target !== element)) return;
			resolved = true;
			element.removeEventListener("animationend", done);
			element.removeEventListener("transitionend", done);
			resolve();
		};
		element.addEventListener("animationend", done);
		element.addEventListener("transitionend", done);
		setTimeout(done, FALLBACK_TIMEOUT);
	});
	promise.then(remove);
	pendingRemovals.set(element, promise);
}

/** @internal Check if an element is marked for animated removal */
export function isMarkedForRemoval(element: HTMLElement): boolean {
	return pendingRemovals.has(element);
}

/**
 * @internal Returns a promise that resolves when the element's exit animation completes.
 * - If the element is not marked for removal, resolves immediately.
 */
export function awaitRemoval(element: HTMLElement): Promise<void> {
	const promise = pendingRemovals.get(element);
	return promise || Promise.resolve();
}
