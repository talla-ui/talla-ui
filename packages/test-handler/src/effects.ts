import { RenderEffect } from "@talla-ui/core";

const ANIM_SUFFIX = ["", "-in", "-out", "-slow", "-in-slow", "-out-slow"];
const EFFECT_NAMES = [
	// Animation effects
	...[
		"fade",
		"fade-up",
		"fade-down",
		"fade-start",
		"fade-end",
		"scale",
		"pop",
		"slide-up",
		"slide-down",
		"slide-start",
		"slide-end",
		"blur",
	].reduce(
		(a, name) => (a.push(...ANIM_SUFFIX.map((suffix) => name + suffix)), a),
		[] as string[],
	),
	// Drag effects
	"drag-modal",
	"drag-relative",
	// Container effects
	"animate-content",
	"animate-content-slow",
	"stagger-content",
	"stagger-content-slow",
];

/**
 * @internal Registers no-op effect implementations for all default effect names.
 * - Called automatically by {@link useTestContext}.
 * - Allows views using effects to render without errors in tests.
 */
export function registerTestEffects(): void {
	for (const name of EFFECT_NAMES) RenderEffect.register(name, {});
}
