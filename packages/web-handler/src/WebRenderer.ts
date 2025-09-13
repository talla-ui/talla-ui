import {
	Activity,
	AsyncTaskQueue,
	ModalFactory,
	ObservableEvent,
	RenderContext,
	UIColor,
	UIElement,
	View,
	app,
} from "@talla-ui/core";
import type { StringConvertible } from "@talla-ui/util";
import { setLogicalPxScale } from "./DOMStyle.js";
import { applyDragModal } from "./drag/modal.js";
import { applyDragRelative } from "./drag/relative.js";
import { makeObserver } from "./observers/index.js";
import { OutputMount } from "./OutputMount.js";
import { WebContextOptions } from "./WebContextOptions.js";
import { WebModalFactory } from "./WebModalFactory.js";
import { WebOutputTransform } from "./WebOutputTransform.js";
import type { WebViewport } from "./WebViewport.js";

/** A renderer class that uses the DOM to render UI elements */
export class WebRenderer extends RenderContext {
	/** @internal Index of the last remount, to check if element rebuild is needed */
	static lastRemountIdx = 0;

	/** Creates a new render context instance, used by `useWebContext()` */
	constructor(options: WebContextOptions) {
		super();
		this.modalFactory = new WebModalFactory(options);
		this._mounts = new Map();
		this._queue = app.scheduler.createQueue(
			"WebRenderer",
			true,
			(queueOptions) => {
				queueOptions.maxSyncTime = options.missedFrameTime * 0.75;
				queueOptions.delayTime = options.missedFrameTime * 1.5;
			},
		);
		if (options.reducedMotion) this.setReducedMotion(true);
		this._pageBackground = options.pageBackground;
		this._modalBackground = options.modalShadeBackground;
	}

	/** The default modal factory */
	modalFactory: ModalFactory;

	/** Schedules the provided callback in the rendering queue */
	schedule(f: () => void, lowPriority?: boolean) {
		this._queue.add(f, lowPriority ? 1 : 0);
		if (!this._raf) {
			try {
				this._raf = window.requestAnimationFrame(() => {
					this._raf = undefined;
					this._queue.run();
				});
			} catch {}
		}
	}

	/** Retrieves a render callback for root output */
	getRenderCallback() {
		let mount: OutputMount | undefined;
		let prevFocus: HTMLElement | undefined;
		let callback: RenderContext.RenderCallback = (output, afterRender) => {
			this.schedule(() => {
				if (!output) {
					// remove current output, if any
					if (mount) {
						if (this._mounts.has(mount.id)) {
							mount.remove();
							this._mounts.delete(mount.id);
						}
						mount = undefined;
					}

					// restore previously focused element, if possible
					if (prevFocus) {
						let restoreFocus = prevFocus;
						setTimeout(() => {
							if (
								(!document.activeElement ||
									document.activeElement === document.body) &&
								document.body.compareDocumentPosition(restoreFocus!) &
									Node.DOCUMENT_POSITION_CONTAINED_BY
							) {
								restoreFocus.focus();
							}
						}, 210); // (after fade out & remove mount element)
					}
				} else {
					// mount output for given placement mode
					if (!mount && output.element) {
						mount = this._createMount(output);
						if (output.place?.mode === "modal") {
							prevFocus = document.activeElement as any;
						}
					}

					// update with given output element
					if (mount) mount.update(output as any);
				}

				// invoke callback now that element is in place
				if (afterRender) afterRender(output);
			}, true);
			return callback;
		};
		return callback;
	}

	/** Attaches a renderer observer to the specified target element */
	createObserver(target: View): unknown {
		return makeObserver(target);
	}

	/** Returns an `OutputTransform` instance for the specified output */
	transform(
		out: RenderContext.Output,
	): RenderContext.OutputTransform | undefined {
		if (
			out &&
			out.element &&
			(out.element as HTMLElement).nodeType === Node.ELEMENT_NODE
		) {
			let result = new WebOutputTransform(out);
			if (this._reducedMotion) result.reduceMotion();
			return result;
		}
	}

	/** Clears all output from the DOM */
	clear() {
		for (let mount of this._mounts.values()) {
			mount.remove();
		}
		return this;
	}

	/**
	 * Re-renders all mounted content to appear in (new or existing) elements with corresponding ID
	 * - This method also emits a `Remount` change event on the renderer, to trigger a full re-render
	 */
	remount() {
		WebRenderer.lastRemountIdx++;
		this.emitChange("Remount");
		for (let mount of this._mounts.values()) {
			mount.remount();
		}
		return this;
	}

	/** Sets the document title directly */
	setTitle(title?: StringConvertible) {
		document.title = String(title || "");
	}

