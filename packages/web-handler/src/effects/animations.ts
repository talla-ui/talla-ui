import { RenderEffect } from "@talla-ui/core";
import { markAnimateRemove } from "../awaitRemove.js";
import { CLASS_FX_EXITING, CLASS_FX_PREFIX } from "../defaults/animations.js";

/** Helper function to register all effects for a specified name */
function _registerEffect(name: string) {
	const makeEffect = (
		inC?: string,
		outC?: string,
		animIn?: string,
	): RenderEffect<HTMLElement> => ({
		onElementCreated: inC
			? (_, o) => {
					let el = o.element;
					el.classList.add(inC);
					let cleanup = (e: AnimationEvent) => {
						if (e.animationName !== animIn) return;
						el.classList.remove(inC);
						el.removeEventListener("animationend", cleanup);
					};
					el.addEventListener("animationend", cleanup);
				}
			: undefined,
		onUnlinked: (_, o) => {
			let el = o.element;
			if (inC) el.classList.remove(inC);
			if (outC) {
				el.classList.add(CLASS_FX_EXITING, outC);
				markAnimateRemove(el);
			}
		},
	});
	let animIn = CLASS_FX_PREFIX + name + "-in";
	let animOut = CLASS_FX_PREFIX + name + "-out";
	for (let s of ["", "-slow"]) {
		RenderEffect.register(
			name + s,
			makeEffect(animIn + s, animOut + s, animIn),
		);
		RenderEffect.register(
			name + "-in" + s,
			makeEffect(animIn + s, undefined, animIn),
		);
		RenderEffect.register(
			name + "-out" + s,
			makeEffect(undefined, animOut + s),
		);
	}
}

/**
 * Registers animation effects for use with {@link UIElement.ElementBuilder.effect()}.
 * - Includes fade (with direction), scale, pop, slide, and blur effects.
 * - Call this function after {@link useWebContext()} to enable animation effects.
 * @param options Optional configuration for animation timing
 */
export function useAnimationEffects(
	options?: useAnimationEffects.AnimationEffectOptions,
): void {
	if (options) {
		let root = document.documentElement;
		let d = options.duration;
		if (d !== undefined) {
			root.style.setProperty("--fx-duration", `${d}ms`);
			root.style.setProperty(
				"--fx-duration-slow",
				`${options.slowDuration ?? d * 2}ms`,
			);
		} else if (options.slowDuration !== undefined) {
			root.style.setProperty("--fx-duration-slow", `${options.slowDuration}ms`);
		}
	}

	["fade", "scale", "pop", "blur"].forEach((name) => _registerEffect(name));
	const EDGES = [
		"fade-top",
		"fade-bottom",
		"fade-start",
		"fade-end",
		"slide-top",
		"slide-bottom",
		"slide-start",
		"slide-end",
	];
	EDGES.forEach((name) => _registerEffect(name));
}

export namespace useAnimationEffects {
	/**
	 * Options for animation effects
	 * - Objects of this type can be passed to the {@link useAnimationEffects()} function at application startup.
	 */
	export interface AnimationEffectOptions {
		/** Duration of animations in milliseconds (default: 150) */
		duration?: number;
		/** Duration of slow animations in milliseconds (default: duration * 2) */
		slowDuration?: number;
	}
}
