import { UICell } from "@talla-ui/core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UICellRenderer extends UIContainerRenderer<UICell> {
	constructor(observed: UICell) {
		super(observed);
		this.observeProperties(
			// note some properties are handled by container (e.g. padding)
			"textDirection",
			"margin",
			"padding",
			"borderRadius",
			"background",
			"textColor",
			"opacity",
			"style",
		);
	}

	protected override propertyChange(property: string, value: any) {
		if (!this.element) return;
		switch (property) {
			case "textDirection":
			case "margin":
			case "padding":
			case "borderRadius":
			case "background":
			case "textColor":
			case "opacity":
			case "style":
				this.scheduleUpdate(undefined, this.element);
				return;
		}
		super.propertyChange(property, value);
	}

	override getOutput() {
		let output = super.getOutput();
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			output.element.focusable = true;
		return output;
	}

	override updateContent(element: TestOutputElement) {
		let cell = this.observed;
		super.updateContent(element);
		if (cell.allowFocus || cell.allowKeyboardFocus) element.focusable = true;
	}
}
