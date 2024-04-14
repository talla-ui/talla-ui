import {
	ManagedEvent,
	UIAnimatedCell,
	UICell,
	ui,
} from "@desk-framework/frame-core";
import { getCSSLength } from "../../style/DOMStyle.js";
import { getBaseStyleClass } from "./BaseObserver.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UICellRenderer extends UIContainerRenderer<UICell> {
	override observe(observed: UICell) {
		return super.observe(observed).observePropertyAsync(
			// note some properties are handled by container (e.g. padding)
			"textDirection",
			"margin",
			"borderRadius",
			"background",
			"textColor",
			"opacity",
			"effect",
			"style",
		);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "textDirection":
				case "margin":
				case "borderRadius":
				case "background":
				case "textColor":
				case "opacity":
				case "effect":
				case "style":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	override updateStyle(element: HTMLElement) {
		let cell = this.observed;
		if (!cell) return;
		super.updateStyle(element, getBaseStyleClass(cell.style) || ui.style.CELL, [
			cell.style,
			{
				padding: cell.padding,
				borderRadius: cell.borderRadius,
				background: cell.background,
				textColor: cell.textColor,
				opacity: cell.opacity,
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
		if (cell.effect) cell.effect.applyEffect(element, cell);
	}
}
