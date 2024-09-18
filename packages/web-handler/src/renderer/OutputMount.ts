import { RenderContext, UIColor, View, app } from "talla-ui";
import {
	CLASS_OVERLAY_SHADER,
	CLASS_OVERLAY_WRAPPER,
	CLASS_PAGE_ROOT,
} from "../style/defaults/css.js";
import { registerHandlers } from "./events.js";

/** Next unique ID */
let _nextId = 1;

/** @internal Property name that's set if an event handler is registered on an element */
export const ELT_EVT_PROP = "Web__Handled";

/** @internal A class that represents a mount point for root output, placed as a page, modal, within another element, or separately */
export class OutputMount {
	readonly id = _nextId++;

	/** Creates a fixed full-page root element, i.e. for placement modes "screen" and "page" */
	createPageElement(
		background: UIColor | string,
		scroll?: boolean,
		title?: string,
	) {
		let elt =
			(this._outer =
			this._inner =
				document.createElement("web-handler-page-root"));
		elt.ariaAtomic = "true";
		elt.className = CLASS_PAGE_ROOT;
		elt.dataset.title = title || "";
		if (scroll) elt.style.overflow = "auto";
		this._remount = () => {
			elt.dir = app.i18n?.getAttributes().rtl ? "rtl" : "ltr";
			elt.style.background = String(background);
			elt.style.color = String(new UIColor("Text"));
		};
		this._remount();
		registerHandlers(elt, true);
		let overlays = document.querySelectorAll("web-handler-overlay");
		if (overlays[0]) {
			document.body.insertBefore(elt, overlays[0]);
		} else {
			document.body.appendChild(elt);
		}
		this._updateTitle();
	}

	/** Creates an overlay or modal root element */
	createOverlayElement(
		refElt?: HTMLElement,
		refOffset?: number | [number, number],
		reducedMotion?: boolean,
		shadeBackground?: UIColor | string,
		isModal?: boolean,
	) {
		let shader =
			(this._outer =
			this._shader =
				document.createElement("web-handler-overlay"));
		shader.className = CLASS_OVERLAY_SHADER;
		shader.tabIndex = 0;
		if (!isModal) shader.style.pointerEvents = "none";
		document.body.appendChild(shader);
		registerHandlers(shader, isModal);

		// darken shader after rendering, and focus
		function setFocus() {
			if (!document.activeElement) shader.focus();
			else {
				let pos = shader.compareDocumentPosition(document.activeElement);
				if (!(pos & Node.DOCUMENT_POSITION_CONTAINED_BY)) shader.focus();
			}
		}
		setTimeout(() => {
			if (reducedMotion) shader.style.transition = "none";
			shader.style.backgroundColor = String(shadeBackground);
			if (isModal) {
				setFocus();
				setTimeout(setFocus, 10);
				setTimeout(setFocus, 100);
			}
		}, 0);

		// create a flex wrapper to contain content
		let wrapper = (this._inner = document.createElement("div"));
		wrapper.className = CLASS_OVERLAY_WRAPPER;
		wrapper.dir = app.i18n?.getAttributes().rtl ? "rtl" : "ltr";
		wrapper.ariaModal = "true";
		wrapper.ariaAtomic = "true";
		wrapper.style.color = String(new UIColor("Text"));
		shader.appendChild(wrapper);

		// match position of wrapper with reference element, if any
		if (
			refElt &&
			document.body.contains(refElt) &&
			refElt.nodeType === Node.ELEMENT_NODE
		) {
			let prev = "";
			let interval = 128;
			const updateRect = () => {
				if (!this._inner) return;
				let rect = refElt!.getBoundingClientRect();
				let scr = shader.getBoundingClientRect();
				let styles = [
					Math.floor(rect.top - scr.top) + "px",
					Math.floor(rect.left - scr.left) + "px",
					Math.floor(rect.width) + "px",
					Math.floor(rect.height) + "px",
				] as const;
				let cmp = styles.join();
				let changed = cmp !== prev;
				prev = cmp;
				if (changed) {
					wrapper.style.top = styles[0];
					wrapper.style.left = styles[1];
					wrapper.style.width = styles[2];
					wrapper.style.height = styles[3];
					wrapper.style.margin = Array.isArray(refOffset)
						? refOffset[1] + "px " + refOffset[0] + "px"
						: (refOffset || 0) + "px";
				}
				if (changed) interval = 16;
				else if (interval < 256) interval <<= 1;
				setTimeout(updateRect, interval);
			};
			updateRect();
		}

		// send `CloseModal` event if clicked outside modal, or pressed escape;
		// note that scroll gestures still need to work, so we listen for click
		let start = Date.now();
		const checkAndClose = (e: Event) => {
			let view = this._lastView;
			if (e.type !== "keydown" && Date.now() - start < 500) return;
			if (
				(e.target === shader || e.target === wrapper) &&
				view &&
				!view.isUnlinked()
			) {
				view.emit("CloseModal");
				if (e.type === "keydown" && !view.isUnlinked()) {
					view.emit("EscapeKeyPress", { event: e });
				}
			}
		};
		shader.addEventListener("click", checkAndClose, true);
		shader.addEventListener("mousedown", checkAndClose, true);
		shader.addEventListener(
			"keydown",
			(e) => {
				if (e.key === "Escape") checkAndClose(e);
			},
			true,
		);

		// handle remount by setting colors again
		this._remount = () => {
			shader.style.backgroundColor = String(shadeBackground);
			wrapper.style.color = String(new UIColor("Text"));
			wrapper.dir = app.i18n?.getAttributes().rtl ? "rtl" : "ltr";
		};
	}

