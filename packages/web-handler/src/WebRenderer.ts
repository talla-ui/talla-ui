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
import { makeObserver } from "./observers/index.js";
import { OutputMount } from "./OutputMount.js";
import { WebContextOptions } from "./WebContextOptions.js";
import { WebModalFactory } from "./WebModalFactory.js";
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

	/**
	 * Sets the background colors for page and modal shader elements
	 * @note Prefer using {@link WebTheme.pageBackground} and {@link WebTheme.modalShadeBackground} to configure these as part of a theme.
	 * @param pageBackground Background color for page/screen mounts (defaults to "background")
	 * @param modalBackground Background color for modal shade (defaults to pageBackground)
	 */
	setBackgrounds(
		pageBackground: UIColor | string = "background",
		modalBackground: UIColor | string = pageBackground,
	) {
		this._pageBackground = pageBackground;
		this._modalBackground = modalBackground;
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
	private _pageBackground: UIColor | string = "background";
	private _modalBackground: UIColor | string = "transparent";
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

	/** Type definition for an event emitted by the `drag-relative` effect */
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