	/** Enables or disables reduced motion mode (forces all transition timings to 0 if set) */
	setReducedMotion(enable: boolean) {
		this._reducedMotion = !!enable;
	}

	/**
	 * Overrides the logical pixel scaling factor, for both default and narrow viewports
	 * @note This method overrides the values set from {@link WebContextOptions}. Refer to that class for default values.
	 * @param scale The scaling factor for default viewports, 1 means default size
	 * @param narrow The scaling factor for narrow viewports, 1 means default size, usually set to a higher fraction to upscale text to a minimum of 16px
	 * @see {@link WebContextOptions.logicalPxScale}
	 * @see {@link WebContextOptions.logicalPxScaleNarrow}
	 */
	setLogicalPxScale(scale = 1, narrow = scale) {
		setLogicalPxScale(scale, narrow);
	}

	/** Overrides page and overlay element sizing, and updates viewport measurements */
	setViewportLocation(override?: WebRenderer.ViewportLocation) {
		this._viewportLocation = override;
		(app.viewport as WebViewport).setLocationOverride(override);
		for (let mount of this._mounts.values()) {
			mount.setLocationOverride(override);
		}
		return this;
	}

	private _createMount(output: RenderContext.Output) {
		let place = output.place;
		if (!place) return;
		let mount = new OutputMount();
		this._mounts.set(mount.id, mount);
		let scroll: true | undefined;
		let isModal: true | undefined;
		switch (place.mode) {
			case "mount":
				if (place.mountId) {
					mount.findMountElement(place.mountId);
				}
				break;
			case "page":
				scroll = true;
			case "screen":
				mount.createPageElement(
					place.background || this._pageBackground,
					scroll,
					this._getTitle(output.source),
				);
				break;
			case "modal":
				isModal = true;
			case "overlay":
				mount.createOverlayElement(
					place.ref && (place.ref.element as any),
					place.refOffset,
					this._reducedMotion,
					place.background ||
						(place.shade ? this._modalBackground : "transparent"),
					isModal,
				);
				break;
			default: // "none"
				break;
		}
		if (this._viewportLocation) {
			mount.setLocationOverride(this._viewportLocation);
		}
		return mount;
	}

	/** Returns the title for the activity that contains the provided view */
	private _getTitle(view: View) {
		let activity = Activity.whence(view);
		while (activity) {
			if (activity.title) {
				return String(activity.title);
			}
			activity = Activity.whence(activity);
		}
	}

	private _mounts: Map<number, OutputMount>;
	private _queue: AsyncTaskQueue;
	private _reducedMotion?: boolean;
	private _pageBackground: UIColor | string;
	private _modalBackground: UIColor | string;
	private _raf?: any;
	private _viewportLocation?: WebRenderer.ViewportLocation;
}

export namespace WebRenderer {
	/** Overrides for viewport location on the screen */
	export type ViewportLocation = {
		left?: number;
		right?: number;
		top?: number;
		bottom?: number;
		width?: number;
		height?: number;
	};

	/**
	 * Applies a drag effect to the specified builder to allow dragging of the containing modal element
	 * @note This function can be passed as an argument to {@link UIElement.ElementBuilder.apply apply()} on any UI element builder to make it draggable.
	 * @param builder The builder to apply the effect to
	 * @returns The builder with the effect applied
	 */
	export function dragModal<
		TBuilder extends UIElement.ElementBuilder<UIElement>,
	>(builder: TBuilder): TBuilder {
		return applyDragModal(builder) as TBuilder;
	}

	/**
	 * Applies a drag effect to the specified builder to allow dragging of the element, emitting relative change events
	 * @note This function can be passed as an argument to {@link UIElement.ElementBuilder.apply apply()} on any UI element builder to make it draggable.
	 * @param builder The builder to apply the effect to
	 * @returns The builder with the effect applied
	 * @see {@link DragRelativeEvent}
	 */
	export function dragRelative<
		TBuilder extends UIElement.ElementBuilder<UIElement>,
	>(builder: TBuilder): TBuilder {
		return applyDragRelative(builder) as TBuilder;
	}

	/**
	 * Event emitted when an element that was built using {@link WebRenderer.dragRelative} is dragged relative to its parent element
	 * @see {@link WebRenderer.dragRelative}
	 */
	export type DragRelativeEvent<TView extends UIElement = UIElement> =
		ObservableEvent<
			TView,
			{
				event: MouseEvent | TouchEvent;
				left: number;
				right: number;
				top: number;
				bottom: number;
				parentLeft: number;
				parentRight: number;
				parentTop: number;
				parentBottom: number;
			}
		>;
}