	/** Finds an existing element by ID, and use that to contain output */
	findMountElement(id?: string) {
		let elt = id && document.getElementById(id);
		if (elt) {
			this._inner = elt;
			this._lastElementId = id;
			if (!(elt as any)[ELT_EVT_PROP]) {
				registerHandlers(elt);
				(elt as any)[ELT_EVT_PROP] = true;
			}
			this._remount = () => {
				// find element with same mount ID, then move content
				let oldInner = this._inner;
				this.findMountElement(this._lastElementId);
				if (oldInner && oldInner !== this._inner) {
					let oldContent = Array.from(oldInner.childNodes);
					let frag = document.createDocumentFragment();
					for (let elt of oldContent) frag.appendChild(elt);
					oldInner.remove();
					if (this._inner) this._inner.appendChild(frag);
				}
			};
		}
	}

	/** Updates the current element with given output, if not already set */
	update(output: RenderContext.Output<HTMLElement>) {
		if (this._inner && this._inner.firstChild !== output.element) {
			this._lastView = output.source;
			this._inner.innerHTML = "";
			if (output.detach) output.detach();
			this._inner.appendChild(output.element);
		}
	}

	/** Moves last output to a (new or existing) mount element */
	remount() {
		this._remount?.();
		if (!this._lastElementId && this._outer) {
			// add page/modal content back to body, if needed
			if (!this._outer.parentNode) {
				document.body.appendChild(this._outer);
			}
		}
	}

	/** Removes the last output from the document */
	remove() {
		this._remount = undefined;

		if (
			this._lastElementId &&
			this._inner &&
			this._inner.id === this._lastElementId
		) {
			// forget mounted element and replace it with a clone
			// to remove event listeners
			this._lastElementId = undefined;
			let elt = this._inner;
			elt.innerHTML = "";
			(elt as any)[ELT_EVT_PROP] = false;
			elt.parentNode?.replaceChild(elt.cloneNode(), elt);
			return;
		}

		// remove the inner element (if it's not the same as outer)
		if (this._inner && this._inner !== this._outer) {
			this._inner.remove();
			this._inner = undefined;
		}

		if (this._shader) {
			// fade out background (within 200ms, see below)
			this._shader.style.background = "";
		}

		// remove the outer element, asynchronously
		setTimeout(
			() => {
				this._outer!.remove();
				this._updateTitle();
			},
			this._shader ? 200 : 20,
		);
	}

	/** Updates the document title according to the title of the last mount in the DOM */
	private _updateTitle() {
		let pageRoots = document.querySelectorAll("web-handler-page-root");
		for (let i = pageRoots.length - 1; i >= 0; i--) {
			let title = (pageRoots[i] as HTMLElement).dataset.title;
			if (title) {
				document.title = title;
				break;
			}
		}
	}

	_outer?: HTMLElement;
	_inner?: HTMLElement;
	_shader?: HTMLElement;
	_lastView?: View;
	_lastElementId?: string;
	_remount?: () => void;
}
