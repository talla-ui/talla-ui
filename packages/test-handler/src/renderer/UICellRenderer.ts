import { UICell } from "@talla-ui/core";
import { TestOutputElement } from "../TestOutputElement.js";
import { UIContainerRenderer } from "./UIContainerRenderer.js";

/** @internal */
export class UICellRenderer extends UIContainerRenderer<UICell> {
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
