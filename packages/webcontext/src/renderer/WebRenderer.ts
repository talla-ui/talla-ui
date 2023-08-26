import {
	app,
	RenderContext,
	AsyncTaskQueue,
	Activity,
	Observer,
} from "desk-frame";
import type { WebContextOptions } from "../WebContext.js";
import { OutputMount } from "./OutputMount.js";
import { WebOutputTransform } from "./WebOutputTransform.js";
import { makeObserver } from "./observers/observers.js";

/** @internal A renderer class that uses the DOM to render UI components */
export class WebRenderer extends RenderContext {
	/** Creates a new render context instance, used by `useWebContext()` */
	constructor(options: WebContextOptions) {
		super();
		this._mounts = new Map();
		this._queue = app.scheduler.createQueue(
			"WebRenderer",
			true,
			(queueOptions) => {
				queueOptions.maxSyncTime = options.missedFrameTime * 0.75;
				queueOptions.throttleDelay = options.missedFrameTime * 1.5;
			}
		);
		if (options.reducedMotion) this.setReducedMotion(true);
	}

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
		let autoCloseModal = false;
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
					if (!mount && output.place && output.element) {
						prevFocus = document.activeElement as any;
						mount = new OutputMount();
						this._mounts.set(mount.id, mount);
						switch (output.place.mode) {
							case "none":
								break;
							case "mount":
								if (output.place.mountId) {
									mount.findMountElement(output.place.mountId);
								}
								break;
							case "page":
								mount.createPageElement();
								this.setDocumentTitle(output.source);
								break;
							case "modal":
								autoCloseModal = true;
							case "dialog":
								mount.createModalElement(
									autoCloseModal,
									output.place.shade,
									output.place.ref && (output.place.ref.element as any),
									this._reducedMotion
								);
								break;
							default:
								mount.createElement();
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

	/** Sets the document title according to activity that contains the provided component */
	setDocumentTitle(component: RenderContext.Renderable) {
		let activity = Activity.whence(component);
		while (activity) {
			let target = activity.getNavigationTarget();
			if (target.title) {
				document.title = String(target.title);
				break;
			}
			activity = Activity.whence(activity);
		}
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
	createObserver<T extends RenderContext.Renderable>(
		target: T
	): Observer<T> | undefined {
		return makeObserver(target);
	}

	/** Returns an `OutputTransform` instance for the specified output */
	transform(
		out: RenderContext.Output
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

	/** Re-renders all mounted content to appear in (new or existing) elements with corresponding ID */
	remount() {
		for (let mount of this._mounts.values()) {
			mount.remount();
		}
		this.emitChange();
		return this;
	}

	/** Enables or disables reduced motion mode (forces all transition timings to 0 if set) */
	setReducedMotion(enable: boolean) {
		this._reducedMotion = !!enable;
	}

	private _mounts: Map<number, OutputMount>;
	private _queue: AsyncTaskQueue;
	private _reducedMotion?: boolean;
	private _raf?: any;
}
