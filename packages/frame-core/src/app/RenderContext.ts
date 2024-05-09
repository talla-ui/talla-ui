import { ManagedObject } from "../base/index.js";
import { invalidArgErr, safeCall } from "../errors.js";
import { app } from "./GlobalContext.js";
import { View } from "./View.js";

/**
 * An abstract class that supports global view rendering, part of the global application context
 * - This class is implemented by a platform renderer, e.g. to render components to the browser DOM, or in-memory (for testing). Most of these methods should not be used directly by an application.
 * - The current renderer, once initialized, should be available as {@link GlobalContext.renderer app.renderer}.
 * @hideconstructor
 */
export abstract class RenderContext extends ManagedObject {
	/** Returns a render callback for root view output; do not use directly */
	abstract getRenderCallback(): RenderContext.RenderCallback;
	/** Creates a new renderer observer for the provided view object; do not use directly */
	abstract createObserver<T extends View>(target: T): unknown;
	/** Creates a new transformation object for the provided output, if supported */
	abstract transform(
		out: RenderContext.Output,
	): RenderContext.OutputTransform | undefined | void;
	/** Schedules execution of the provided function in the render queue */
	abstract schedule(f: () => void, lowPriority?: boolean): void;
	/** Clears all current root view output */
	abstract clear(): this;
	/** Re-renders output, and relocates existing mounted view output if needed */
	abstract remount(): this;

	/** Uses the provided output transformer to animate a rendered view */
	async animateAsync(
		out: RenderContext.Output,
		transformer: RenderContext.OutputTransformer,
	): Promise<void> {
		let t = this.transform(out);
		if (t) await transformer.applyTransform(t);
	}
}

export namespace RenderContext {
	/** Type definition for the callback that's used for asynchronous rendering */
	export type RenderCallback<TElement = unknown> = (
		output?: Output<TElement>,
		afterRender?: (out?: Output<TElement>) => void,
	) => RenderCallback<TElement>;

	/**
	 * An identifier that specifies a global rendering mode, part of {@link RenderContext.PlacementOptions}
	 *
	 * @description
	 * This type describes how root view output elements are placed among other output. The following options are available:
	 * - `none` — No output should be placed at all.
	 * - `screen` — The output should fill the entire screen, on top of other content.
	 * - `page` — The output should fill the entire screen, on top of other content; if the content is too large, the content can be scrolled up and down.
	 * - `dialog` — The output should appear on top of all other output, surrounded by a shaded margin.
	 * - `modal` — The output should appear on top of all other output, surrounded by a shaded margin. A `CloseModal` event is emitted when touching or clicking outside of the modal view area, or pressing the Escape key.
	 * - `mount` — The output should be 'mounted' within an existing output element, with a specified string ID (e.g. HTML element).
	 */
	export type PlacementMode = "none" | "screen" | "page" | "modal" | "mount";

	/**
	 * Type definition for global rendering placement options
	 *
	 * @description
	 * An object of this type can be provided when rendering a view object using {@link GlobalContext.render app.render()}, or {@link RenderContext.ViewController}.
	 *
	 * The following properties determine how root view elements are placed on the screen:
	 * - `mode` — One of the {@link RenderContext.PlacementMode} options.
	 * - `mountId` — The mount element ID (e.g. HTML element ID), if `mode` is set to `mount`.
	 * - `ref` — The existing output element that determines the position of modal view output, if any.
	 * - `refOffset` — The offset (in pixels) from the reference output element, if any. May be a single number or two numbers for X and Y, and may also be negative.
	 * - `shade` — True if the modal element should be surrounded by a backdrop shade.
	 * - `transform` — A set of functions or names of theme animations that should run for the view output. By default, showing and hiding (or removing) output can be animated.
	 */
	export type PlacementOptions = Readonly<{
		mode: PlacementMode;
		mountId?: string;
		ref?: Output;
		refOffset?: number | [number, number];
		shade?: boolean;
		transform?: Readonly<{
			show?: OutputTransformer;
			hide?: OutputTransformer;
		}>;
	}>;

