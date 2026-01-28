import type { RenderContext, View, ViewBuilder } from "../app/index.js";
import { err, ERROR, errorHandler } from "../errors.js";
import { ObservableEvent } from "../object/index.js";
import type { UIElement } from "./UIElement.js";

/** Registry of named effects */
const _effects = new Map<string, RenderEffect>();

/** Registry of effects for which an error was logged */
const _errors = new Set<string>();

/**
 * An interface for render effects that can be applied to UI elements.
 * - Effects respond to lifecycle changes: element created (but not inserted), element rendered, view unlinked.
 * - Register effects using {@link RenderEffect.register} and apply them using {@link UIElement.ElementBuilder.effect}.
 */
export interface RenderEffect<TElement = unknown> {
	/** Called when the element is created (but not inserted). */
	onElementCreated?(view: View, output: RenderContext.Output<TElement>): void;
	/** Called when the element has been rendered (inserted). */
	onRendered?(view: View, output: RenderContext.Output<TElement>): void;
	/** Called when the view is unlinked (for exit animations). */
	onUnlinked?(view: View, output: RenderContext.Output<TElement>): void;
}

export namespace RenderEffect {
	/**
	 * Type definition for a set of default effect names.
	 * - Custom effects can be registered with any string name. This type definition is only included for convenience (autocomplete).
	 * - Symmetric effects (fade-up, fade-down, etc.) reverse direction on exit. Enter-only effects (fade-up-in, etc.) animate only on enter, and exit-only effects (fade-up-out, etc.) animate only on exit.
	 * - Add `-slow` suffix for 2x duration (e.g., `fade-slow`, `fade-up-in-slow`).
	 */
	export type EffectName =
		// Fade effects
		| "fade"
		| "fade-in"
		| "fade-out"
		| "fade-slow"
		// Fade + direction effects
		| "fade-up"
		| "fade-up-in"
		| "fade-up-out"
		| "fade-down"
		| "fade-down-in"
		| "fade-down-out"
		| "fade-start"
		| "fade-start-in"
		| "fade-start-out"
		| "fade-end"
		| "fade-end-in"
		| "fade-end-out"
		// Scale effects
		| "scale"
		| "scale-in"
		| "scale-out"
		// Pop effects (scale with overshoot)
		| "pop"
		| "pop-in"
		| "pop-out"
		// Slide effects (full slide, no fade)
		| "slide-up"
		| "slide-down"
		| "slide-start"
		| "slide-end"
		// Blur effects
		| "blur"
		| "blur-in"
		| "blur-out"
		// Interaction effects
		| "drag-modal"
		| "drag-relative"
		// Container effects
		| "animate-content"
		| "animate-content-slow"
		| "stagger-content"
		| "stagger-content-slow"
		| (string & {});

	/**
	 * Registers a render effect with the specified name.
	 * - This method is called automatically by platform handlers during setup to register default effect implementations.
	 * @param name The name of the effect (e.g. "fade").
	 * @param effect The effect implementation.
	 */
	export function register(name: string, effect: RenderEffect): void {
		_effects.set(name, effect);
	}

	/** Clears all registered effects */
	export function clear(): void {
		_effects.clear();
	}

	/**
	 * Returns true if an effect with the specified name is registered.
	 * @param name The effect name to check.
	 * @returns True if the effect is registered.
	 */
	export function has(name: string): boolean {
		return _effects.has(name);
	}

	/**
	 * Returns a builder modifier function that applies a render effect to a UI element.
	 * - Effects must be registered using {@link register} before use. If the effect is not registered, this method throws an error.
	 * - Prefer using {@link UIElement.ElementBuilder.effect} on a UI element builder instead.
	 *
	 * @param name The name of the effect to apply.
	 * @param optional True if the effect is optional, and missing effects should not be logged.
	 * @returns A function that can be passed to {@link UIElement.ElementBuilder.apply}.
	 * @error This method throws an error if the effect has not been registered.
	 */
	export function create<
		T extends ViewBuilder & { initializer: ViewBuilder.Initializer<any> },
	>(name: EffectName, optional?: boolean): (builder: T) => T {
		return (builder) => {
			builder.initializer.finalize((view: View) => {
				const impl = _effects.get(name);
				if (!impl) {
					if (!optional && !_errors.has(name)) {
						errorHandler(err(ERROR.RenderEffect_Invalid, name));
						_errors.add(name);
					}
					return;
				}

				let lastOutput: RenderContext.Output | undefined;

				view.listen({
					handler: (_, event: ObservableEvent) => {
						// These events use noPropagation, so we only receive events
						// from this view, never from child views.
						const output = (view as UIElement).lastRenderOutput;
						if (!output) return;

						if (event.name === "ElementCreated") {
							lastOutput = output;
							impl.onElementCreated?.(view, output);
						}
						if (event.name === "Rendered") {
							impl.onRendered?.(view, output);
						}
					},
					unlinked: () => {
						if (lastOutput && impl.onUnlinked) {
							impl.onUnlinked(view, lastOutput);
						}
					},
				});
			});
			return builder;
		};
	}
}
