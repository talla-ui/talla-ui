import {
	ManagedChangeEvent,
	UIAnimatedCell,
	UICell,
	UIComponentEvent,
} from "desk-frame";
import { getCSSLength } from "../../style/DOMStyle.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UICellRenderer extends UIContainerRenderer<UICell> {
	override observe(observed: UICell) {
		return super.observe(observed).observePropertyAsync(
			// note some properties are handled by container (e.g. padding)
			"decoration",
			"margin",
			"background",
			"textColor",
			"textDirection",
			"borderColor",
			"borderStyle",
			"borderThickness",
			"borderRadius",
			"dropShadow",
			"opacity"
		);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent
	) {
		if (this.observed && this.element) {
			switch (property) {
				case "decoration":
				case "margin":
				case "background":
				case "textColor":
				case "textDirection":
				case "borderColor":
				case "borderStyle":
				case "borderThickness":
				case "borderRadius":
				case "dropShadow":
				case "opacity":
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

		let decoration = { ...cell.decoration };
		if (cell.background != null) decoration.background = cell.background;
		if (cell.textColor != null) decoration.textColor = cell.textColor;
		if (cell.borderColor != null) decoration.borderColor = cell.borderColor;
		if (cell.borderStyle != null) decoration.borderStyle = cell.borderStyle;
		if (cell.borderThickness != null)
			decoration.borderThickness = cell.borderThickness;
		if (cell.borderRadius != null) decoration.borderRadius = cell.borderRadius;
		if (cell.dropShadow != null) decoration.dropShadow = cell.dropShadow;
		if (cell.opacity != null) decoration.opacity = cell.opacity;
		super.updateStyle(element, { decoration });
		element.style.direction = cell.textDirection || "";
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