	/**
	 * An interface for an object that represents transformations to be applied to an output element
	 *
	 * @description
	 * This object encapsulates a view output element, as well as any transformations that can be applied to it. The transformation methods stack particular transformations on top of each other. Timing functions can be used to control the animation speed and curve. To build complex animations that consist of multiple transformations, use a step-wise approach by chaining a call to `step()`.
	 *
	 * This interface is used to control animations within a {@link RenderContext.OutputTransformer}, which can be used on its own, with {@link GlobalContext.animateAsync app.animateAsync}, or from a {@link UIAnimationView}.
	 *
	 * @see {@link RenderContext.OutputTransformer}
	 * @see {@link GlobalContext.animateAsync}
	 */
	export interface OutputTransform<TElement = unknown> {
		/** Returns the output for which this transform has been created */
		getOutput(): Output<TElement>;
		/** Adds a specified delay (in milliseconds) before any transformation takes place */
		delay(ms: number): this;
		/** Sets the timing curve for the current step to linear, with the specified duration (in milliseconds) */
		linear(ms: number): this;
		/** Sets the timing curve for the current step to ease, with the specified duration (in milliseconds) */
		ease(ms: number): this;
		/** Sets the timing curve for the current step to ease-in, with the specified duration (in milliseconds) */
		easeIn(ms: number): this;
		/** Sets the timing curve for the current step to ease-out, with the specified duration (in milliseconds) */
		easeOut(ms: number): this;
		/** Sets a custom bezier timing curve for the current step, with the specified duration (in milliseconds) */
		timing(ms: number, bezier: [number, number, number, number]): this;
		/** Adds an opacity filter to the current step, with the specified target opacity */
		fade(opacity: number): this;
		/** Adds a blur filter to the current step, with the specified strength (in pixels) */
		blur(strength: number): this;
		/** Adds a (de)saturation filter to the current step, with the specified strength */
		saturate(saturation: number): this;
		/** Sets the transformation origin for the current step */
		origin(x: number, y: number): this;
		/** Adds a translation transformation to the current step */
		offset(x?: number, y?: number): this;
		/** Adds a scale transformation to the current step */
		scale(x?: number, y?: number): this;
		/** Adds a rotatation transformation to the current step */
		rotate(deg: number): this;
		/** Adds a skew transformation to the current step */
		skew(xDeg?: number, yDeg?: number): this;
		/**
		 * Adds an alignment transformation to the current step
		 * @param ref The view output element to which to align
		 * @param origin The current output element (relative) origin to use for alignment ([0,0] - [1,1]), defaults to [0.5,0.5]
		 * @param refOrigin The reference output element (relative) origin to use for alignment ([0,0] - [1,1]), defaults to [0.5,0.5]
		 * @param scaleX The horizontal scale factor to apply
		 * @param scaleY The vertical scale factor to apply
		 */
		align(
			ref?: Output<TElement>,
			origin?: [number, number],
			refOrigin?: [number, number],
			scaleX?: number,
			scaleY?: number,
		): this;
		/**
		 * Adds a smooth offset transition to the current step
		 * - This method stores the _current_ position of the view output element, and animates a transition _from_ this position to the then-current position asynchronously when the transform is invoked.
		 */
		smoothOffset(): OutputTransform;
		/**
		 * Returns a new instance, to add an animation step
		 * @returns A new {@link OutputTransform} instance, which is invoked only after the original instance has completed.
		 */
		step(): OutputTransform;
		/** Returns a promise that's resolved when the transformation has completed */
		waitAsync(): Promise<unknown>;
	}

	/**
	 * An interface that describes an asynchronous transformer for a rendered output element
	 * @see {@link RenderContext.OutputTransform}
	 */
	export interface OutputTransformer<TElement = unknown> {
		/** Apply the transformer using the provided output transform object */
		applyTransform(transform: OutputTransform<TElement>): Promise<unknown>;
	}

