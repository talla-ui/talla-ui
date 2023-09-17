import {
	ManagedChangeEvent,
	UIAnimatedCell,
	UICell,
	UICellStyle,
	UIComponentEvent,
} from "desk-frame";
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
			"dropShadow",
			"cellStyle",
		);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "textDirection":
				case "margin":
				case "borderRadius":
				case "background":
				case "textColor":
				case "opacity":
				case "dropShadow":
				case "cellStyle":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	onSelect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			this.element.dataset.selected = "selected";
		}
	}

	onDeselect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			delete this.element.dataset.selected;
		}
	}

	override updateStyle(element: HTMLElement) {
		let cell = this.observed;
		if (!cell) return;
		super.updateStyle(
			element,
			getBaseStyleClass(cell.cellStyle) || UICellStyle,
			[
				cell.cellStyle,
				{
					padding: cell.padding,
					borderRadius: cell.borderRadius,
					background: cell.background,
					textColor: cell.textColor,
					opacity: cell.opacity,
					dropShadow: cell.dropShadow,
				},
			],
		);

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
	}
}
