import { ManagedEvent, ManagedObject, Observer } from "../base/index.js";
import { invalidArgErr } from "../errors.js";
import { app } from "./GlobalContext.js";

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
	abstract createObserver<T extends RenderContext.Renderable>(
		target: T,
	): Observer<T> | undefined;
	/** Creates a new transformation object for the provided output, if supported */
	abstract transform(
		out: RenderContext.Output,
	): RenderContext.OutputTransform | undefined | void;
	/** Schedules execution of the provided function in the render queue */
	abstract schedule(f: () => void, lowPriority?: boolean): void;
	/** Clears all current root view output */
	abstract clear(): this;
	/** Relocates existing mounted view output if needed */
	abstract remount(): this;

	/** Creates a new encapsulated renderer for the provided view object; do not use directly */
	render(
		view?: RenderContext.Renderable,
		callback?: RenderContext.RenderCallback,
		place?: RenderContext.PlacementOptions,
	) {
		return new RenderContext.DynamicRendererWrapper().render(
			view,
			callback || this.getRenderCallback(),
			place || { mode: "none" },
		);
	}
}

export namespace RenderContext {
	/**
	 * Type definition for any view object that can be rendered
	 * - This interface defines the minimum API for an object to become part of the render hierarchy. In particular, this interface is implemented by {@link View} (and all of its many sub classes) and {@link ViewActivity}.
	 */
	export interface Renderable extends ManagedObject {
		/**
		 * A method that should be implemented to render a view object
		 * - The view object may be rendered asynchronously, providing output as well as any updates to the provided renderer callback.
		 */
		render(callback: RenderCallback): void;
	}

	/** Type definition for a class that creates view instances that can be rendered */
	export type RenderableClass<TRenderable extends Renderable = Renderable> =
		ManagedObject.Constructor<ManagedObject & TRenderable>;

	/**
	 * Type definition for the callback that's used for asynchronous rendering
	 * @see {@link RenderContext.Renderable.render}
	 */
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
	 * - `default` — Platform default (useful for testing, set by `app.render()`)
	 * - `mount` — The output should be 'mounted' within an existing output element, with a specified string ID (e.g. HTML element).
	 * - `page` — The output should fill the entire screen, and replace other page content.
	 * - `dialog` — The output should appear on top of all other output.
	 * - `modal` — The output should appear on top of all other output, with an optional backdrop shader. A `CloseModal` event is emitted when touching or clicking outside of the modal view area, or pressing the Escape key.
	 */
	export type PlacementMode =
		| "none"
		| "default"
		| "mount"
		| "page"
		| "dialog"
		| "modal";

	/**
	 * Type definition for global rendering placement options
	 *
	 * @description
	 * An object of this type can be provided when rendering a view object. View activities also include a property that's used to provide placement options when rendering, i.e. {@link ViewActivity.renderPlacement}.
	 *
	 * The following properties determine how root view elements are placed on the screen:
	 * - `mode` — One of the {@link RenderContext.PlacementMode} options.
	 * - `mountId` — The mount element ID (e.g. HTML element ID), if `mode` is set to `mount`.
	 * - `ref` — The existing output element that determines the position of modal view output, if any.
	 * - `shade` — The opacity of the modal backdrop shading layer (modal shader), ranging from 0 to 1.
	 * - `transform` — A set of functions or names of theme animations that should run for the view output. By default, showing and hiding (or removing) output can be animated.
	 */
	export type PlacementOptions = Readonly<{
		mode: PlacementMode;
		mountId?: string;
		ref?: Output;
		shade?: number;
		transform?: Readonly<{
			show?: OutputTransformer | `@${string}`;
			hide?: OutputTransformer | `@${string}`;
		}>;
	}>;

	/**
	 * Type definition for a function that animates a provided output transformation
	 * @see {@link RenderContext.OutputTransform}
	 */
	export type OutputTransformer = (
		transform: OutputTransform,
	) => Promise<unknown>;

