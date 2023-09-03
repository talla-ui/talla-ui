import {
	ManagedChangeEvent,
	RenderContext,
	UICell,
	UIComponentEvent,
} from "desk-frame";
import { TestOutputElement } from "../app/TestOutputElement.js";
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
			"opacity",
		);
	}

	protected override async handlePropertyChange(
		property: string,
		value: any,
		event?: ManagedChangeEvent,
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
			this.element.selected = true;
		}
	}

	onDeselect(e: UIComponentEvent) {
		if (e.source === this.observed && this.element) {
			this.element.selected = false;
		}
	}

	override getOutput() {
		if (!this.observed) throw ReferenceError();
		let elt = new TestOutputElement("cell");
		let output = new RenderContext.Output(this.observed, elt);
		elt.output = output;
		return output;
	}

	override updateStyle(element: TestOutputElement) {
		let cell = this.observed;
		if (!cell) return;

		// NOTE: margin, textDirection aren't applied in test renderer
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
	}
}
