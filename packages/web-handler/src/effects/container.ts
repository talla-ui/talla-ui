import { RenderEffect } from "@talla-ui/core";
import { CLASS_FX_PREFIX } from "../defaults/animations.js";

// WeakMaps for double-apply prevention
const _appliedAnimateContent = new WeakMap<HTMLElement, MutationObserver>();
const _appliedStaggerContent = new WeakMap<HTMLElement, MutationObserver>();

// Stagger configuration (set during registration)
let _staggerDelay = 50;
let _slowStaggerDelay = 100;

/** Helper function to check if reduced motion is preferred */
function _prefersReducedMotion(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
	);
}

/** Create an animate-content effect instance */
function createAnimateContentEffect(slow?: boolean): RenderEffect<HTMLElement> {
	let flipClass = slow
		? CLASS_FX_PREFIX + "-animate-content-active-slow"
		: CLASS_FX_PREFIX + "-animate-content-active";

	return {
		onRendered(_, output) {
			let elt = output.element;
			if (!elt || _appliedAnimateContent.has(elt) || _prefersReducedMotion())
				return;

			// track positions by element object
			let positions = new Map<HTMLElement, { x: number; y: number }>();
			function capturePositions() {
				positions.clear();
				let containerRect = elt.getBoundingClientRect();
				for (let i = 0; i < elt.children.length; i++) {
					let child = elt.children[i] as HTMLElement;
					let childRect = child.getBoundingClientRect();
					positions.set(child, {
						x: childRect.left - containerRect.left,
						y: childRect.top - containerRect.top,
					});
				}
			}

			// use a MutationObserver to detect child changes
			let observer = new MutationObserver(() => {
				requestAnimationFrame(() => {
					// clear transforms before measuring to get true layout positions
					for (let i = 0; i < elt.children.length; i++) {
						let child = elt.children[i] as HTMLElement;
						child.style.transition = "none";
						child.style.transform = "";
					}

					// force reflow so transforms are cleared before measuring
					elt.offsetHeight;

					// clone positions before capturing new ones
					let beforePositions = new Map(positions);
					capturePositions();
					if (beforePositions.size === 0) return;

					// apply FLIP animation
					for (let i = 0; i < elt.children.length; i++) {
						let child = elt.children[i] as HTMLElement;
						function cleanup() {
							child.classList.remove(flipClass);
							child.style.transition = "";
							child.removeEventListener("transitionend", cleanup);
						}
						child.addEventListener("transitionend", cleanup);

						let before = beforePositions.get(child);
						let after = positions.get(child);
						if (!before || !after) continue;

						let deltaX = before.x - after.x;
						let deltaY = before.y - after.y;
						if (deltaX === 0 && deltaY === 0) continue;

						// apply reverse transform (transition already disabled above)
						child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

						// force reflow
						child.offsetHeight;

						// animate to final position
						child.classList.add(flipClass);
						child.style.transition = "";
						child.style.transform = "";
					}
				});
			});

			// start observing and capture initial positions
			observer.observe(elt, { childList: true });
			_appliedAnimateContent.set(elt, observer);
			requestAnimationFrame(capturePositions);
		},

		onUnlinked(_, output) {
			let elt = output.element;
			if (!elt) return;

			// clean up explicitly here, just in case
			let observer = _appliedAnimateContent.get(elt);
			if (observer) {
				observer.disconnect();
				_appliedAnimateContent.delete(elt);
			}
		},
	};
}

/** Create a stagger-content effect instance */
function createStaggerContentEffect(slow?: boolean): RenderEffect<HTMLElement> {
	let childClass = slow
		? CLASS_FX_PREFIX + "-stagger-child-slow"
		: CLASS_FX_PREFIX + "-stagger-child";
	return {
		onRendered(_, output) {
			let elt = output.element;
			if (!elt || _appliedStaggerContent.has(elt) || _prefersReducedMotion())
				return;

			function applyStaggerToNewChildren() {
				let delay = 0;
				for (let i = 0; i < elt.children.length; i++) {
					let child = elt.children[i] as HTMLElement;
					if (child.nodeType !== 1 || "staggered" in child.dataset) continue;
					child.dataset["staggered"] = "true";
					child.style.setProperty("--stagger-delay", `${delay}ms`);
					child.classList.add(childClass);

					// increment delay with each (new) child
					delay += slow ? _slowStaggerDelay : _staggerDelay;

					function cleanup() {
						child.classList.remove(childClass);
						child.style.removeProperty("--stagger-delay");
						child.removeEventListener("animationend", cleanup);
					}
					child.addEventListener("animationend", cleanup);
				}
			}

			// use a MutationObserver to apply stagger to new children
			let observer = new MutationObserver((mutations) => {
				for (let mutation of mutations) {
					if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
						applyStaggerToNewChildren();
						break;
					}
				}
			});

			// start observing and apply to initial children
			observer.observe(elt, { childList: true });
			_appliedStaggerContent.set(elt, observer);
			applyStaggerToNewChildren();
		},

		onUnlinked(_, output) {
			let elt = output.element;
			if (!elt) return;

			// clean up explicitly here, just in case
			let observer = _appliedStaggerContent.get(elt);
			if (observer) {
				observer.disconnect();
				_appliedStaggerContent.delete(elt);
			}
		},
	};
}

/**
 * Registers container effects for use in the application.
 * - Container effects include animate-content (FLIP reordering) and stagger-content effects.
 * - Call this function after {@link useWebContext()} to enable container effects.
 * @param options Optional configuration for stagger delays
 */
export function useContainerEffects(
	options?: useContainerEffects.ContainerEffectOptions,
): void {
	if (options?.staggerDelay) {
		_staggerDelay = options.staggerDelay ?? 50;
		_slowStaggerDelay = options!.slowStaggerDelay ?? _staggerDelay * 2;
	}
	RenderEffect.register("animate-content", createAnimateContentEffect());
	RenderEffect.register(
		"animate-content-slow",
		createAnimateContentEffect(true),
	);
	RenderEffect.register("stagger-content", createStaggerContentEffect());
	RenderEffect.register(
		"stagger-content-slow",
		createStaggerContentEffect(true),
	);
}

export namespace useContainerEffects {
	/**
	 * Options for container animation effects
	 * - Objects of this type can be passed to the {@link useContainerEffects()} function at application startup.
	 */
	export interface ContainerEffectOptions {
		/** Delay between each child animation in stagger effects (default: 50ms) */
		staggerDelay?: number;
		/** Delay for slow stagger effects (default: staggerDelay * 2) */
		slowStaggerDelay?: number;
	}
}
