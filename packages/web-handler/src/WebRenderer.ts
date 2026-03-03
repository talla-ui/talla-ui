import type { UIGradient } from "@talla-ui/core";
import {
	Activity,
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
		this._delay = options.missedFrameTime;
		app.queue.setScheduleCallback(() => this._ensureRAF());
	}

	/** The default modal factory */
	modalFactory: ModalFactory;

	/** Retrieves a render callback for root output */
	getRenderCallback() {
		let mount: OutputMount | undefined;
		let prevFocus: HTMLElement | undefined;
		let callback: RenderContext.RenderCallback = (output, afterRender) => {
			app.schedule(() => {
				if (!output) {
					if (mount && this._mounts.has(mount.id)) {
						this._mounts.delete(mount.id);
						mount.remove().then(() => this._restoreFocus(prevFocus));
					}
					mount = undefined;
					if (afterRender) afterRender(output);
					return;
				}
				if (!mount && output.element) {
					mount = this._createMount(output);
					if (output.place?.mode === "modal") {
						prevFocus = document.activeElement as any;
					}
				}
				if (mount) mount.update(output as any);
				if (afterRender) afterRender(output);
			});
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
		if (this._raf) {
			window.cancelAnimationFrame(this._raf);
			this._raf = undefined;
		}
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
		pageBackground: UIColor | UIGradient | string = "background",
		modalBackground: UIColor | UIGradient | string = pageBackground,
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

	/** Runs the app queue with time budget and schedules next RAF if needed */
	private _runQueue() {
		if (this.isUnlinked()) return;
		app.queue.run(this._delay, this._delay);
		if (app.queue.length > 0) {
			this._ensureRAF();
		}
	}

	/** Requests a RAF to run the queue if one isn't already pending */
	private _ensureRAF() {
		if (this._raf) return;
		try {
			this._raf = window.requestAnimationFrame(() => {
				this._raf = undefined;
				this._runQueue();
			});
		} catch {}
	}

	/** Restores focus to an element if no other element is focused */
	private _restoreFocus(element?: HTMLElement) {
		if (
			element &&
			(!document.activeElement || document.activeElement === document.body) &&
			document.body.compareDocumentPosition(element) &
				Node.DOCUMENT_POSITION_CONTAINED_BY
		) {
			element.focus();
		}
	}

	private _mounts: Map<number, OutputMount>;
	private _delay: number;
	private _pageBackground: UIColor | UIGradient | string = "background";
	private _modalBackground: UIColor | UIGradient | string = "transparent";
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
