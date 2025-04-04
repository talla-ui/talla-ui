import {
	ObservedEvent,
	RenderContext,
	UIAnimatedCell,
	UICell,
	UIRenderable,
	ViewEvent,
	ui,
} from "@talla-ui/core";
import { getCSSLength } from "../../style/DOMStyle.js";
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
			let event = new ObservedEvent(
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
			let event = new ObservedEvent(
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

	override updateStyle(element: HTMLElement) {
		let cell = this.observed;
		super.updateStyle(element, [
			ui.style.CELL,
			cell.style,
			{
				padding: cell.padding,
				borderRadius: cell.borderRadius,
				background: cell.background,
				textColor: cell.textColor,
				opacity: cell.opacity,
				width: cell.width,
				height: cell.height,
				grow: cell.grow,
			},
		]);

		// set misc. styles
		element.dir = cell.textDirection || "";
		if (cell.margin != null) {
			element.style.margin = getCSSLength(cell.margin);
			if (typeof cell.margin === "object") {
				if ("start" in cell.margin)
					element.style.marginInlineStart = getCSSLength(cell.margin.start, 0);
				if ("end" in cell.margin)
					element.style.marginInlineEnd = getCSSLength(cell.margin.end, 0);
			}
		} else {
			element.style.margin = "";
		}

		if (cell instanceof UIAnimatedCell) {
			element.style.transitionProperty = "all";
			let duration = cell.animationDuration ?? 200;
			element.style.transitionDuration = duration + "ms";
			let timing: string =
				typeof cell.animationTiming === "string"
					? cell.animationTiming
					: Array.isArray(cell.animationTiming)
						? "cubic-bezier(" + cell.animationTiming.join(",") + ")"
						: "ease";
			element.style.transitionTimingFunction = timing;
		}

		// apply output effect, if any
		if (cell.effect) {
			if (cell.effect !== this.lastEffect) {
				this.lastEffect?.removeEffect?.(element, cell);
				this.lastEffect = cell.effect;
			}
			cell.effect.applyEffect(element, cell);
		} else if (this.lastEffect) {
			this.lastEffect.removeEffect?.(element, cell);
			this.lastEffect = undefined;
		}
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
	onFocusIn(e: ViewEvent<UIRenderable>) {
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
	lastFocused?: UIRenderable;

	/** Last applied effect, if any */
	lastEffect?: RenderContext.OutputEffect;
}