	/**
	 * A platform-dependent effect that can be applied to a rendered output element
	 * - This type is used to apply visual effects to rendered (cell) output elements, when referenced from @{link UICell.effect}.
	 */
	export interface OutputEffect<TElement = unknown> {
		/** Apply the effect to the provided output element */
		applyEffect(element: TElement, source: View): void;
	}

	/**
	 * An object that encapsulates a rendered output element, created by the global rendering context
	 * @hideconstructor
	 */
	export class Output<TElement = unknown> {
		constructor(source: View, element: TElement, place?: PlacementOptions) {
			this.source = source;
			this.element = element;
			this.place = place;
		}

		/** The rendered view */
		readonly source: View;

		/** The rendered element, as a platform-dependent object or handle */
		readonly element: TElement;

		/** Placement options */
		place?: PlacementOptions;

		/**
		 * Detaches the output element from its previous parent element, if needed
		 * - This method may be set by a previous renderer, to be able to remove the view element from a container element before displaying it as part of another container.
		 */
		detach?: () => void;
	}

	/**
	 * A class that's used to render a view referenced by a property
	 * - Objects of this type are created by the {@link GlobalContext.render app.render()} method, and are mostly used internally to keep track of rendering state asynchronously.
	 *
	 * @hideconstructor
	 */
	export class ViewController {
		/** The current render callback, if any */
		callback?: RenderCallback;

		/** The view object that was rendered last, if any */
		lastView?: View;

		/** The output that was rendered last, if any */
		lastRenderOutput?: RenderContext.Output;

		/** Returns true if the render method has never been called */
		isRendered() {
			return this._seq > 0;
		}

		/** Renders the provided view using a new callback, or previously stored callback */
		render(view?: View, callback?: RenderCallback, place?: PlacementOptions) {
			let isNewCallback = callback && callback !== this.callback;
			if (view && typeof view.render !== "function") {
				throw invalidArgErr("content");
			}

			// use old callback to remove output
			(!view || isNewCallback) &&
				this.callback &&
				this.lastRenderOutput &&
				this._clear();

			if (isNewCallback) this.callback = callback;
			else if (!callback) callback = this.callback;

			// render content if possible, and clear when unlinked
			if (view && callback) {
				if (!this._ownCallback || isNewCallback) {
					this._ownCallback = this._wrap(
						callback,
						place || view.renderPlacement,
					);
				}
				this.lastView = view;
				this._listener = new ViewListener(this, view);
				view.render(this._ownCallback);
			}
			return this;
		}

		/** Removes previously rendered output, asynchronously */
		removeAsync() {
			let out = this.lastRenderOutput;
			let seq = this._seq;
			return safeCall(async () => {
				if (!this.callback) return;
				let animation = out?.place?.transform?.hide;
				if (animation) await app.animateAsync(this, animation);
				if (seq === this._seq) await this._clear();
			});
		}

		private _wrap(callback: RenderCallback, place?: PlacementOptions) {
			let seq = this._seq;
			let cb: RenderCallback = (output, afterRender) => {
				if (seq === this._seq) {
					if (output && place) output.place = place;
					this.callback = callback(output, afterRender);
					this.lastRenderOutput = output;
					let animation = output?.place?.transform?.show;
					if (animation) app.animateAsync(this, animation);
					seq = ++this._seq;
				}
				return cb;
			};
			return cb;
		}

		private _clear() {
			return new Promise<unknown>((resolve) => {
				this.callback = this.callback!(undefined, resolve);
				this._listener?.stop();
				this._listener = undefined;
				this._ownCallback = undefined;
				this._seq++;
				this.lastRenderOutput = undefined;
				this.lastView = undefined;
			});
		}

		private _listener?: ViewListener;
		private _ownCallback: any;
		private _seq = 0;
	}

	/** @internal A listener that's used to observe dynamically rendered content views */
	class ViewListener {
		constructor(
			public wrapper: ViewController,
			view: View,
		) {
			view.listen(this);
		}
		init(_view: View, stop: () => void) {
			this.stop = stop;
		}
		unlinked(view: View) {
			if (view === this.wrapper.lastView) {
				this.wrapper.removeAsync();
			}
		}
		declare stop: () => void;
	}
}
