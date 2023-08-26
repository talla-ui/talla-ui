import { RenderContext, UIColor } from "desk-frame";
import { getCSSColor } from "../style/DOMStyle.js";
import {
	CLASS_MODAL_SHADER,
	CLASS_MODAL_WRAPPER,
	CLASS_PAGE_ROOT,
} from "../style/defaults/css.js";
import { registerHandlers } from "./events.js";

/** Next unique ID */
let _nextId = 1;

/** @internal A class that represents a mount point for root output, placed as a page, modal, within another element, or separately */
export class OutputMount {
	readonly id = _nextId++;

	/** Creates a plain (separate) root element, i.e. for placement mode "default" */
	createElement() {
		let elt = (this._outer = this._inner = document.createElement("desk-root"));
		registerHandlers(elt);
		document.body.appendChild(elt);
	}

	/** Creates a fixed full-page root element, i.e. for placement mode "page" */
	createPageElement() {
		let elt =
			(this._outer =
			this._inner =
				document.createElement("desk-page-root"));
		elt.className = CLASS_PAGE_ROOT;
		this._remount = () => {
			elt.style.background = getCSSColor("@PageBackground");
			elt.style.color = getCSSColor("@Text");
		};
		this._remount();
		registerHandlers(elt);
		document.body.appendChild(elt);
	}

	/** Creates a modal root element, for use with various modal placement modes */
	createModalElement(
		autoCloseModal?: boolean,
		shadeOpacity?: number,
		refElt?: HTMLElement,
		reducedMotion?: boolean
	) {
		let shader = (this._outer = this._shader = document.createElement("div"));
		shader.className = CLASS_MODAL_SHADER;
		shader.tabIndex = 0;
		document.body.appendChild(shader);
		registerHandlers(shader);

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
			let color = new UIColor("@ModalShade").alpha(shadeOpacity || 0);
			shader.style.backgroundColor = String(color);
			setFocus();
			setTimeout(setFocus, 10);
			setTimeout(setFocus, 100);
		}, 0);

		// create a flex wrapper to contain content
		let wrapper = (this._inner = document.createElement("div"));
		wrapper.className = CLASS_MODAL_WRAPPER;
		wrapper.setAttribute("aria-modal", "true");
		wrapper.style.color = getCSSColor("@Text");
		shader.appendChild(wrapper);

		// match position of wrapper with reference element, if any
		if (
			refElt &&
			document.body.contains(refElt) &&
			refElt.nodeType === Node.ELEMENT_NODE
		) {
			let rect = refElt.getBoundingClientRect();
			wrapper.style.top = Math.floor(rect.top) + "px";
			wrapper.style.left = Math.floor(rect.left) + "px";
			wrapper.style.width = Math.floor(rect.width) + "px";
			wrapper.style.height = Math.floor(rect.height) + "px";
		}

		// send `CloseModal` event if clicked outside modal, or pressed escape
		if (autoCloseModal) {
			const checkAndClose = (e: Event) => {
				if (
					(e.target === shader || e.target === wrapper) &&
					this._lastSource &&
					!this._lastSource.isUnlinked()
				) {
					e.stopPropagation();
					this._lastSource.emit("CloseModal");
				}
			};
			shader.addEventListener("click", checkAndClose, true);
			shader.addEventListener("touchend", checkAndClose, true);
			shader.addEventListener(
				"keydown",
				(e) => {
					if (e.key === "Escape") checkAndClose(e);
				},
				true
			);
		}

		// handle remount by setting colors again
		this._remount = () => {
			let color = new UIColor("@ModalShade").alpha(shadeOpacity || 0);
			shader.style.backgroundColor = String(color);
			wrapper.style.color = getCSSColor("@Text");
		};
	}

	/** Finds an existing element by ID, and use that to contain output */
	findMountElement(id?: string) {
		let elt = id && document.getElementById(id);
		if (elt) {
			this._inner = elt;
			this._lastElementId = id;
			if (!(elt as any)["Desk__Handled"]) {
				registerHandlers(elt);
				(elt as any)["Desk__Handled"] = true;
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
			this._lastSource = output.source;
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
			(elt as any)["Desk__Handled"] = false;
			elt.parentNode?.replaceChild(elt.cloneNode(), elt);
			return;
		}

		if (this._inner) {
			// always remove inner element first, if any
			this._inner.remove();
		}

		if (this._shader) {
			// fade out background within 200ms
			this._shader.style.background = "";
			setTimeout(() => {
				this._outer!.remove();
			}, 200);
		} else if (this._outer) {
			// otherwise, remove outer element right away, if any
			this._outer.remove();
		}
	}

	_outer?: HTMLElement;
	_inner?: HTMLElement;
	_shader?: HTMLElement;
	_lastSource?: RenderContext.Renderable;
	_lastElementId?: string;
	_remount?: () => void;
}
