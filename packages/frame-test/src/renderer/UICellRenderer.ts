import { ManagedEvent, UICell, ui } from "@desk-framework/frame-core";
import { TestOutputElement } from "../app/TestOutputElement.js";
import { getBaseStyleClass } from "./TestBaseObserver.js";
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
				case "style":
					this.scheduleUpdate(undefined, this.element);
					return;
			}
		}
		await super.handlePropertyChange(property, value, event);
	}

	override getOutput() {
		if (!this.observed) throw ReferenceError();
		let output = super.getOutput();
		if (this.observed.allowFocus || this.observed.allowKeyboardFocus)
			output.element.focusable = true;
		return output;
	}

	override updateContent(element: TestOutputElement) {
		let cell = this.observed;
		if (!cell) return;
		super.updateContent(element);
		if (cell.allowFocus || cell.allowKeyboardFocus) element.focusable = true;
	}

	override updateStyle(element: TestOutputElement) {
		let cell = this.observed;
		if (!cell) return;

		// NOTE: margin, textDirection aren't applied in test renderer
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
	}
}