	/**
	 * An interface for an object that represents transformations to be applied to an output element
	 *
	 * @description
	 * This object encapsulates a view output element, as well as any transformations that can be applied to it. The transformation methods stack particular transformations on top of each other. Timing functions can be used to control the animation speed and curve. To build complex animations that consist of multiple transformations, use a step-wise approach by chaining a call to `step()`.
	 *
	 * This interface is used to control animations within a {@link RenderContext.OutputTransformer} function, which can be used on its own, with {@link GlobalContext.animateAsync app.animateAsync}, or from a {@link UIAnimationController}.
	 *
	 * @see {@link RenderContext.OutputTransformer}
	 * @see {@link GlobalContext.animateAsync}
	 */
	export interface OutputTransform {
		/** Returns the output for which this transform has been created */
		getOutput(): Output;
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
		/** Adds a fade effect to the current step, with the specified target opacity */
		fade(opacity: number): this;
		/** Adds a blur effect to the current step, with the specified effect strength (in pixels) */
		blur(strength: number): this;
		/** Adds a (de)saturation effect to the current step, with the specified strength */
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
			ref?: Output,
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
	 * A class that represents a render-related event
	 * - Events of this type are considered internal to the rendered component, and are ignored when coming from attached view objects. In {@link ViewComposite} instances, the {@link ViewComposite.delegateViewEvent()} method doesn't get invoked for renderer events at all. Similarly, {@link UIContainer} doesn't propagate renderer events from attached views.
	 */
	export class RendererEvent extends ManagedEvent {
		/** Always returns true, can be used for duck-typing this type of events */
		isRendererEvent(): true {
			return true;
		}

		/** Render callback, only used for `Render` events to capture output */
		render?: RenderCallback;
	}

	/**
	 * An object that encapsulates a rendered output element, created by the global rendering context
	 * @hideconstructor
	 */
	export class Output<TElement = unknown> {
		constructor(
			source: Renderable,
			element: TElement,
			place?: PlacementOptions,
		) {
			this.source = source;
			this.element = element;
			this.place = place;
		}

		/** The rendered component */
		readonly source: Renderable;

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
	 * A class that's used to render content referenced by a property
	 * - Objects of this type are created by the {@link RenderContext.render()} and {@link GlobalContext.render app.render()} methods, and are mostly used internally to keep track of rendering state asynchronously.
	 *
	 * @hideconstructor
	 */
	export class DynamicRendererWrapper {
		constructor() {}

		/** The current render callback, if any */
		callback?: RenderCallback;

		/** The view object that was rendered last, if any */
		lastContent?: Renderable;

		/** The output that was rendered last, if any */
		lastRenderOutput?: RenderContext.Output;

		/** Returns true if the render method has never been called */
		isRendered() {
			return this._seq > 0;
		}

		/** Renders the provided content using a new callback, or previously stored callback */
		render(
			content?: Renderable,
			callback?: RenderCallback,
			place?: PlacementOptions,
		) {
			let isNewCallback = callback && callback !== this.callback;

			if (
				(!content || isNewCallback) &&
				this.callback &&
				this.lastRenderOutput
			) {
				// use old callback to remove output
				this.callback = this.callback(undefined);
				this.lastContent = undefined;
				this.lastRenderOutput = undefined;
				this._ownCallback = undefined;
				this._seq++;
			}

			if (isNewCallback) this.callback = callback;
			else if (!callback) callback = this.callback;

			// render content, if possible
			if (content && callback) {
				if (typeof content.render !== "function") {
					throw invalidArgErr("content");
				}
				if (!this._ownCallback || isNewCallback) {
					let seq = this._seq;
					let cb: RenderCallback = (output, afterRender) => {
						if (seq === this._seq) {
							if (output && place) output.place = place;
							this.callback = callback!(output, afterRender);
							this.lastRenderOutput = output;
							let animation = place?.transform?.show;
							if (animation) app.animateAsync(this, animation);
							seq = ++this._seq;
						}
						return cb;
					};
					this._ownCallback = cb;
				}
				this.lastContent = content;
				content.render(this._ownCallback);
			}
			return this;
		}

		/** Removes previously rendered output */
		removeAsync() {
			if (!this.callback) return;
			let out = this.lastRenderOutput;
			let seq = this._seq;
			return (async () => {
				let animation = out?.place?.transform?.hide;
				if (animation) await app.animateAsync(this, animation);
				if (seq === this._seq) {
					let resolve: () => void;
					let p = new Promise<void>((r) => {
						resolve = r;
					});
					this.callback = this.callback!(undefined, () => resolve());
					this.lastRenderOutput = undefined;
					this._ownCallback = undefined;
					this._seq++;
					return p;
				}
			})();
		}

		private _ownCallback: any;
		private _seq = 0;
	}
}
