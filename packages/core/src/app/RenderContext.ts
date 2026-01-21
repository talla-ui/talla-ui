import type { StringConvertible } from "@talla-ui/util";
import { invalidArgErr, safeCall } from "../errors.js";
import { ObservableObject } from "../object/index.js";
import type { UIColor } from "../ui/index.js";
import { AppContext } from "./AppContext.js";
import { ModalFactory } from "./ModalFactory.js";
import { View } from "./View.js";

/**
 * An abstract class that supports global view rendering, part of the global application context
 * - This class is implemented by a platform renderer, e.g. to render UI elements to the browser DOM, or in-memory (for testing). Most of these methods should not be used directly by an application.
 * - The current renderer, once initialized, should be available as {@link AppContext.renderer app.renderer}.
 * @docgen {hideconstructor}
 */
export abstract class RenderContext extends ObservableObject {
	/** Returns a render callback for root view output; do not use directly */
	abstract getRenderCallback(): RenderContext.RenderCallback;
	/** Creates a new renderer observer for the provided view object; do not use directly */
	abstract createObserver<T extends View>(target: T): unknown;
	/** Schedules execution of the provided function in the render queue */
	abstract schedule(f: () => void, lowPriority?: boolean): void;
	/** Clears all current root view output */
	abstract clear(): this;
	/** Re-renders output, and relocates existing mounted view output if needed */
	abstract remount(): this;
	/** Overrides the current window title, if supported */
	abstract setTitle(title: StringConvertible): void;

	/**
	 * The current modal factory
	 * - This object is created automatically by the renderer, but may be updated by the application for custom modal views
	 */
	abstract modalFactory: ModalFactory;

	/**
	 * Renders a view as root, until the view object is unlinked
	 * - This method is available as {@link AppContext.render app.render()}, which should typically be used instead.
	 * @param view The view object to render
	 * @param place Global rendering placement options
	 * @returns A {@link RenderContext.ViewController} object that can be used to manage the rendered view
	 */
	render(view: View, place?: RenderContext.PlacementOptions) {
		return new RenderContext.ViewController(this).render(
			view,
			this.getRenderCallback(),
			place,
		);
	}
}

export namespace RenderContext {
	/** Type definition for the callback that's used for asynchronous rendering */
	export type RenderCallback<TElement = unknown> = (
		output?: Output<TElement>,
		afterRender?: (out?: Output<TElement>) => void,
	) => RenderCallback<TElement>;

	/**
	 * Type definition for global rendering placement options
	 *
	 * @description
	 * An object of this type can be provided when rendering a view object using {@link AppContext.render app.render()}, or {@link RenderContext.ViewController}. Typically, this object is provided by an activity, based on options passed to {@link Activity.setRenderMode()}.
	 *
	 * The following properties determine how root view elements are placed on the screen:
	 * - `mode` — One of the {@link RenderContext.PlacementMode} options.
	 * - `mountId` — The mount element ID (e.g. HTML element ID), if `mode` is set to `mount`.
	 * - `ref` — The existing output element that determines the position of modal or overlay view output, if any.
	 * - `refOffset` — The offset (in pixels) from the reference output element, if any. May be a single number or two numbers for X and Y, and may also be negative.
	 * - `shade` — True if the modal element should be surrounded by a backdrop shade.
	 * - `background` — The screen (or page) background color.
	 */
	export type PlacementOptions = Readonly<{
		mode: PlacementMode;
		mountId?: string;
		ref?: Output;
		refOffset?: number | [number, number];
		shade?: boolean;
		background?: UIColor;
	}>;

	/**
	 * An identifier that specifies a global rendering mode, part of {@link RenderContext.PlacementOptions}
	 *
	 * @description
	 * This type describes how root view output elements are placed among other output. The following options are available:
	 * - `none` — No output should be placed at all.
	 * - `screen` — The output should fill the entire screen, on top of other content.
	 * - `page` — The output should fill the entire screen, on top of other content; if the content is too large, the content can be scrolled up and down.
	 * - `modal` — The output should appear on top of all other output, surrounded by a shaded margin. A `CloseModal` event is emitted when touching or clicking outside of the modal view area, or pressing the Escape key.
	 * - `overlay` — The output should appear on top of all other output, but without blocking input to existing content below.
	 * - `mount` — The output should be 'mounted' within an existing output element, with a specified string ID (e.g. HTML element).
	 */
	export type PlacementMode =
		| "none"
		| "screen"
		| "page"
		| "modal"
		| "overlay"
		| "mount";

	/**
	 * An object that encapsulates a rendered output element, created by the global rendering context
	 * @docgen {hideconstructor}
	 */
	export class Output<TElement = unknown> {
		/** Creates a new output object; do not use directly */
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
	 * - Objects of this type are created by the {@link AppContext.render app.render()} method, and used internally (e.g. by {@link UIShowView}) to keep track of rendering state asynchronously.
	 *
	 * @docgen {hideconstructor}
	 */
	export class ViewController {
		/** Creates a new view controller */
		constructor(renderer?: RenderContext) {
			this.renderer = renderer || AppContext.getInstance().renderer;

			// listen for remount events, and re-render the last view if needed
			// (only if renderer was provided, i.e. this is a root view)
			renderer?.listen({
				handler: (_r, e) => {
					if (e.name === "Remount" && this.lastView && this._ownCallback)
						this.render(this.lastView);
				},
				init: (_r, stop) => {
					this._stopRenderListener = stop;
				},
			});
		}

		/** The relevant render context for this controller */
		renderer?: RenderContext;

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
			if (callback) {
				if (!this._ownCallback || isNewCallback) {
					this._ownCallback = this._wrap(callback, place);
				}
				this.lastView = view;
				this._listener = view && new ViewControllerListener(this, view);
				view?.render(this._ownCallback);
			}
			return this;
		}

		/** Removes previously rendered output, asynchronously */
		removeAsync() {
			if (!this.lastRenderOutput) return;
			let seq = this._seq;
			this.lastRenderOutput = undefined;
			this._stopRenderListener?.();
			return safeCall(async () => {
				if (!this.callback) return;
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
				this.lastRenderOutput = undefined;
				this.lastView = undefined;
				if (this._seq) this._seq++;
			});
		}

		private _listener?: ViewControllerListener;
		private _stopRenderListener?: () => void;
		private _ownCallback: any;
		private _seq = 0;
	}

	/** @internal A listener that's used to observe dynamically rendered content views */
	export class ViewControllerListener {
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

	/**
	 * Interface for platform-specific state queries on UI element observers
	 * - All methods are optional; renderer observers implement what they support
	 */
	export interface UIElementRenderer {
		/** Returns true if the element currently has input focus */
		isFocused?(): boolean;
		/** Returns true if the element is currently hovered (UICell only) */
		isHovered?(): boolean;
		/** Returns true if content update is pending */
		isContentPending?(): boolean;
	}
}
