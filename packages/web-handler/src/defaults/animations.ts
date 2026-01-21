/** Default animation duration in milliseconds */
const DEFAULT_DURATION = 150;

/** @internal CSS class prefix for all effects. */
export const CLASS_FX_PREFIX = "WebHandler-fx-";

/** @internal CSS class for elements currently in exit animation. */
export const CLASS_FX_EXITING = `WebHandler-fx--exiting`;

// Easing curves
const CURVE_IN = "cubic-bezier(0.33, 1, 0.68, 1)";
const CURVE_OUT = "cubic-bezier(0.32, 0, 0.67, 0)";
const CURVE_SLOW = "cubic-bezier(0.4, 0, 0.6, 1)";
const CURVE_POP = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/** @internal Returns CSS rules for render effects. */
export function makeEffectCSS() {
	const result: Record<string, Record<string, string | undefined>> = {};

	// CSS variables and base styles (overridden by useAnimationEffects)
	result[":root"] = {
		"--fx-duration": `${DEFAULT_DURATION}ms`,
		"--fx-duration-slow": `${DEFAULT_DURATION * 2}ms`,
	};
	result[`.${CLASS_FX_EXITING}`] = { pointerEvents: "none" };

	// Helpers: add keyframes and classes
	function addKeyFrames(
		animName: string,
		from: Record<string, string | undefined>,
		to: Record<string, string | undefined>,
	) {
		result[`@keyframes ${animName}`] = { from, to } as any;
	}
	function addClass(
		className: string,
		animName: string,
		ease: string,
		slow?: boolean,
	) {
		const duration = slow ? "var(--fx-duration-slow)" : "var(--fx-duration)";
		result[`.${className}`] = {
			animation: `${animName} ${duration} ${ease} forwards`,
		};
	}
	function addAnimation(
		name: string,
		from: Partial<Record<string, string>>,
		to: Partial<Record<string, string>>,
	) {
		let isPop = name === "pop";
		let animIn = CLASS_FX_PREFIX + name + "-in";
		let animOut = CLASS_FX_PREFIX + name + "-out";
		addKeyFrames(animIn, from, to);
		addKeyFrames(animOut, to, from);
		addClass(animIn, animIn, isPop ? CURVE_POP : CURVE_IN);
		addClass(animOut, animOut, CURVE_OUT);
		addClass(animIn + "-slow", animIn, isPop ? CURVE_POP : CURVE_SLOW, true);
		addClass(animOut + "-slow", animOut, CURVE_SLOW, true);
	}

	// Generate single effects: fade, scale, pop, blur
	const singleEffects = [
		["fade"],
		["scale", "scale(0.95)"],
		["pop", "scale(0.8)"],
		["blur", "", "blur(8px)"],
	] as const;
	for (let [name, transform, filter] of singleEffects) {
		let from: Record<string, string> = { opacity: "0" };
		let to: Record<string, string> = { opacity: "1" };
		if (transform) ((from.transform = transform), (to.transform = "scale(1)"));
		if (filter) ((from.filter = filter), (to.filter = "blur(0)"));
		addAnimation(name, from, to);
	}

	// Generate directional effects
	function addDirectional(name: string, dist: string, fade: boolean) {
		const tf = (x: string, y: string) => `translateX(${x}) translateY(${y})`;
		let transforms: [suffix: string, x: string, y: string][] = [
			["top", "0", "-" + dist],
			["bottom", "0", dist],
			["start", "-" + dist, "0"],
			["end", dist, "0"],
		];
		for (let [suffix, x, y] of transforms) {
			addAnimation(
				name + "-" + suffix,
				{ opacity: fade ? "0" : undefined, transform: tf(x, y) },
				{ opacity: fade ? "1" : undefined, transform: tf("0", "0") },
			);
		}
	}

	// Generate directional effects
	addDirectional("fade", "1rem", true);
	addDirectional("slide", "100%", false);

	// Stagger content classes
	result["." + CLASS_FX_PREFIX + "-stagger-child"] = {
		animation: `${CLASS_FX_PREFIX}fade-in var(--fx-duration) ${CURVE_IN} forwards`,
		animationDelay: "var(--stagger-delay, 0ms)",
		opacity: "0",
	};
	result["." + CLASS_FX_PREFIX + "-stagger-child-slow"] = {
		animation: `${CLASS_FX_PREFIX}fade-in var(--fx-duration-slow) ${CURVE_SLOW} forwards`,
		animationDelay: "var(--stagger-delay, 0ms)",
		opacity: "0",
	};

	// FLIP animation helper
	result["." + CLASS_FX_PREFIX + "-animate-content-active"] = {
		transition: `transform var(--fx-duration) ${CURVE_IN}`,
	};
	result["." + CLASS_FX_PREFIX + "-animate-content-active-slow"] = {
		transition: `transform var(--fx-duration-slow) ${CURVE_IN}`,
	};

	// Reduced motion
	result["@media (prefers-reduced-motion: reduce)"] = {
		[`[class*="${CLASS_FX_PREFIX}"]`]: {
			animation: "none",
			transition: "none",
		} as any,
		[".WebHandler__Ovl"]: {
			transition: "none",
		} as any,
	};

	return result;
}
