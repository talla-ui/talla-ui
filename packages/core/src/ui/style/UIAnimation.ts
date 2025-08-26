import { RenderContext } from "../../app/index.js";
import { UIStyle } from "./UIStyle.js";

/**
 * A class that represents an animation to be applied to any UI element
 *
 * @description
 * UIAnimation objects implement the {@link RenderContext.OutputTransformer} interface and can be used to animate view output elements. Animations are typically used for showing and hiding views, or for creating visual effects. They are also used to create the animations for the {@link AppContext.animateAsync} method.
 *
 * Animations can be applied using {@link AppContext.animateAsync app.animateAsync()}, or automatically as part of view rendering using placement options.
 *
 * @see {@link RenderContext.OutputTransformer}
 * @see {@link AppContext.animateAsync}
 */
export class UIAnimation implements RenderContext.OutputTransformer<unknown> {
	/**
	 * Creates a {@link UIAnimation} instance that dynamically resolves to another animation
	 * - This method is used to create a theme animation reference by {@link UIAnimation.theme}.
	 * @param f A function that returns the animation to resolve to, or undefined
	 * @returns A new {@link UIAnimation} instance that will resolve the factory function when applied
	 * @see {@link UIAnimation.theme}
	 */
	static resolve(f: () => UIAnimation | undefined): UIAnimation {
		return new UIAnimation(async (transform) => {
			return f()?.applyTransform(transform);
		});
	}

	/**
	 * Creates a new animation object
	 * @param applyTransform A function that applies the animation using the provided transform object
	 */
	constructor(
		applyTransform: (
			transform: RenderContext.OutputTransform<unknown>,
		) => Promise<unknown>,
	) {
		this._f = applyTransform;
	}

	/**
	 * Applies the animation to the output using the provided transform object
	 * @param transform The output transform object to apply the animation to
	 * @returns A promise that resolves when the animation is complete
	 */
	applyTransform(
		transform: RenderContext.OutputTransform<unknown>,
	): Promise<unknown> {
		return this._f(transform);
	}

	/** @internal The animation function */
	private _f: (
		transform: RenderContext.OutputTransform<unknown>,
	) => Promise<unknown>;
}

export namespace UIAnimation {
	/**
	 * A theme resolver for predefined theme animations
	 *
	 * @description
	 * This object provides access to predefined theme animations, referenced by string keys.
	 *
	 * To update these animations, use the {@link UIStyle.ThemeResolver.set set()} method, and then remount all views using the `app.remount()` method.
	 */
	export const theme = new UIStyle.ThemeResolver(
		[
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
		],
		UIAnimation.resolve,
	);
}
