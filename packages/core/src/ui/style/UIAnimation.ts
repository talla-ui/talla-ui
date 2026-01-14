import { RenderContext } from "../../app/index.js";

// Module-level storage for animations
let _animations: Record<string, UIAnimation> = {};
let _animRefs: Record<string, UIAnimation> = {};

/**
 * A class that represents an animation to be applied to UI elements.
 * - Implements {@link RenderContext.OutputTransformer} to animate view output.
 * - Apply animations using {@link AppContext.animateAsync app.animateAsync()} or view placement options.
 *
 * Animations are typically used for showing and hiding views, or for creating visual effects
 * during transitions.
 *
 * @see {@link RenderContext.OutputTransformer}
 * @see {@link AppContext.animateAsync}
 */
export class UIAnimation implements RenderContext.OutputTransformer<unknown> {
	/**
	 * Sets animations in the global animation registry.
	 * - Call `app.remount()` after setting animations to update all views.
	 * @param values An object mapping animation names to {@link UIAnimation} instances.
	 */
	static setAnimations(values: Record<string, UIAnimation | undefined>) {
		for (let key in values) {
			let v = values[key];
			if (v != null) {
				_animations[key] = v;
			}
		}
	}

	/**
	 * Returns an animation reference by name.
	 * - The returned instance dynamically resolves to the named animation.
	 * - Results are cached and reused for subsequent calls with the same name.
	 * @param name The name of the animation to retrieve.
	 * @returns A {@link UIAnimation} instance that resolves to the named animation.
	 */
	static getAnimation(name: string): UIAnimation {
		if (!_animRefs[name]) {
			let ref = new UIAnimation(async (t) => {
				let anim = _animations[name];
				if (anim) return anim.applyTransform(t);
			});
			_animRefs[name] = ref;
		}
		return _animRefs[name]!;
	}

	/**
	 * Creates a {@link UIAnimation} instance that dynamically resolves using a factory function.
	 * @param f A function that returns the animation to resolve to, or undefined.
	 * @returns A new {@link UIAnimation} instance.
	 * @see {@link UIAnimation.getAnimation}
	 */
	static resolve(f: () => UIAnimation | undefined): UIAnimation {
		return new UIAnimation(async (transform) => {
			return f()?.applyTransform(transform);
		});
	}

	/**
	 * Creates a new animation instance.
	 * @param applyTransform A function that applies the animation using the provided transform object.
	 */
	constructor(
		applyTransform: (
			transform: RenderContext.OutputTransform<unknown>,
		) => Promise<unknown>,
	) {
		this._f = applyTransform;
	}

	/**
	 * Applies the animation to the output using the provided transform object.
	 * @param transform The output transform object to animate.
	 * @returns A promise that resolves when the animation completes.
	 */
	applyTransform(
		transform: RenderContext.OutputTransform<unknown>,
	): Promise<unknown> {
		return this._f(transform);
	}

	/** @internal The animation function. */
	private _f: (
		transform: RenderContext.OutputTransform<unknown>,
	) => Promise<unknown>;
}

export namespace UIAnimation {
	const _names = [
		"fadeIn",
		"fadeOut",
		"fadeInUp",
		"fadeInDown",
		"fadeInLeft",
		"fadeInRight",
		"fadeOutUp",
		"fadeOutDown",
		"fadeOutLeft",
		"fadeOutRight",
		"showDialog",
		"hideDialog",
		"showMenu",
		"hideMenu",
	] as const;

	type _DefaultAnimations = {
		readonly [K in (typeof _names)[number]]: UIAnimation;
	};

	/** An object containing all standard animation references. */
	export const defaults: _DefaultAnimations = Object.freeze(
		_names.reduce(
			(obj, name) => {
				obj[name] = UIAnimation.getAnimation(name);
				return obj;
			},
			{} as Record<string, UIAnimation>,
		),
	) as _DefaultAnimations;

	/** A type that represents animation names, supporting both standard names and custom strings. */
	export type AnimationName = keyof typeof defaults | (string & {});
}
