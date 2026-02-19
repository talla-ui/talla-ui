import { UI, UIElement, UIShowView, View, Widget } from "@talla-ui/core";

export class DOMHighlight {
	clear() {
		this._highlightBox?.remove();
		this._infoBox?.remove();
		this._highlightElt = undefined;
	}

	highlight(view: unknown, position: { left?: string; right?: string }) {
		this.clear();
		if (!view || !(view instanceof View)) return;

		// find the actual rendered view
		while (view instanceof Widget || view instanceof UIShowView) {
			view = (view as any).body;
		}
		if (!(view instanceof UIElement)) return;

		// find the DOM element
		let elt = view.lastRenderOutput?.element;
		if (!(elt instanceof HTMLElement)) return;
		this._highlightElt = elt;

		// create the highlight box
		let highlightBox = this._createHighlightBox();
		let infoBox = this._createInfoBox();
		const update = () => {
			if (this._highlightElt !== elt) return;
			let rect = elt.getBoundingClientRect();
			if (!rect.x && !rect.y && !rect.width && !rect.height) return;
			highlightBox.style.top = rect.top + "px";
			highlightBox.style.left = rect.left + "px";
			highlightBox.style.width = rect.width + "px";
			highlightBox.style.height = rect.height + "px";
			let overlay = document.querySelector('[data-name^="WebTools"]');
			while (overlay && overlay?.parentNode !== document.body) {
				overlay = overlay.parentNode as any;
			}
			let screenWidth = window.innerWidth;
			let isTopRight =
				rect.x > 100 && rect.right > screenWidth - 100 && rect.top < 40;
			infoBox.style.right = isTopRight ? "auto" : position.right || "0";
			infoBox.style.left = isTopRight ? position.left || "0" : "auto";
			infoBox.innerHTML = this._getInfoText(view, rect);
			document.body.insertBefore(infoBox, overlay);
			document.body.insertBefore(highlightBox, infoBox);
			setTimeout(update, 100);
		};
		update();
	}

	_createHighlightBox() {
		let highlightBox = this._highlightBox || document.createElement("div");
		this._highlightBox = highlightBox;
		highlightBox.dataset.name = "WebToolsDOMHighlight";
		highlightBox.style.position = "fixed";
		highlightBox.style.background = "rgba(0, 136, 255, 0.3)";
		highlightBox.style.boxShadow = "0 0 0px 2px #08f";
		highlightBox.style.pointerEvents = "none";
		highlightBox.style.zIndex = "1000";
		return highlightBox;
	}

	_createInfoBox() {
		let infoBox = this._infoBox || document.createElement("div");
		this._infoBox = infoBox;
		infoBox.dataset.name = "WebToolsDOMInfo";
		infoBox.style.position = "fixed";
		infoBox.style.background = "rgba(0, 136, 255, 0.3)";
		infoBox.style.boxShadow = "0 0 0px 2px #08f";
		infoBox.style.pointerEvents = "none";
		infoBox.style.zIndex = "1000";
		infoBox.style.top = "0";
		infoBox.style.bottom = "auto";
		infoBox.style.padding = "4px";
		infoBox.style.fontSize = "12px";
		infoBox.style.fontFamily = "monospace";
		infoBox.style.color = UI.colors.text.output().rgbaString();
		return infoBox;
	}

	_getInfoText(view: UIElement, rect: DOMRect) {
		let text = view.constructor.name;
		if (view instanceof Widget) {
			text += ` (${view.name})`;
		}
		text += ` ${Math.ceil(rect.width)} × ${Math.ceil(rect.height)}`;
		return text;
	}

	_highlightBox?: HTMLElement;
	_infoBox?: HTMLElement;
	_highlightElt?: HTMLElement;
}
