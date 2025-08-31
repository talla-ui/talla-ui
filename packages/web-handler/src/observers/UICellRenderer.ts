import { ObservableEvent, UICell, UIElement, ViewEvent } from "@talla-ui/core";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UICellRenderer extends UIContainerRenderer<UICell> {
	override getOutput() {
		let output = super.getOutput();
		let elt = output.element;
		let cell = this.observed;

		// make (keyboard) focusable, if needed
		if (cell.allowKeyboardFocus) elt.tabIndex = 0;
		else if (cell.allowFocus) elt.tabIndex = -1;

		// add mouse handlers (events not propagated)
		elt.addEventListener("mouseenter", (e) => {
			let event = new ObservableEvent(
				"MouseEnter",
				cell,
				{ event: e },
				undefined,
				undefined,
				true,
			);
			if (this.observed === cell) cell.emit(event);
		});
		elt.addEventListener("mouseleave", (e) => {
			let event = new ObservableEvent(
				"MouseLeave",
				cell,
				{ event: e },
				undefined,
				undefined,
				true,
			);
			if (this.observed === cell) cell.emit(event);
		});
		return output;
	}

	override updateContent(element: HTMLElement) {
		let cell = this.observed as UICell;
		super.updateContent(element);

		// reset tabindex if needed
		if (
			cell.allowKeyboardFocus &&
			this.lastFocused &&
			!cell.content.includes(this.lastFocused)
		) {
			if (this.element) this.element.tabIndex = 0;
			this.lastFocused = undefined;
		}
	}

	/** Switch tabindex on focus */
	onFocusIn(e: ViewEvent<UIElement>) {
		if (!this.element) return;
		if (e.source !== this.observed && this.observed.allowKeyboardFocus) {
			// temporarily disable keyboard focus on this parent
			// to prevent shift-tab from selecting this element
			this.element.tabIndex = -1;
			this.lastFocused = e.source;
		}
	}

	/** Switch tabindex back on blur */
	onFocusOut(e: ViewEvent) {
		if (!this.element) return;
		if (e.source !== this.observed && this.observed.allowKeyboardFocus) {
			// make this parent focusable again
			this.element.tabIndex = 0;
			this.lastFocused = undefined;
		}
	}

	/** Last focused UI element, if this cell is keyboard-focusable */
	lastFocused?: UIElement;
}
