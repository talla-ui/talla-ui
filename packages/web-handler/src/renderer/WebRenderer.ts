import {
	Activity,
	AsyncTaskQueue,
	RenderContext,
	UIColor,
	View,
	app,
} from "talla";
import type { WebContextOptions } from "../WebContext.js";
import { OutputMount } from "./OutputMount.js";
import { WebOutputTransform } from "./WebOutputTransform.js";
import { makeObserver } from "./observers/observers.js";
import { WebViewportContext } from "./WebViewportContext.js";

/** @internal A renderer class that uses the DOM to render UI components */
export class WebRenderer extends RenderContext {
	/** Creates a new render context instance, used by `useWebContext()` */
	constructor(options: WebContextOptions) {
		super();
		this.viewport = new WebViewportContext(options).update();
		this._mounts = new Map();
		this._queue = app.scheduler.createQueue(
			"WebRenderer",
			true,
			(queueOptions) => {
				queueOptions.maxSyncTime = options.missedFrameTime * 0.75;
				queueOptions.throttleDelay = options.missedFrameTime * 1.5;
			},
		);
		if (options.reducedMotion) this.setReducedMotion(true);
		this._pageBackground = options.pageBackground;
		this._modalBackground = options.modalShadeBackground;
	}

	/** Web browser viewport information */
	viewport: RenderContext.Viewport;

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
						setTimeout(() => {
							if (
								document.body.compareDocumentPosition(prevFocus!) &
								Node.DOCUMENT_POSITION_CONTAINED_BY
							) {
								this.tryFocusElement(prevFocus!);
							}
						}, 210);
					}
				} else {
					// mount output for given placement mode
					let place = output.place;
					if (!mount && place && output.element) {
						mount = new OutputMount();
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
								prevFocus = document.activeElement as any;
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

	/** Focuses given element asynchronously, waiting for rendering to catch up */
	tryFocusElement(element: HTMLElement) {
		this._elementToFocus = element;
		let loop = 0;
		const tryFocus = () => {
			let focused = document.activeElement;
			if (focused !== element && element === this._elementToFocus) {
				element.focus();
				if (loop++ < 2) {
					setTimeout(() => this.schedule(tryFocus, true), 1);
				}
			}
		};
		this.schedule(tryFocus, true);
	}
	private _elementToFocus?: HTMLElement;

	/** Attaches a renderer to given UI component */
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
		this.emitChange("Remount");
		for (let mount of this._mounts.values()) {
			mount.remount();
		}
		return this;
	}

	/** Enables or disables reduced motion mode (forces all transition timings to 0 if set) */
	setReducedMotion(enable: boolean) {
		this._reducedMotion = !!enable;
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
}
